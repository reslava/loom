import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../fs/dist';
import { toCanonical } from '../../core/dist';

/**
 * `normalize-dates` migration — rewrite any doc whose `created` / `updated` is not
 * canonical `YYYY-MM-DD` (e.g. a legacy full-ISO timestamp) to canonical form.
 *
 * This is hygiene, NOT a correctness dependency: `toEpoch` already orders mixed
 * formats correctly, so History and staleness are right whether or not this runs.
 * It only makes on-disk dates uniform. Idempotent (re-running over canonical docs
 * changes nothing) and `--dry-run` capable. The actual canonicalization happens in
 * `serializeFrontmatter` on save — load → save is the blessed round-trip and parses
 * plan steps correctly, so a re-save never corrupts a plan's structured steps.
 *
 * Archived docs (`loom/.archive/**`) are frozen and skipped.
 */

const DATE_FIELDS: Array<'created' | 'updated'> = ['created', 'updated'];

export interface NormalizeDatesDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fsExtra;
}

export interface NormalizeDatesResult {
    changed: Array<{ path: string; field: 'created' | 'updated'; from: string; to: string }>;
    scanned: number;
    failed: Array<{ path: string; error: string }>;
    dryRun: boolean;
}

async function walkMarkdown(dir: string, fs: typeof fsExtra): Promise<string[]> {
    const out: string[] = [];
    const entries = await fs.readdir(dir).catch(() => [] as string[]);
    for (const name of entries) {
        if (name === '.archive' || name === 'node_modules' || name === '.git') continue;
        const full = path.join(dir, name);
        const st = await fs.stat(full).catch(() => null);
        if (!st) continue;
        if (st.isDirectory()) {
            out.push(...(await walkMarkdown(full, fs)));
        } else if (name.endsWith('.md')) {
            out.push(full);
        }
    }
    return out;
}

export async function normalizeDates(
    opts: { dryRun?: boolean },
    deps: NormalizeDatesDeps,
): Promise<NormalizeDatesResult> {
    const loomRoot = deps.getActiveLoomRoot();
    const docsDir = path.join(loomRoot, 'loom');
    const dryRun = !!opts.dryRun;
    const changed: NormalizeDatesResult['changed'] = [];
    const failed: NormalizeDatesResult['failed'] = [];
    let scanned = 0;

    if (!(await deps.fs.pathExists(docsDir))) return { changed, scanned, failed, dryRun };

    const files = await walkMarkdown(docsDir, deps.fs);
    for (const file of files) {
        scanned++;
        try {
            const doc = (await deps.loadDoc(file)) as Record<string, any>;
            let needsWrite = false;
            for (const field of DATE_FIELDS) {
                const cur = doc[field];
                if (typeof cur !== 'string' || cur === '') continue;
                const canon = toCanonical(cur);
                if (canon !== cur) {
                    changed.push({ path: path.relative(loomRoot, file), field, from: cur, to: canon! });
                    doc[field] = canon;
                    needsWrite = true;
                }
            }
            if (needsWrite && !dryRun) await deps.saveDoc(doc as any, file);
        } catch (e: any) {
            failed.push({ path: path.relative(loomRoot, file), error: e?.message ?? String(e) });
        }
    }

    return { changed, scanned, failed, dryRun };
}
