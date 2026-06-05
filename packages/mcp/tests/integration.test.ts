/**
 * MCP integration tests — spawns loom mcp via StdioClientTransport and exercises
 * all five test scenarios from mcp-plan-001 step 42.
 *
 * Run from repo root:
 *   npx ts-node --project tests/tsconfig.json packages/mcp/tests/integration.test.ts
 */
import * as path from 'path';
import * as os from 'os';
import * as fsExtra from 'fs-extra';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
    try {
        await fn();
        console.log(`    ✅ ${name}`);
        passed++;
    } catch (e: any) {
        console.error(`    ❌ ${name}: ${e.message}`);
        failed++;
    }
}

// ── fixture ───────────────────────────────────────────────────────────────────

async function createFixture(): Promise<string> {
    const root = path.join(os.tmpdir(), `loom-mcp-test-${Date.now()}`);

    // .loom directory
    await fsExtra.ensureDir(path.join(root, '.loom'));

    // weave: tw / thread: t1
    const threadDir = path.join(root, 'loom', 'tw', 't1');
    await fsExtra.ensureDir(path.join(threadDir, 'plans'));

    // design doc (plan's parent)
    await fsExtra.outputFile(
        path.join(threadDir, 't1-design.md'),
        [
            '---',
            'type: design',
            'id: t1-design',
            'title: "T1 Design"',
            'status: active',
            'created: 2026-04-26',
            'version: 1',
            'tags: []',
            'parent_id: null',
            'child_ids: [tw-plan-001]',
            'requires_load: []',
            'role: primary',
            'target_release: "0.5.0"',
            'actual_release: null',
            '---',
            '',
            '## Overview',
            'Test design.',
        ].join('\n')
    );

    // idea doc
    await fsExtra.outputFile(
        path.join(threadDir, 't1-idea.md'),
        [
            '---',
            'type: idea',
            'id: t1-idea',
            'title: "T1 Idea"',
            'status: active',
            'created: 2026-04-26',
            'version: 1',
            'tags: []',
            'parent_id: null',
            'child_ids: [t1-design]',
            'requires_load: []',
            '---',
            '',
            'Test idea.',
        ].join('\n')
    );

    // plan doc: id must be {weaveId}-plan-NNN so completeStep can extract weaveId
    await fsExtra.outputFile(
        path.join(threadDir, 'plans', 'tw-plan-001.md'),
        [
            '---',
            'type: plan',
            'id: tw-plan-001',
            'title: "TW Plan 001"',
            'status: implementing',
            'created: 2026-04-26',
            'version: 1',
            'tags: []',
            'parent_id: t1-design',
            'child_ids: []',
            'requires_load: []',
            'design_version: 1',
            '---',
            '',
            '## Steps',
            '',
            '| Done | # | Step | Files touched | Blocked by |',
            '|------|---|------|---------------|------------|',
            '| 🔳 | 1 | First step | src/ | — |',
            '| 🔳 | 2 | Second step | src/ | 1 |',
        ].join('\n')
    );

    return root;
}

// ── client factory ────────────────────────────────────────────────────────────

async function connectClient(root: string): Promise<{ client: Client; transport: StdioClientTransport }> {
    const serverEntry = path.join(__dirname, '..', 'dist', 'index.js');

    const transport = new StdioClientTransport({
        command: 'node',
        args: [serverEntry],
        env: { ...process.env as Record<string, string>, LOOM_ROOT: root },
    });

    const client = new Client({ name: 'loom-test', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
    return { client, transport };
}

// ── tests ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
    console.log('\n▶ packages/mcp/tests/integration.test.ts');
    console.log('  Setting up fixture...');

    const root = await createFixture();
    const { client } = await connectClient(root);

    console.log('  Connected. Running tests...\n');

    // (a) list resources
    await test('list resources returns loom:// URIs', async () => {
        const result = await client.listResources();
        assert(result.resources.length > 0, 'should have resources');
        const uris = result.resources.map(r => r.uri);
        assert(uris.includes('loom://state'), 'should include loom://state');
        assert(uris.includes('loom://diagnostics'), 'should include loom://diagnostics');
    });

    // (b) read loom://state
    await test('read loom://state returns valid state JSON', async () => {
        const result = await client.readResource({ uri: 'loom://state' });
        const text = result.contents[0].text as string;
        const state = JSON.parse(text);
        assert(Array.isArray(state.weaves), 'state.weaves should be an array');
    });

    // (b2) read loom://context for the plan (mode=implementing) — unified pipeline
    await test('read loom://context returns serialised bundle with provenance headers', async () => {
        const result = await client.readResource({ uri: 'loom://context/tw-plan-001?mode=implementing' });
        const text = result.contents[0].text as string;
        assert(text.includes('<!-- loom:context-bundle target=tw-plan-001 mode=implementing'), 'leading bundle comment missing');
        assert(text.includes('id: tw-plan-001'), 'target plan header missing');
        assert(text.includes('id: t1-idea'), 'idea should be in the parent chain');
        assert(text.includes('id: t1-design'), 'design should be in the parent chain');
    });

    // (b3) context prefs: set an exclude, confirm it lands in the bundle read path
    await test('loom_set_context_prefs exclusion drops the doc from loom://context', async () => {
        // Sanity: idea is in the bundle before any override (asserted in b2 too).
        const before = await client.readResource({ uri: 'loom://context/tw-plan-001?mode=implementing' });
        assert((before.contents[0].text as string).includes('id: t1-idea'), 'idea present before exclude');

        const setRes = await client.callTool({
            name: 'loom_set_context_prefs',
            arguments: { targetId: 'tw-plan-001', exclude: ['t1-idea'] },
        });
        const setData = JSON.parse((setRes.content[0] as { text: string }).text);
        assert(setData.entry.exclude.includes('t1-idea'), 'set returns the persisted exclude');

        // get round-trips
        const getRes = await client.callTool({
            name: 'loom_get_context_prefs',
            arguments: { targetId: 'tw-plan-001' },
        });
        const getData = JSON.parse((getRes.content[0] as { text: string }).text);
        assert(getData.entry.exclude.includes('t1-idea'), 'get round-trips the exclude');

        // the resource now honours the persisted override — idea is gone
        const after = await client.readResource({ uri: 'loom://context/tw-plan-001?mode=implementing' });
        const afterText = after.contents[0].text as string;
        assert(!afterText.includes('id: t1-idea'), 'idea should be excluded from the bundle after override');
        assert(afterText.includes('id: t1-design'), 'design should still be present');

        // reset so later assertions / reuse see a clean target
        await client.callTool({
            name: 'loom_set_context_prefs',
            arguments: { targetId: 'tw-plan-001', reset: true },
        });
        const restored = await client.readResource({ uri: 'loom://context/tw-plan-001?mode=implementing' });
        assert((restored.contents[0].text as string).includes('id: t1-idea'), 'idea returns after reset');
    });

    // (c) call loom_create_idea with valid args
    await test('loom_create_idea creates an idea doc', async () => {
        const result = await client.callTool({
            name: 'loom_create_idea',
            arguments: { weaveId: 'tw', title: 'Integration Test Idea' },
        });
        const content = result.content[0] as { type: string; text: string };
        const data = JSON.parse(content.text);
        assert(typeof (data.tempId ?? data.id) === 'string', 'result should have an id');
        assert(typeof data.filePath === 'string', 'result should have a filePath');
    });

    // (d) call loom_complete_step on a draft step
    await test('loom_complete_step marks step 1 done', async () => {
        const result = await client.callTool({
            name: 'loom_complete_step',
            arguments: { planId: 'tw-plan-001', stepNumber: 1 },
        });
        const content = result.content[0] as { type: string; text: string };
        const data = JSON.parse(content.text);
        // completeStep returns { plan, autoCompleted }
        assert(data.plan?.id === 'tw-plan-001', 'result.plan.id should match');
        assert(data.plan?.steps?.[0]?.done === true, 'step 1 should be marked done');
    });

    // (e) error path: loom_find_doc with unknown ID
    await test('loom_find_doc with unknown ID returns an error', async () => {
        try {
            const result = await client.callTool({
                name: 'loom_find_doc',
                arguments: { id: 'this-doc-does-not-exist-xyz-999' },
            });
            // Some SDK versions return isError:true instead of throwing
            const content = result.content[0] as { type: string; text: string };
            const isError = (result as any).isError === true || content.text.includes('not found');
            assert(isError, 'should indicate an error for unknown ID');
        } catch (e: any) {
            // Expected: client throws on JSON-RPC error
            assert(e.message.length > 0, 'error should have a message');
        }
    });

    // list tools smoke test
    await test('list tools returns all tool definitions', async () => {
        const result = await client.listTools();
        const names = result.tools.map(t => t.name);
        assert(names.includes('loom_create_idea'), 'should include loom_create_idea');
        assert(names.includes('loom_complete_step'), 'should include loom_complete_step');
        assert(names.includes('loom_search_docs'), 'should include loom_search_docs');
        assert(names.includes('loom_generate_idea'), 'should include loom_generate_idea');
        assert(names.includes('loom_set_context_prefs'), 'should include loom_set_context_prefs');
        assert(names.includes('loom_get_context_prefs'), 'should include loom_get_context_prefs');
        assert(names.includes('loom_create_req'), 'should include loom_create_req');
        assert(names.includes('loom_refine_req'), 'should include loom_refine_req');
        assert(names.includes('loom_finalize_req'), 'should include loom_finalize_req');
        assert(names.includes('loom_generate_req'), 'should include loom_generate_req');
    });

    // (f) req lifecycle: create → finalize → surfaces in the context bundle before the idea
    await test('loom_create_req + loom_finalize_req → req surfaces in loom://context before the idea', async () => {
        const createRes = await client.callTool({
            name: 'loom_create_req',
            arguments: {
                weaveId: 'tw',
                threadId: 't1',
                content: '### ✅ Included\n- `IN1` The thing.\n\n### ❌ Excluded\n- `EX1` Not the other thing.\n\n### ⛓ Constraints\n- `C1` TypeScript only.\n',
            },
        });
        const created = JSON.parse((createRes.content[0] as { text: string }).text);
        assert(typeof created.id === 'string' && created.id.startsWith('rq_'), 'create returns an rq_ id');

        const finRes = await client.callTool({
            name: 'loom_finalize_req',
            arguments: { weaveId: 'tw', threadId: 't1' },
        });
        const fin = JSON.parse((finRes.content[0] as { text: string }).text);
        assert(fin.status === 'locked', 'finalize returns status locked');

        const ctx = await client.readResource({ uri: 'loom://context/tw-plan-001?mode=implementing' });
        const text = ctx.contents[0].text as string;
        assert(text.includes(created.id), 'req id should appear in the context bundle');
        assert(text.includes('The thing.'), 'req body should appear in the context bundle');
        const reqPos = text.indexOf(created.id);
        const ideaPos = text.indexOf('id: t1-idea');
        assert(reqPos !== -1 && ideaPos !== -1 && reqPos < ideaPos, 'req should be injected before the idea');
    });

    // list prompts smoke test
    await test('list prompts returns all prompt definitions', async () => {
        const result = await client.listPrompts();
        const names = result.prompts.map(p => p.name);
        assert(names.includes('continue-thread'), 'should include continue-thread');
        assert(names.includes('do-next-step'), 'should include do-next-step');
        assert(names.includes('validate-state'), 'should include validate-state');
    });

    await client.close();
    await fsExtra.remove(root);

    console.log('');
    console.log(`  ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        process.exit(1);
    }
}

run().catch(e => {
    console.error('Test runner error:', e);
    process.exit(1);
});
