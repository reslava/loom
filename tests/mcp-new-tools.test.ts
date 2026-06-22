import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { planReducer } from '../packages/core/dist/reducers/planReducer.js';
import { parseChatBlocks, lastAiBlockIndex, tailAfterBlock, appendChatBlock, serializeFrontmatter } from '../packages/core/dist/index.js';
import { loadWeave, saveDoc, loadDoc } from '../packages/fs/dist/index.js';
import { weavePlan } from '../packages/app/dist/weavePlan.js';
import { handle as patchDocHandle } from '../packages/mcp/dist/tools/patchDoc.js';
import { handle as readChatTailHandle } from '../packages/mcp/dist/tools/readChatTail.js';
import { handle as appendToChatHandle } from '../packages/mcp/dist/tools/appendToChat.js';

const TMP = path.join(os.tmpdir(), 'loom-mcp-new-tools-tests');

function makePlan(status: string, steps: Array<{ id: string; order: number; description: string; status: string }>) {
    return {
        type: 'plan' as const, id: 'test-plan-001', title: 'Test Plan', status,
        created: '2026-06-11', version: 1, tags: [], parent_id: null, child_ids: [],
        requires_load: [], content: '',
        steps: steps.map(s => ({ files_touched: [], blockedBy: [], satisfies: [], title: s.description, ...s })),
    } as any;
}

async function expectThrow(fn: () => any, label: string): Promise<void> {
    let threw = false;
    try { await fn(); } catch { threw = true; }
    assert(threw, `expected throw: ${label}`);
}

async function run() {
    console.log('🔁 Running mcp-new-tools tests...\n');

    // ── A. planReducer UPDATE_STEP (pure) ──
    console.log('  • UPDATE_STEP amends a pending step; rejects done / unknown...');
    {
        const plan = makePlan('implementing', [
            { id: 'a', order: 1, description: 'Step A', status: 'pending' },
            { id: 'b', order: 2, description: 'Step B', status: 'done' },
        ]);
        const r = planReducer(plan, { type: 'UPDATE_STEP', stepId: 'a', patch: { description: 'Step A2', satisfies: ['IN1'] } } as any);
        assert(r.steps[0].description === 'Step A2', 'description amended');
        assert(JSON.stringify(r.steps[0].satisfies) === JSON.stringify(['IN1']), 'satisfies amended');
        await expectThrow(() => planReducer(plan, { type: 'UPDATE_STEP', stepId: 'b', patch: { description: 'x' } } as any), 'update done step');
        await expectThrow(() => planReducer(plan, { type: 'UPDATE_STEP', stepId: 'zzz', patch: { description: 'x' } } as any), 'update unknown step');
        console.log('    ✅ UPDATE_STEP applies fields, rejects done/unknown');
    }

    // ── B. planReducer REORDER_STEPS (pure) ──
    console.log('  • REORDER_STEPS permutes; rejects non-permutation; pins done leading block...');
    {
        const allPending = makePlan('implementing', [
            { id: 'a', order: 1, description: 'A', status: 'pending' },
            { id: 'b', order: 2, description: 'B', status: 'pending' },
            { id: 'c', order: 3, description: 'C', status: 'pending' },
        ]);
        const r = planReducer(allPending, { type: 'REORDER_STEPS', orderedStepIds: ['c', 'a', 'b'] } as any);
        assert(r.steps.map((s: any) => s.id).join(',') === 'c,a,b', 'reordered');
        assert(r.steps[0].order === 1 && r.steps[2].order === 3, 'order recomputed 1..n');

        await expectThrow(() => planReducer(allPending, { type: 'REORDER_STEPS', orderedStepIds: ['a', 'b'] } as any), 'non-permutation (drop)');
        await expectThrow(() => planReducer(allPending, { type: 'REORDER_STEPS', orderedStepIds: ['a', 'b', 'c', 'd'] } as any), 'non-permutation (add)');

        const withDone = makePlan('implementing', [
            { id: 'a', order: 1, description: 'A', status: 'done' },
            { id: 'b', order: 2, description: 'B', status: 'pending' },
            { id: 'c', order: 3, description: 'C', status: 'pending' },
        ]);
        // moving the done step 'a' out of the leading block → reject
        await expectThrow(() => planReducer(withDone, { type: 'REORDER_STEPS', orderedStepIds: ['b', 'a', 'c'] } as any), 'done step out of leading block');
        // reordering only the pending tail → ok
        const ok = planReducer(withDone, { type: 'REORDER_STEPS', orderedStepIds: ['a', 'c', 'b'] } as any);
        assert(ok.steps.map((s: any) => s.id).join(',') === 'a,c,b', 'pending tail reordered, done stays leading');
        console.log('    ✅ REORDER_STEPS guards permutation + done leading block');
    }

    // ── C. chatUtils (pure), header NOT hardcoded ──
    console.log('  • chatUtils parse / lastAiBlockIndex / tailAfterBlock with a custom header...');
    {
        const body = [
            '# Chat', '',
            '## HUMAN:', '', 'first question', '',
            '## ROBOT:', '', 'first answer', '',
            '## HUMAN:', '', 'second question',
        ].join('\n');
        const blocks = parseChatBlocks(body);
        assert(blocks.length === 3, `expected 3 blocks, got ${blocks.length}`);
        assert(blocks[0].header === 'HUMAN:' && blocks[1].header === 'ROBOT:', 'headers parsed');
        const idx = lastAiBlockIndex(body, 'ROBOT:');
        assert(idx === 1, `last ROBOT block at index 1, got ${idx}`);
        const tail = tailAfterBlock(body, idx);
        assert(tail.includes('second question') && !tail.includes('first answer'), 'tail = turns after last AI block');
        assert(lastAiBlockIndex(body, 'NOPE:') === -1, 'absent AI header → -1');
        console.log('    ✅ chatUtils correct, header-string driven');
    }

    // ── C2. appendChatBlock seam: exactly one blank line, no accumulation ──
    console.log('  • appendChatBlock normalizes the seam (no widening blank-line gap)...');
    {
        // Simulate repeated appends where each incoming body carries a trailing newline
        // and the prior block did too — the old `${existing}\n\n## h\n\n${body}` path
        // compounded these into widening gaps.
        let chat = '# Chat\n\n## Rafa:\n\nfirst question\n'; // note trailing newline
        chat = appendChatBlock(chat, 'AI:', 'first answer\n');
        chat = appendChatBlock(chat, 'Rafa:', 'second question\n\n');
        chat = appendChatBlock(chat, 'AI:', 'second answer\n');

        assert(!/\n{3,}/.test(chat), `no run of 3+ newlines (widening gap), got:\n${JSON.stringify(chat)}`);
        // Every header is preceded by exactly one blank line and followed by one.
        const headerSeams = chat.match(/[^\n]\n\n## /g) ?? [];
        assert(headerSeams.length === 4, `4 headers (initial + 3 appended) each with single blank line before, got ${headerSeams.length}`);
        assert(/## AI:\n\nfirst answer/.test(chat), 'single blank line after header');
        // First-line code indentation is preserved (only leading newlines stripped).
        const withCode = appendChatBlock('## Rafa:\n\nq', 'AI:', '\n    indented code line');
        assert(withCode.endsWith('## AI:\n\n    indented code line'), `leading newline stripped, indent kept, got:\n${JSON.stringify(withCode)}`);
        // Empty existing body → no leading blank line.
        assert(appendChatBlock('', 'AI:', 'hi') === '## AI:\n\nhi', 'empty base → bare block');
        console.log('    ✅ appendChatBlock seam normalized, idempotent across repeats');
    }

    // ── D. patch_doc handle (real fs) ──
    console.log('  • patch_doc edits body prose, enforces uniqueness, refuses the Steps table...');
    {
        const root = path.join(TMP, 'ws');
        await fs.remove(root);
        await fs.ensureDir(path.join(root, '.loom'));
        await fs.ensureDir(path.join(root, 'loom', 'demo', 'demo'));

        // a design doc (non-plan): unique line + a doubled phrase
        const designFm = serializeFrontmatter({
            type: 'design', id: 'test-design', title: 'Test Design', status: 'draft',
            created: '2026-06-11', version: 1, tags: [], parent_id: null, requires_load: [],
        });
        const designBody = '# Test Design\n\nUNIQUELINE here.\n\nThe quick brown fox. The quick brown fox.\n';
        await fs.outputFile(path.join(root, 'loom', 'demo', 'test-design.md'), `${designFm}\n${designBody}`);

        // unique match → 1 replacement
        const out1 = JSON.parse((await patchDocHandle(root, { id: 'test-design', old_string: 'UNIQUELINE here.', new_string: 'CHANGED LINE.' })).content[0].text);
        assert(out1.replacements === 1, 'unique patch → 1 replacement');
        const d1: any = await loadDoc(out1.filePath);
        assert(d1.content.includes('CHANGED LINE.') && !d1.content.includes('UNIQUELINE'), 'body prose edited');
        assert(d1.version === 2, `version bumped (got ${d1.version})`);

        // non-unique without replace_all → throw
        await expectThrow(() => patchDocHandle(root, { id: 'test-design', old_string: 'The quick brown fox.', new_string: 'X' }), 'non-unique without replace_all');
        // replace_all → 2 replacements
        const out2 = JSON.parse((await patchDocHandle(root, { id: 'test-design', old_string: 'The quick brown fox.', new_string: 'A cat.', replace_all: true })).content[0].text);
        assert(out2.replacements === 2, `replace_all → 2 (got ${out2.replacements})`);
        // not found → throw
        await expectThrow(() => patchDocHandle(root, { id: 'test-design', old_string: 'NONEXISTENT', new_string: 'x' }), 'old_string not found');

        // a frontmatter-native plan with a Goal marker + a step row marker
        const planRes = await weavePlan(
            { weaveId: 'demo', threadId: 'demo', goal: 'GOALMARKER build the widget.', steps: [{ description: 'STEPMARKER do the thing' }] } as any,
            { loadWeave, saveDoc, loadDoc, fs, loomRoot: root } as any,
        );
        // a match inside the generated ## Steps table → refused
        await expectThrow(() => patchDocHandle(root, { id: planRes.id, old_string: 'STEPMARKER do the thing', new_string: 'X' }), 'patch inside Steps table refused');
        // a match in the Goal prose → allowed
        const goalOut = JSON.parse((await patchDocHandle(root, { id: planRes.id, old_string: 'GOALMARKER', new_string: 'GOALCHANGED' })).content[0].text);
        assert(goalOut.replacements === 1, 'goal prose patchable on a plan');
        const p1: any = await loadDoc(planRes.filePath);
        assert(p1.content.includes('GOALCHANGED'), 'goal edit persisted');
        assert(p1.content.includes('STEPMARKER do the thing'), 'steps table intact (regenerated from frontmatter)');
        console.log('    ✅ patch_doc: prose edits, uniqueness, Steps-table refusal');
    }

    // ── E. read_chat_tail handle (real fs) + custom ai.model ──
    console.log('  • read_chat_tail returns turns since last AI block, custom ai.model header...');
    {
        const root = path.join(TMP, 'chatws');
        await fs.remove(root);
        await fs.ensureDir(path.join(root, '.loom'));
        await fs.ensureDir(path.join(root, 'loom', 'demo', 'chats'));
        await fs.outputFile(path.join(root, '.loom', 'settings.json'), JSON.stringify({ 'user.name': 'HUMAN:', 'ai.model': 'ROBOT:' }));

        const chatFm = serializeFrontmatter({
            type: 'chat', id: 'ch_TESTTAIL0000000000000001', title: 'Tail Chat', status: 'active',
            created: '2026-06-11', version: 1, tags: [], parent_id: null, requires_load: [],
        });
        const chatBody = '# Tail Chat\n\n## HUMAN:\n\nq1\n\n## ROBOT:\n\na1\n\n## HUMAN:\n\nq2 NEWTURN';
        await fs.outputFile(path.join(root, 'loom', 'demo', 'chats', 'demo-chat.md'), `${chatFm}\n${chatBody}`);

        const tailText = (await readChatTailHandle(root, { id: 'ch_TESTTAIL0000000000000001' })).content[0].text;
        assert(tailText.includes('q2 NEWTURN'), 'tail includes the new human turn after the last ROBOT block');
        assert(!tailText.includes('a1') && !tailText.includes('q1'), 'tail excludes earlier turns (before/at last AI block)');
        console.log('    ✅ read_chat_tail: tail-after-last-AI, configured header');
    }

    // ── F. append_to_chat role: omitted → ai (never silently a user turn); invalid → throw ──
    console.log('  • append_to_chat defaults omitted role to ai, rejects an invalid role...');
    {
        const root = path.join(TMP, 'appendws');
        await fs.remove(root);
        await fs.ensureDir(path.join(root, '.loom'));
        await fs.ensureDir(path.join(root, 'loom', 'demo', 'chats'));
        await fs.outputFile(path.join(root, '.loom', 'settings.json'), JSON.stringify({ 'user.name': 'HUMAN:', 'ai.model': 'ROBOT:' }));

        const chatFm = serializeFrontmatter({
            type: 'chat', id: 'ch_TESTAPPEND000000000000001', title: 'Append Chat', status: 'active',
            created: '2026-06-11', version: 1, tags: [], parent_id: null, requires_load: [],
        });
        const chatPath = path.join(root, 'loom', 'demo', 'chats', 'demo-chat.md');
        await fs.outputFile(chatPath, `${chatFm}\n# Append Chat\n`);

        // role omitted → must default to the ai header, NOT the user one (the bug we fixed)
        await appendToChatHandle(root, { id: 'ch_TESTAPPEND000000000000001', body: 'agent turn' });
        const afterAi: any = await loadDoc(chatPath);
        assert(afterAi.content.includes('## ROBOT:\n\nagent turn'), 'omitted role → ai header (not user)');
        assert(!afterAi.content.includes('## HUMAN:'), 'omitted role never produced a user turn');

        // explicit role: 'user' → the user header
        await appendToChatHandle(root, { id: 'ch_TESTAPPEND000000000000001', role: 'user', body: 'human turn' });
        const afterUser: any = await loadDoc(chatPath);
        assert(afterUser.content.includes('## HUMAN:\n\nhuman turn'), "explicit role 'user' → user header");

        // a present-but-invalid role is a caller bug → throw (no silent guess)
        await expectThrow(() => appendToChatHandle(root, { id: 'ch_TESTAPPEND000000000000001', role: 'robot', body: 'x' }), 'invalid role rejected');
        console.log('    ✅ append_to_chat: omitted→ai, explicit user honoured, invalid→throw');
    }

    await fs.remove(TMP);
    console.log('\n✅ mcp-new-tools tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
