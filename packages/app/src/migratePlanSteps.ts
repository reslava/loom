import * as path from 'path';
import * as fs from 'fs-extra';
import { loadDoc, saveDoc } from '../../fs/dist';
import { PlanDoc, stepsSectionHasRows } from '../../core/dist';

/**
 * Outcome of attempting to migrate one plan's steps from its body table into
 * structured frontmatter (the source-of-truth flip's backward-compat path).
 */
export type MigrateStatus =
    | 'migrated'        // legacy body table → frontmatter steps written
    | 'already-native'  // frontmatter steps already present; nothing to do
    | 'unparseable'     // body has a Steps table but it didn't parse → left untouched (manual fix)
    | 'no-steps';       // no parseable steps and no table rows → left untouched

export interface MigratePlanResult {
    filePath: string;
    planId: string;
    status: MigrateStatus;
    stepCount: number;
}

export interface MigratePlanStepsInput {
    loomRoot: string;
    /** Preview only — report what would change without writing. */
    dryRun?: boolean;
    /** Limit to a single plan by doc id (ULID) or filename stem. */
    docId?: string;
}

export interface MigratePlanStepsDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
}

const PLAN_FILE = /-plan-\d+\.md$/;

/** Recursively collect plan files under loom/, skipping the .archive tree. */
async function findPlanFiles(loomDir: string, fsx: typeof fs): Promise<string[]> {
    const out: string[] = [];
    async function walk(dir: string): Promise<void> {
        let entries: any[];
        try {
            entries = await fsx.readdir(dir, { withFileTypes: true } as any) as any[];
        } catch {
            return;
        }
        for (const e of entries) {
            if (e.name === '.archive') continue;
            const p = path.join(dir, e.name);
            if (e.isDirectory()) {
                await walk(p);
            } else if (e.isFile() && PLAN_FILE.test(e.name)) {
                out.push(p);
            }
        }
    }
    await walk(loomDir);
    return out;
}

/**
 * Migrate legacy (body-table-backed) plans to frontmatter-native steps. Idempotent:
 * already-native plans are skipped. Never destructive — a plan whose body table can't
 * be parsed is reported `unparseable` and left exactly as-is (so a foreign/legacy table
 * is never silently emptied). The actual body→steps parse is done by the loader; this
 * use-case only re-saves legacy plans with the frontmatter-native marker set.
 */
export async function migratePlanSteps(
    input: MigratePlanStepsInput,
    deps: MigratePlanStepsDeps,
): Promise<MigratePlanResult[]> {
    const loomDir = path.join(input.loomRoot, 'loom');
    const files = await findPlanFiles(loomDir, deps.fs);
    const results: MigratePlanResult[] = [];

    for (const filePath of files) {
        let doc: PlanDoc;
        try {
            doc = await deps.loadDoc(filePath) as PlanDoc;
        } catch {
            continue; // unreadable / malformed frontmatter — skip silently, not our concern here
        }
        if (doc.type !== 'plan') continue;

        if (input.docId && doc.id !== input.docId && path.basename(filePath, '.md') !== input.docId) {
            continue;
        }

        // Loader sets this true when it read structured steps from frontmatter.
        if ((doc as any)._stepsFromFrontmatter === true) {
            results.push({ filePath, planId: doc.id, status: 'already-native', stepCount: doc.steps?.length ?? 0 });
            continue;
        }

        const steps = doc.steps ?? [];
        if (steps.length === 0) {
            // Distinguish "genuinely stepless" from "has a table the parser couldn't read".
            const status: MigrateStatus = stepsSectionHasRows((doc as any).content ?? '') ? 'unparseable' : 'no-steps';
            results.push({ filePath, planId: doc.id, status, stepCount: 0 });
            continue;
        }

        if (!input.dryRun) {
            (doc as any)._stepsFromFrontmatter = true;
            await deps.saveDoc(doc, filePath);
        }
        results.push({ filePath, planId: doc.id, status: 'migrated', stepCount: steps.length });
    }

    return results;
}
