import { assert } from './test-utils.ts';
import { selectReportDocs, getReportKind } from '../packages/core/dist';

// Pure unit tests for selectReportDocs — no filesystem, no CLI. Build a minimal
// LoomState-shaped fixture and assert deterministic selection: type ∈ kind.docTypes,
// weave/thread scoping, inclusive created date window, chronological ordering, manifest.

function doc(type: string, id: string, created: string): any {
    return { type, id, title: id, status: 'active', created, version: 1, tags: [], parent_id: null, requires_load: [], content: `body-${id}` };
}
function thread(weaveSlug: string, id: string, arrays: any): any {
    const { idea, design, req, plans = [], dones = [], chats = [], refDocs = [] } = arrays;
    const allDocs = [idea, design, req, ...plans, ...dones, ...chats, ...refDocs].filter(Boolean);
    return { id, weaveSlug, idea, design, req, plans, dones, chats, refDocs, allDocs };
}
function weave(id: string, threads: any[], extra: any = {}): any {
    return { id, threads, looseFibers: extra.looseFibers ?? [], chats: extra.chats ?? [], refDocs: extra.refDocs ?? [], allDocs: [] };
}
function state(weaves: any[]): any {
    return { weaves, globalDocs: [], globalChats: [] };
}

async function run() {
    console.log('📑 Running selectReportDocs tests...\n');

    const daDesign = doc('design', 'da-design', '2026-01-01');
    const daChat = doc('chat', 'da-chat', '2026-02-01');
    const daDone = doc('done', 'da-done', '2026-03-01');
    const daRef = doc('reference', 'da-ref', '2026-01-05');
    const dbDesign = doc('design', 'db-design', '2026-01-15');

    const s = state([
        weave('wa', [thread('wa', 'ta', { design: daDesign, chats: [daChat], dones: [daDone] })], { refDocs: [daRef] }),
        weave('wb', [thread('wb', 'tb', { design: dbDesign })]),
    ]);

    const decisions = getReportKind('decisions')!;      // chat + design
    const architecture = getReportKind('architecture')!; // design + reference

    // 1. decisions selects chats + designs across weaves, chronological, with manifest.
    {
        const sel = selectReportDocs(s, decisions, {});
        assert(sel.docs.length === 3, `decisions selects 3 (2 design + 1 chat), got ${sel.docs.length}`);
        assert(sel.docs.map(d => d.id).join(',') === 'da-design,db-design,da-chat', `chronological order, got ${sel.docs.map(d => d.id).join(',')}`);
        assert(sel.manifest.counts.design === 2 && sel.manifest.counts.chat === 1, 'manifest counts by type');
        assert(!sel.docs.some(d => d.type === 'done' || d.type === 'reference'), 'excludes types not in kind.docTypes');
        assert(sel.manifest.totalChars > 0, 'manifest reports total body chars');
        console.log('  ✅ decisions: chat+design, chronological, type-filtered, manifest');
    }

    // 2. weave filter scopes to one weave.
    {
        const sel = selectReportDocs(s, decisions, { weaves: ['wa'] });
        assert(sel.docs.length === 2 && sel.docs.every(d => d.weaveSlug === 'wa'), `weave filter keeps only wa (2 docs), got ${sel.docs.length}`);
        console.log('  ✅ weave filter');
    }

    // 3. thread filter scopes to one thread.
    {
        const sel = selectReportDocs(s, decisions, { threads: ['tb'] });
        assert(sel.docs.length === 1 && sel.docs[0].id === 'db-design', 'thread filter keeps only tb');
        console.log('  ✅ thread filter');
    }

    // 4. date window (inclusive) on created.
    {
        const from = selectReportDocs(s, decisions, { from: '2026-01-10' });
        assert(from.docs.map(d => d.id).sort().join(',') === 'da-chat,db-design', `from drops da-design, got ${from.docs.map(d => d.id).join(',')}`);
        const window = selectReportDocs(s, decisions, { from: '2026-01-01', to: '2026-01-31' });
        assert(window.docs.map(d => d.id).sort().join(',') === 'da-design,db-design', `window keeps Jan designs, got ${window.docs.map(d => d.id).join(',')}`);
        console.log('  ✅ date window (from/to inclusive)');
    }

    // 5. architecture selects design + reference (incl. the weave-level ref); excludes chat.
    {
        const sel = selectReportDocs(s, architecture, {});
        assert(sel.docs.some(d => d.id === 'da-ref'), 'architecture includes the weave-level reference');
        assert(sel.docs.some(d => d.type === 'design'), 'architecture includes designs');
        assert(!sel.docs.some(d => d.type === 'chat'), 'architecture excludes chats');
        console.log('  ✅ architecture: design+reference (weave-level ref picked up)');
    }

    console.log('\n✅ selectReportDocs tests passed');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
