import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../fs/dist';
import { PlanDoc } from '../../core/dist';
import { parentDesignVersion } from './createPlan';

/**
 * `backfill-design-versions` migration — repair plans whose `design_version` baseline
 * is wrong because it was stamped before create/promote read the live design version
 * (the `design_version: 1` constant bug, and the promote path that omitted it entirely).
 *
 * For every plan that lives under a thread with a design, re-stamp `design_version` to
 * the design's CURRENT version. This is a RESET, not a reconstruction: the original
 * authoring baseline was overwritten and is unrecoverable, so any plan that was
 * legitimately behind its design gets declared current here. That is acceptable because
 * the field is uniformly noise until this runs — the value is restored to meaning going
 * forward, when the fixed create/promote/refine paths stamp it live. Run once per project
 * (this repo + downstream installs like Chord Flow). `--dry-run` reports without writing.
 *
 * Idempotent (a second run finds nothing to change). Mirrors {@link normalizeDates}:
 * an app migration that loads → edits frontmatter → saves directly. Archived docs
 * (`loom/.archive/**`) are frozen and skipped.
 */

export interface BackfillDesignVersionsDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fsExtra;
}

export interface BackfillDesignVersionsResult {
    /** Plans whose design_version was (or would be) re-baselined. */
    changed: Array<{ path: string; from: number | undefined; to: number }>;
    /** Total plan files scanned. */
    scanned: number;
    failed: Array<{ path: string; error: string }>;
    dryRun: boolean;
}

/** Collect every `*.md` directly inside a `plans/` directory under `dir`. */
async function walkPlanFiles(dir: string, fs: typeof fsExtra): Promise<string[]> {
    const out: string[] = [];
    const entries = await fs.readdir(dir).catch(() => [] as string[]);
    for (const name of entries) {
        if (name === '.archive' || name === 'node_modules' || name === '.git') continue;
        const full = path.join(dir, name);
        const st = await fs.stat(full).catch(() => null);
        if (!st) continue;
        if (st.isDirectory()) {
            out.push(...(await walkPlanFiles(full, fs)));
        } else if (name.endsWith('.md') && path.basename(dir) === 'plans') {
            out.push(full);
        }
    }
    return out;
}

export async function backfillDesignVersions(
    opts: { dryRun?: boolean },
    deps: BackfillDesignVersionsDeps,
): Promise<BackfillDesignVersionsResult> {
    const loomRoot = deps.getActiveLoomRoot();
    const docsDir = path.join(loomRoot, 'loom');
    const dryRun = !!opts.dryRun;
    const changed: BackfillDesignVersionsResult['changed'] = [];
    const failed: BackfillDesignVersionsResult['failed'] = [];
    let scanned = 0;

    if (!(await deps.fs.pathExists(docsDir))) return { changed, scanned, failed, dryRun };

    const files = await walkPlanFiles(docsDir, deps.fs);
    for (const file of files) {
        scanned++;
        try {
            // Plan path is `.../loom/{weave}/{thread}/plans/{file}.md`; the thread dir is
            // two levels up and its basename is the threadSlug the design is named after.
            const threadDir = path.dirname(path.dirname(file));
            const threadSlug = path.basename(threadDir);
            const design = await parentDesignVersion(threadDir, threadSlug, { loadDoc: deps.loadDoc, fs: deps.fs });
            if (!design) continue; // weave-root / design-less plan: no baseline to repair

            const doc = (await deps.loadDoc(file)) as PlanDoc;
            if (doc.type !== 'plan') continue;
            if (doc.design_version === design.version) continue; // already correct

            changed.push({ path: path.relative(loomRoot, file), from: doc.design_version, to: design.version });
            if (!dryRun) {
                doc.design_version = design.version;
                await deps.saveDoc(doc, file);
            }
        } catch (e: any) {
            failed.push({ path: path.relative(loomRoot, file), error: e?.message ?? String(e) });
        }
    }

    return { changed, scanned, failed, dryRun };
}
