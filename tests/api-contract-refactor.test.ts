import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { createThread } from '../packages/app/dist/thread.js';
import { weaveIdea } from '../packages/app/dist/weaveIdea.js';
import { chatNew } from '../packages/app/dist/chatNew.js';
import { resolveThreadFolder, resolveThreadUlid } from '../packages/app/dist/utils/resolveThreadFolder.js';
import { saveDoc, loadDoc } from '../packages/fs/dist/index.js';

// Regression suite for the api-contract-refactor invariant: a doc-create references
// its thread by the stable th_ ULID, lands in that exact thread, and NEVER fabricates
// a thread from an unresolvable reference — the originating bug was a create silently
// minting a duplicate folder literally named by the ULID.

const TMP = path.join(os.tmpdir(), 'loom-api-contract-refactor-tests');

async function freshRoot(): Promise<string> {
    await fs.remove(TMP);
    await fs.ensureDir(path.join(TMP, '.loom'));
    await fs.outputFile(path.join(TMP, '.loom', 'workflow.yml'), 'version: 1\n');
    return TMP;
}

async function run() {
    console.log('🧵 Running api-contract-refactor regression tests...\n');

    // ── create by an EXISTING thread_ulid lands the doc in that thread ──
    console.log('  • create by existing thread_ulid lands the doc in that thread...');
    {
        const root = await freshRoot();
        const { id: threadUlid } = await createThread(
            { weaveSlug: 'wv', threadSlug: 'my-thread' },
            { getActiveLoomRoot: () => root, saveDoc, fs },
        );
        assert(/^th_/.test(threadUlid), `createThread returns a th_ ULID, got ${threadUlid}`);

        const { filePath } = await weaveIdea(
            { title: 'My Idea', weaveSlug: 'wv', threadUlid },
            { getActiveLoomRoot: () => root, saveDoc, loadDoc, fs } as any,
        );
        assert(
            filePath === path.join(root, 'loom', 'wv', 'my-thread', 'idea.md'),
            `idea should land in loom/wv/my-thread/idea.md, got ${filePath}`,
        );
        console.log('    ✅ doc landed in the referenced thread');
    }

    // ── create by an UNKNOWN thread_ulid throws and fabricates nothing ──
    console.log('  • create by unknown thread_ulid throws and fabricates no thread...');
    {
        const root = await freshRoot();
        // Weave exists (one real thread) so the failure is "no such thread", not "no such weave".
        await createThread(
            { weaveSlug: 'wv', threadSlug: 'real-thread' },
            { getActiveLoomRoot: () => root, saveDoc, fs },
        );

        const bogusUlid = 'th_01UNKNOWN0000000000000000';
        let threw = false;
        try {
            await weaveIdea(
                { title: 'Orphan', weaveSlug: 'wv', threadUlid: bogusUlid },
                { getActiveLoomRoot: () => root, saveDoc, loadDoc, fs } as any,
            );
        } catch (e) {
            threw = e instanceof Error && /No thread with ulid/.test(e.message);
        }
        assert(threw, 'creating into an unknown thread_ulid must throw with a "No thread with ulid" error');

        // No fabrication: the weave still holds exactly the one real thread folder…
        const entries = (await fs.readdir(path.join(root, 'loom', 'wv'))).filter(n => !n.startsWith('.'));
        assert(
            entries.length === 1 && entries[0] === 'real-thread',
            `no thread folder fabricated — expected [real-thread], got ${JSON.stringify(entries)}`,
        );
        // …and specifically no folder literally named by the ULID (the originating bug).
        assert(
            !(await fs.pathExists(path.join(root, 'loom', 'wv', bogusUlid))),
            'must NOT create a folder literally named by the ULID (the originating bug)',
        );
        console.log('    ✅ threw + fabricated nothing (no ULID-named folder)');
    }

    // ── resolveThreadUlid ⇄ resolveThreadFolder round-trip (the CLI resolve commands) ──
    console.log('  • resolveThreadUlid ⇄ resolveThreadFolder round-trip...');
    {
        const root = await freshRoot();
        const { id: threadUlid } = await createThread(
            { weaveSlug: 'wv', threadSlug: 'round-trip' },
            { getActiveLoomRoot: () => root, saveDoc, fs },
        );
        const readDeps = { getActiveLoomRoot: () => root, loadDoc, fs };
        const gotUlid = await resolveThreadUlid('wv', 'round-trip', readDeps);
        assert(gotUlid === threadUlid, `slug→ulid resolves to the minted ULID, got ${gotUlid}`);
        const { threadSlug } = await resolveThreadFolder('wv', threadUlid, readDeps);
        assert(threadSlug === 'round-trip', `ulid→slug resolves back to the folder, got ${threadSlug}`);

        // An unknown slug / unknown weave throws (never silently invents a mapping).
        let slugThrew = false;
        try { await resolveThreadUlid('wv', 'nope', readDeps); } catch { slugThrew = true; }
        assert(slugThrew, 'resolveThreadUlid throws on an unknown slug');
        console.log('    ✅ round-trip holds; unknown slug throws');
    }

    // ── chat-location contract: a chat lives ONLY in {weave}/{thread}/chats or refs/chats ──
    console.log('  • chat by existing thread_ulid lands in {weave}/{thread}/chats...');
    {
        const root = await freshRoot();
        const { id: threadUlid } = await createThread(
            { weaveSlug: 'wv', threadSlug: 'my-thread' },
            { getActiveLoomRoot: () => root, saveDoc, fs },
        );
        const { filePath } = await chatNew(
            { weaveSlug: 'wv', threadUlid, title: 'Hi' },
            { saveDoc, loadDoc, fs, loomRoot: root } as any,
        );
        assert(
            filePath === path.join(root, 'loom', 'wv', 'my-thread', 'chats', 'chat-001.md'),
            `thread chat should land in loom/wv/my-thread/chats/chat-001.md, got ${filePath}`,
        );
        console.log('    ✅ thread chat landed in the thread');
    }

    console.log('  • refs chat lands in refs/chats...');
    {
        const root = await freshRoot();
        const { filePath } = await chatNew(
            { weaveSlug: 'refs' },
            { saveDoc, loadDoc, fs, loomRoot: root } as any,
        );
        assert(
            filePath === path.join(root, 'loom', 'refs', 'chats', 'chat-001.md'),
            `refs chat should land in loom/refs/chats/chat-001.md, got ${filePath}`,
        );
        console.log('    ✅ refs chat landed in refs/chats');
    }

    console.log('  • non-refs chat with no resolvable thread throws and orphans nothing...');
    {
        const root = await freshRoot();
        // Weave exists (one real thread) so a stray weave-root chat would be a plausible orphan.
        await createThread(
            { weaveSlug: 'wv', threadSlug: 'real-thread' },
            { getActiveLoomRoot: () => root, saveDoc, fs },
        );
        const deps = { saveDoc, loadDoc, fs, loomRoot: root } as any;

        // (a) weave but no thread_ulid → throw (the branch that used to mint loom/wv/chats).
        let noThreadThrew = false;
        try {
            await chatNew({ weaveSlug: 'wv' }, deps);
        } catch (e) {
            noThreadThrew = e instanceof Error && /a chat lives only in a thread/.test(e.message);
        }
        assert(noThreadThrew, 'a weave chat with no thread_ulid must throw (no weave-root fallback)');

        // (b) bogus thread_ulid → resolveThreadFolder throws (no fabrication).
        let bogusThrew = false;
        try {
            await chatNew({ weaveSlug: 'wv', threadUlid: 'th_01UNKNOWN0000000000000000' }, deps);
        } catch (e) {
            bogusThrew = e instanceof Error && /No thread with ulid/.test(e.message);
        }
        assert(bogusThrew, 'a chat with an unknown thread_ulid must throw');

        // No orphan directories at either invalid location.
        assert(
            !(await fs.pathExists(path.join(root, 'loom', 'wv', 'chats'))),
            'must NOT create a weave-root chats dir (loom/wv/chats)',
        );
        assert(
            !(await fs.pathExists(path.join(root, 'loom', 'chats'))),
            'must NOT create a bare loom/chats dir',
        );
        console.log('    ✅ threw both ways; no orphan chat dir at an invalid location');
    }

    await fs.remove(TMP);
    console.log('\n✅ api-contract-refactor regression tests passed\n');
}

run().catch(e => { console.error(`❌ api-contract-refactor.test.ts failed: ${e.message}`); process.exit(1); });
