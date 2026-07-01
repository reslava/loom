import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import {
    planFileName, doneFileName, chatFileName, singletonFileName,
    nextOrdinal, planOrdinalFromFile, chatOrdinalFromFile,
    isPlanFile, isDoneFile, isChatFile, isIdeaFile, isDesignFile,
} from '../packages/core/dist/index.js';
import { loadDoc, saveDoc, buildLinkIndex, resolveDocIdOrThrow } from '../packages/fs/dist/index.js';
import { renameWeave } from '../packages/app/dist/weave.js';
import { renameThread, moveThread } from '../packages/app/dist/thread.js';
import { renameDocFile } from '../packages/app/dist/renameDocFile.js';
import { removeItem } from '../packages/app/dist/remove.js';

const TMP = path.join(os.tmpdir(), 'loom-entities-crud-tests');

async function writeDoc(file: string, fm: Record<string, unknown>, body = '# x') {
    const full: Record<string, unknown> = {
        created: '2026-07-01', status: 'active', tags: [], parent_id: null, requires_load: [], version: 1,
        ...fm,
    };
    const lines = ['---'];
    for (const [k, v] of Object.entries(full)) lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    lines.push('---', '', body, '');
    await fs.outputFile(file, lines.join('\n'));
}

async function freshRoot(): Promise<string> {
    await fs.remove(TMP);
    await fs.ensureDir(path.join(TMP, '.loom'));
    await fs.outputFile(path.join(TMP, '.loom', 'workflow.yml'), 'version: 1\n');
    return TMP;
}

const deps = (root: string) => ({ getActiveLoomRoot: () => root, fs, loadDoc, saveDoc, buildLinkIndex, resolveDocIdOrThrow });
const exists = (root: string, rel: string) => fs.pathExists(path.join(root, rel));

async function run() {
    console.log('🧩 Running entities-crud tests...\n');

    // ── docNaming: writers, ordinals, recognisers ────────────────────────────
    console.log('  • docNaming: writers, dual-read ordinals + recognisers...');
    {
        assert(planFileName(3) === 'plan-003.md', 'planFileName pads');
        assert(doneFileName(3) === 'plan-003-done.md', 'doneFileName mirrors plan');
        assert(chatFileName(12) === 'chat-012.md', 'chatFileName pads');
        assert(singletonFileName('idea') === 'idea.md' && singletonFileName('design') === 'design.md', 'singletons flat');
        // nextOrdinal recognises legacy AND new; gaps preserved (max+1)
        assert(nextOrdinal(['t-plan-001.md', 'plan-004.md'], 'plan') === 5, 'nextOrdinal = max+1 across legacy+new');
        assert(nextOrdinal([], 'plan') === 1, 'nextOrdinal starts at 1');
        assert(planOrdinalFromFile('some-thread-plan-002.md') === 2, 'ordinal from legacy plan name');
        assert(planOrdinalFromFile('plan-002.md') === 2, 'ordinal from new plan name');
        assert(planOrdinalFromFile('plan-002-done.md') === null, 'done name is not a plan ordinal');
        assert(chatOrdinalFromFile('w-chat-007.md') === 7, 'ordinal from legacy chat name');
        assert(isPlanFile('plan-001.md') && !isPlanFile('plan-001-done.md'), 'isPlanFile excludes done');
        assert(isDoneFile('plan-001-done.md') && isDoneFile('pl_X-done.md'), 'isDoneFile matches done variants');
        assert(isChatFile('chat-001.md') && isChatFile('t-chat.md'), 'isChatFile matches new+legacy');
        assert(isIdeaFile('idea.md') && isIdeaFile('t-idea.md'), 'isIdeaFile matches new+legacy');
        assert(isDesignFile('design.md') && isDesignFile('t-design.md'), 'isDesignFile matches new+legacy');
        console.log('    ✅ docNaming correct');
    }

    // ── serializer: coercible-looking titles round-trip as strings ───────────
    console.log('  • serializer: numeric/bool/null titles round-trip as strings (tree-item safety)...');
    {
        const root = await freshRoot();
        for (const title of ['123', '1.5', 'true', 'false', 'null', '007', '-42', '1e3']) {
            const p = path.join(root, 'loom', 'wv', 'th', 'chats', 'c.md');
            await saveDoc({
                type: 'chat', id: 'ch_x', title, status: 'active',
                created: '2026-07-01', version: 1, tags: [], parent_id: null, requires_load: [],
                content: '## User\n',
            } as any, p);
            const back = await loadDoc(p) as any;
            assert(typeof back.title === 'string', `title "${title}" must round-trip as a string, got ${typeof back.title}`);
            assert(back.title === title, `title "${title}" value must be preserved, got "${back.title}"`);
        }
        console.log('    ✅ coercible titles preserved as strings');
    }

    // ── renameWeave / renameThread / moveThread ──────────────────────────────
    console.log('  • folder ops: renameWeave, renameThread (flattens legacy), moveThread...');
    {
        const root = await freshRoot();
        // Thread with legacy-named idea + a thread.md manifest.
        await writeDoc(path.join(root, 'loom', 'wv', 'th', 'th-idea.md'), { type: 'idea', id: 'id_1', title: 'I' });
        await writeDoc(path.join(root, 'loom', 'wv', 'th', 'thread.md'), { type: 'thread', id: 'th_1', title: 'T', priority: 1000, depends_on: [] });
        await fs.ensureDir(path.join(root, 'loom', 'wv2'));

        await renameThread({ weaveId: 'wv', threadId: 'th', newThreadId: 'renamed' }, deps(root));
        assert(await exists(root, 'loom/wv/renamed/thread.md'), 'thread folder renamed');
        assert(await exists(root, 'loom/wv/renamed/idea.md'), 'legacy idea flattened to idea.md on rename');
        assert(!(await exists(root, 'loom/wv/renamed/th-idea.md')), 'legacy idea name gone');
        const mani = await loadDoc(path.join(root, 'loom/wv/renamed/thread.md')) as any;
        assert(mani.id === 'th_1', 'thread.md ULID untouched by rename');

        await moveThread({ fromWeaveId: 'wv', threadId: 'renamed', toWeaveId: 'wv2' }, deps(root));
        assert(await exists(root, 'loom/wv2/renamed/thread.md'), 'thread moved to wv2');
        assert(!(await exists(root, 'loom/wv/renamed')), 'source thread gone after move');

        await renameWeave({ weaveId: 'wv2', newWeaveId: 'wv3' }, deps(root));
        assert(await exists(root, 'loom/wv3/renamed/thread.md'), 'weave folder renamed');

        // guards
        let threw = false;
        try { await moveThread({ fromWeaveId: 'wv3', threadId: 'renamed', toWeaveId: 'nope' }, deps(root)); } catch { threw = true; }
        assert(threw, 'moveThread refuses missing destination weave');
        console.log('    ✅ folder ops correct + guarded');
    }

    // ── renameDocFile: reference only ────────────────────────────────────────
    console.log('  • renameDocFile: reference slug rename, refuses non-reference...');
    {
        const root = await freshRoot();
        await writeDoc(path.join(root, 'loom', 'refs', 'old-slug-reference.md'), { type: 'reference', id: 'rf_1', title: 'R', slug: 'old-slug' });
        await writeDoc(path.join(root, 'loom', 'wv', 'th', 'idea.md'), { type: 'idea', id: 'id_1', title: 'I' });

        // newSlug carries a trailing "reference" — it must be stripped, and the filename gets the -reference suffix.
        await renameDocFile({ id: 'rf_1', newSlug: 'new-slug-reference' }, deps(root));
        assert(await exists(root, 'loom/refs/new-slug-reference.md'), 'reference renamed to new-slug-reference.md');
        assert(!(await exists(root, 'loom/refs/old-slug-reference.md')), 'old slug gone');
        const ref = await loadDoc(path.join(root, 'loom/refs/new-slug-reference.md')) as any;
        assert(ref.slug === 'new-slug', 'slug frontmatter holds the bare slug (no -reference)');
        assert(ref.id === 'rf_1', 'ULID id unchanged');

        let threw = false;
        try { await renameDocFile({ id: 'id_1', newSlug: 'nope' }, deps(root)); } catch { threw = true; }
        assert(threw, 'renameDocFile refuses a non-reference doc');
        console.log('    ✅ renameDocFile correct');
    }

    // ── removeItem: deletes an archived folder via the .archive fallback ─────
    console.log('  • removeItem: deletes an archived folder (loom/.archive fallback)...');
    {
        const root = await freshRoot();
        // Only the archived mirror exists — no live loom/we2.
        await writeDoc(path.join(root, 'loom', '.archive', 'we2', 'th', 'thread.md'),
            { type: 'thread', id: 'th_a', title: 'T', priority: 1000, depends_on: [] });
        const rmDeps = { getActiveLoomRoot: () => root, resolveDocIdOrThrow, fs };
        const res = await removeItem({ weaveId: 'we2' }, rmDeps);
        assert(res.removed.includes('.archive'), 'delete targeted the archived path');
        assert(!(await exists(root, 'loom/.archive/we2')), 'archived weave folder removed');
        // A truly-absent target still throws.
        let threw = false;
        try { await removeItem({ weaveId: 'ghost' }, rmDeps); } catch { threw = true; }
        assert(threw, 'removeItem throws when neither live nor archived exists');

        // archivedRelPath: delete an archived doc by its path under .archive/ (mirror of restore).
        await writeDoc(path.join(root, 'loom', '.archive', 'refs', 'x-reference.md'),
            { type: 'reference', id: 'rf_a', title: 'X', slug: 'x' });
        await removeItem({ archivedRelPath: 'refs/x-reference.md' }, rmDeps);
        assert(!(await exists(root, 'loom/.archive/refs/x-reference.md')), 'archived doc deleted by relPath');
        // path-escape guard
        threw = false;
        try { await removeItem({ archivedRelPath: '../../etc/passwd' }, rmDeps); } catch { threw = true; }
        assert(threw, 'removeItem refuses an archivedRelPath escaping .archive');
        console.log('    ✅ archived delete (folder + relPath) works, guards hold');
    }

    await fs.remove(TMP);
    console.log('\n✨ All entities-crud tests passed!');
}

run().catch(e => { console.error(`❌ entities-crud.test.ts failed: ${e.message}`); process.exit(1); });
