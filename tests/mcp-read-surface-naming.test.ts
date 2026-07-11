import { assert } from './test-utils.ts';
import * as fs from 'fs-extra';
import { getState } from '../packages/app/dist';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, ConfigRegistry } from '../packages/fs/dist';
import { handleContextResource } from '../packages/mcp/dist/resources/context';
import { RESOURCE_TEMPLATES } from '../packages/mcp/dist/server';
import { promptDef as continueThread } from '../packages/mcp/dist/prompts/continueThread';
import { promptDef as doNextStep } from '../packages/mcp/dist/prompts/doNextStep';
import { promptDef as refineDesign } from '../packages/mcp/dist/prompts/refineDesign';
import { promptDef as generateIdea } from '../packages/mcp/dist/prompts/generateIdea';
import { promptDef as generateDesign } from '../packages/mcp/dist/prompts/generateDesign';
import { promptDef as generatePlan } from '../packages/mcp/dist/prompts/generatePlan';

/**
 * mcp-read-surface-naming: the MCP read surface speaks the Slug/Ulid contract.
 *  - Guard: no resource-template placeholder and no prompt-arg name carries the `*Id` token.
 *  - Regression: the slug thread form resolves AND the context-bundle manifest header
 *    carries the resolved `weave_slug` + `thread_ulid` (so a following write needs no lookup).
 */
async function run() {
    console.log('🔁 MCP read-surface naming (Slug/Ulid contract)...\n');
    const root = process.cwd();

    // ── Guard: no *Id / {id} placeholder in any resource template ──
    console.log('  • no *Id placeholder in resource templates...');
    for (const rt of RESOURCE_TEMPLATES as Array<{ uriTemplate: string }>) {
        assert(
            !/\{[A-Za-z]*Id\}/.test(rt.uriTemplate) && !/\{id\}/.test(rt.uriTemplate),
            `resource template must not use an *Id / {id} placeholder: ${rt.uriTemplate}`,
        );
    }
    console.log(`    ✅ ${RESOURCE_TEMPLATES.length} templates clean`);

    // ── Guard: no *Id prompt-arg name ──
    console.log('  • no *Id prompt-arg names...');
    const prompts = [continueThread, doNextStep, refineDesign, generateIdea, generateDesign, generatePlan] as Array<{
        name: string;
        arguments?: Array<{ name: string }>;
    }>;
    for (const p of prompts) {
        for (const a of p.arguments ?? []) {
            assert(!/Id$/.test(a.name), `prompt arg must not be named *Id: ${p.name}.${a.name}`);
        }
    }
    console.log(`    ✅ ${prompts.length} prompts clean`);

    // ── Regression: slug thread form resolves + manifest carries the thread address ──
    console.log('  • slug thread form + manifest thread address...');
    const registry = new ConfigRegistry();
    const state = await getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root });
    let weaveSlug: string | undefined, threadSlug: string | undefined, threadUlid: string | undefined;
    for (const w of state.weaves) {
        for (const t of w.threads) {
            if (t.manifest?.id) {
                weaveSlug = w.id;
                threadSlug = t.id;
                threadUlid = t.manifest.id;
                break;
            }
        }
        if (threadUlid) break;
    }
    assert(!!threadUlid, 'expected at least one thread with a manifest (th_ ULID) to exercise the slug form');

    const res = await handleContextResource(root, `loom://context/thread/${weaveSlug}/${threadSlug}?mode=chat`);
    const header = res.contents[0].text.split('\n')[0];
    assert(header.includes(`thread_ulid=${threadUlid}`), `manifest header must carry thread_ulid; got: ${header}`);
    assert(header.includes(`weave_slug=${weaveSlug}`), `manifest header must carry weave_slug; got: ${header}`);
    console.log(`    ✅ ${weaveSlug}/${threadSlug} → manifest carries weave_slug + thread_ulid`);

    console.log('\n✅ MCP read-surface naming passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
