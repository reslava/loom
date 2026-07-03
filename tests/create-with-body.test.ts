import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { loadDoc, loadWeave, saveDoc } from '../packages/fs/dist/index.js';
import { serializeFrontmatter } from '../packages/core/dist/index.js';
import { weaveIdea } from '../packages/app/dist/weaveIdea.js';
import { weaveDesign } from '../packages/app/dist/weaveDesign.js';
import { weavePlan } from '../packages/app/dist/weavePlan.js';
import { createThread } from '../packages/app/dist/thread.js';
import { promoteToIdea } from '../packages/app/dist/promoteToIdea.js';
import { promoteToPlan } from '../packages/app/dist/promoteToPlan.js';
import { handle as createReferenceHandle } from '../packages/mcp/dist/tools/createReference.js';

const TMP = path.join(os.tmpdir(), 'loom-create-with-body-tests');

const STEPS_TABLE = `# Demo Plan

## Steps
| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| 🔳 | 1 | First thing | src/ | — |
| 🔳 | 2 | Second thing | src/ | — |
`;

// AI client that fails if ever called — proves the sampling path is skipped.
const throwingAi = { complete: async () => { throw new Error('SAMPLING CALLED — body path should skip the AI'); } } as any;

function fm(fields: Record<string, unknown>): string {
    return serializeFrontmatter({ tags: [], parent_id: null, child_ids: [], requires_load: [], ...fields });
}

async function run() {
    const root = path.join(TMP, 'ws');
    await fs.remove(root);
    await fs.ensureDir(path.join(root, 'loom', 'demo'));

    const ideaDeps = { getActiveLoomRoot: () => root, saveDoc, loadDoc, fs };
    const designDeps = { getActiveLoomRoot: () => root, saveDoc, loadDoc, fs };
    const planDeps = { loadWeave, saveDoc, loadDoc, fs, loomRoot: root };

    // Explicitly mint the thread (no auto-scaffold) and reference it by its th_ ULID.
    const { id: threadUlid } = await createThread({ weaveSlug: 'demo', threadSlug: 'demo' }, { getActiveLoomRoot: () => root, saveDoc, fs });

    // 1. create idea with body → born at version 1, status draft, body present.
    const ideaRes = await weaveIdea({ title: 'Body Idea', weaveSlug: 'demo', threadUlid, content: '# Body Idea\n\nHand-written body.' }, ideaDeps as any);
    const idea: any = await loadDoc(ideaRes.filePath);
    assert(idea.content.includes('Hand-written body.'), 'idea has the provided body');
    assert(idea.version === 1, `idea born at version 1 (got ${idea.version})`);
    assert(idea.status === 'draft', `idea born draft (got ${idea.status})`);
    console.log('  ✓ create idea with body → v1, draft, body present');

    // 2. create design with body (thread) → v1, draft, body present.
    const designRes = await weaveDesign({ weaveSlug: 'demo', threadUlid, content: '# Body Design\n\nDesign body here.' }, designDeps as any);
    const design: any = await loadDoc(designRes.filePath);
    assert(design.content.includes('Design body here.'), 'design has the provided body');
    assert(design.version === 1 && design.status === 'draft', 'design born at v1, draft');
    console.log('  ✓ create design with body → v1, draft, body present');

    // 3. create plan with STRUCTURED steps → born frontmatter-native (steps in YAML, generated body).
    // (Plans are structured-only — the legacy content→table-parse create path was removed in favor
    // of Loom owning the steps table; idea/design/reference still take a free-form `content` body.)
    const nativeRes = await weavePlan({
        weaveSlug: 'demo', threadUlid, goal: 'Build the widget.',
        steps: [
            { description: 'First step', files: ['a.ts'], satisfies: ['IN1'], detail: '- do the first thing' },
            { description: 'Second step', title: 'Second', blockedBy: ['first-step'] },
        ],
    } as any, planDeps as any);
    const nativeRaw = await fs.readFile(nativeRes.filePath, 'utf8');
    assert(nativeRaw.includes('\nsteps:\n'), 'native plan persists a frontmatter steps block');
    assert(nativeRaw.includes('## Goal') && nativeRaw.includes('Build the widget.'), 'goal rendered in body');
    assert(nativeRaw.includes('### Step 1 — First step') && nativeRaw.includes('do the first thing'), 'detail section rendered in body');
    const nativePlan: any = await loadDoc(nativeRes.filePath);
    assert(nativePlan._stepsFromFrontmatter === true, 'structured-steps plan loads frontmatter-native');
    assert(nativePlan.steps.length === 2 && nativePlan.steps[0].id === 'first-step', `steps born with slug ids (got ${JSON.stringify(nativePlan.steps.map((s: any) => s.id))})`);
    assert(nativePlan.steps[0].status === 'pending', 'steps born pending');
    assert(JSON.stringify(nativePlan.steps[0].satisfies) === JSON.stringify(['IN1']), 'satisfies persisted to frontmatter');
    assert(JSON.stringify(nativePlan.steps[1].blockedBy) === JSON.stringify(['first-step']), 'blockedBy persisted as snake_case and round-trips');
    console.log('  ✓ create plan with structured steps → frontmatter-native, generated body');

    // 4. create reference with body → born active, body present.
    const refOut = await createReferenceHandle(root, { title: 'Body Ref', content: '# Body Ref\n\nReference body.' });
    const refRes = JSON.parse(refOut.content[0].text);
    const ref: any = await loadDoc(refRes.filePath);
    assert(ref.content.includes('Reference body.'), 'reference has the provided body');
    assert(ref.status === 'active', `reference born active (got ${ref.status})`);
    console.log('  ✓ create reference with body → active, body present');

    // Seed a chat to promote from.
    const chatPath = path.join(root, 'loom', 'demo', 'chats', 'demo-chat.md');
    const chatFm = fm({ type: 'chat', id: 'ch_TESTCHAT00000000000000001', title: 'Demo Chat', status: 'active', created: '2026-06-02', version: 1 });
    await fs.outputFile(chatPath, `${chatFm}\n## Rafa:\nLet's build something.\n`);

    // 5. promote chat → idea with body, throwing AI → no sampling, body written verbatim.
    const promoted = await promoteToIdea(
        { filePath: chatPath, targetWeaveId: 'demo', title: 'Promoted Idea', body: '# Promoted Idea\n\nPromoted body.' },
        { loadDoc, saveDoc, fs, aiClient: throwingAi, loomRoot: root },
    );
    const promotedIdea: any = await loadDoc(promoted.filePath);
    assert(promotedIdea.content === '# Promoted Idea\n\nPromoted body.', 'promoted idea body is verbatim (no AI, no # title prepend)');
    assert(promotedIdea.type === 'idea' && promotedIdea.status === 'draft', 'promoted idea is an idea, born draft');
    console.log('  ✓ promote → idea with body skips sampling, body verbatim');

    // 6. promote chat → plan with body (steps table), throwing AI → steps parsed, no sampling.
    const promotedPlan = await promoteToPlan(
        { filePath: chatPath, targetWeaveId: 'demo', title: 'Promoted Plan', body: STEPS_TABLE },
        { loadDoc, saveDoc, fs, aiClient: throwingAi, loomRoot: root },
    );
    const pplan: any = await loadDoc(promotedPlan.filePath);
    assert(pplan.steps.length === 2, `promoted plan steps parsed from body table (got ${pplan.steps.length})`);
    console.log('  ✓ promote → plan with body skips sampling, steps parsed');

    await fs.remove(TMP);
    console.log('✅ create-with-body tests passed');
}

run().catch(e => { console.error(e); process.exit(1); });
