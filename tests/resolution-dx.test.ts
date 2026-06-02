import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { resolveDocIdOrThrow } from '../packages/fs/dist/index.js';
import { serializeFrontmatter } from '../packages/core/dist/index.js';
import { handleLinkIndexResource } from '../packages/mcp/dist/resources/linkIndex.js';
import { handle as findDocHandle } from '../packages/mcp/dist/tools/findDoc.js';
import { handle as updateDocHandle } from '../packages/mcp/dist/tools/updateDoc.js';
import { handle as startPlanHandle } from '../packages/mcp/dist/tools/startPlan.js';
import { handle as archiveHandle } from '../packages/mcp/dist/tools/archive.js';
import { handlePlanResource } from '../packages/mcp/dist/resources/plan.js';
import { handleDocsResource } from '../packages/mcp/dist/resources/docs.js';

const TMP = path.join(os.tmpdir(), 'loom-resolution-dx-tests');

const PLAN_ULID = 'pl_TESTPLAN00000000000000001';
const REF_SLUG = 'demo-ref';

function fm(fields: Record<string, unknown>): string {
    return serializeFrontmatter({ tags: [], parent_id: null, child_ids: [], requires_load: [], ...fields });
}

async function seed(root: string): Promise<{ planPath: string }> {
    await fs.remove(root);
    const threadPath = path.join(root, 'loom', 'demo', 'demo');
    await fs.ensureDir(path.join(threadPath, 'plans'));

    // Plan: canonical id is the ULID; filename stem is "demo-plan-001".
    const planPath = path.join(threadPath, 'plans', 'demo-plan-001.md');
    const planFm = fm({
        type: 'plan', id: PLAN_ULID, title: 'Demo Plan', status: 'active',
        created: '2026-06-02', version: 1,
    });
    await fs.outputFile(planPath,
        `${planFm}\n## Steps\n| Done | # | Step | Files | Blocked by |\n|------|---|------|-------|------------|\n| 🔳 | 1 | Do it | src/ | — |\n`);

    // Reference with a slug (to test slug resolution).
    const refsDir = path.join(root, 'loom', 'refs');
    await fs.ensureDir(refsDir);
    const refFm = fm({
        type: 'reference', id: 'rf_TESTREF0000000000000000001', title: 'Demo Ref',
        status: 'active', created: '2026-06-02', version: 1, slug: REF_SLUG,
    });
    await fs.outputFile(path.join(refsDir, `${REF_SLUG}-reference.md`), `${refFm}\n# Demo Ref\n`);

    return { planPath };
}

async function expectThrow(fn: () => Promise<unknown>, mustContain: string[]): Promise<void> {
    let err: Error | undefined;
    try { await fn(); } catch (e) { err = e as Error; }
    assert(!!err, `expected throw, got none`);
    for (const s of mustContain) {
        assert(err!.message.includes(s), `error "${err!.message}" should contain "${s}"`);
    }
}

async function run() {
    const root = path.join(TMP, 'ws');
    const { planPath } = await seed(root);

    // 1. link-index resource returns a populated id→path map (was {} before the fix).
    const res = await handleLinkIndexResource(root);
    const idx = JSON.parse(res.contents[0].text);
    assert(Object.keys(idx.byId).length >= 2, 'byId should be populated, not empty');
    assert(idx.byId[PLAN_ULID] === planPath, 'byId maps the plan ULID to its real path');
    assert(idx.documents[PLAN_ULID] && idx.documents[PLAN_ULID].path === planPath, 'documents carries the path');
    console.log('  ✓ link-index resource emits a populated id→path map');

    // 2. resolveDocIdOrThrow resolves a canonical ULID.
    const byId = await resolveDocIdOrThrow(root, PLAN_ULID);
    assert(byId.id === PLAN_ULID && byId.filePath === planPath, 'resolves by ULID');
    console.log('  ✓ resolveDocIdOrThrow resolves a canonical ULID');

    // 3. resolveDocIdOrThrow resolves a reference slug to its id.
    const bySlug = await resolveDocIdOrThrow(root, REF_SLUG);
    assert(bySlug.id === 'rf_TESTREF0000000000000000001', 'resolves a reference slug to its id');
    console.log('  ✓ resolveDocIdOrThrow resolves a reference slug');

    // 4. A filename stem (not the canonical id) misses but suggests the ULID.
    await expectThrow(() => resolveDocIdOrThrow(root, 'demo-plan-001'),
        ['Document not found', 'did you mean', PLAN_ULID]);
    console.log('  ✓ filename stem misses and suggests the canonical ULID');

    // 5. Suggestion surfaces through the routed tools.
    await expectThrow(() => findDocHandle(root, { id: 'demo-plan-001' }),
        ['did you mean', PLAN_ULID]);
    await expectThrow(() => updateDocHandle(root, { id: 'demo-plan-001', content: 'x' }),
        ['did you mean', PLAN_ULID]);
    await expectThrow(() => startPlanHandle(root, { planId: 'demo-plan-001' }),
        ['did you mean', PLAN_ULID]);
    console.log('  ✓ find_doc / update_doc / start_plan all surface the suggestion');

    // 6. The rollout: suggestion also surfaces through a routed read-resource and a
    //    routed tool that previously returned a bare "not found".
    await expectThrow(() => handlePlanResource(root, 'loom://plan/demo-plan-001'),
        ['did you mean', PLAN_ULID]);
    await expectThrow(() => handleDocsResource(root, 'loom://docs/demo-plan-001'),
        ['did you mean', PLAN_ULID]);
    await expectThrow(() => archiveHandle(root, { id: 'demo-plan-001' }),
        ['did you mean', PLAN_ULID]);
    console.log('  ✓ rollout: plan/docs resources + archive tool surface the suggestion');

    await fs.remove(TMP);
    console.log('✅ resolution-dx tests passed');
}

run().catch(e => { console.error(e); process.exit(1); });
