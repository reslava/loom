import * as path from 'path';
import * as fs from 'fs-extra';
import { runLoom, assert, setupHermeticLoom } from './test-utils.ts';

// Tri-surface parity guard (cli-management-command-parity, Plan B): every loom_* MCP
// tool must EITHER have a mirroring CLI command OR be a documented single-audience
// exception. A newly registered tool that is neither mapped nor excepted fails this
// test — forcing the author to add a CLI twin or record why it's single-surface.
//
// The tool list comes from the live registry (`loom catalog tools`); the CLI verb
// inventory is scanned from the CLI's own command registrations. Nothing is hand-listed
// that could silently rot.

// Tools that are single-surface BY CONSUMER — no CLI twin, each with its reason.
const EXCEPTIONS: Record<string, string> = {
    // Agent-only workflow tools (an agent drives these mid-loop; a human never types them).
    loom_do_step: 'agent-only workflow',
    loom_read_chat_tail: 'agent-only workflow',
    loom_append_to_chat: 'agent-only workflow',
    loom_append_done: 'agent-only workflow',
    loom_patch_doc: 'agent-only doc-body edit',
    loom_update_doc: 'agent-only doc-body edit',
    // The agent persists a synthesized report via this tool; humans use `loom report`
    // (the brief-returning shim), which does not create — so no CLI twin.
    loom_create_report: 'agent-only report persist (human uses `loom report`)',
    // Plan-step authoring (agent/extension compose steps; not a way-③ tree op).
    loom_add_step: 'plan-step authoring (agent/extension)',
    loom_remove_step: 'plan-step authoring (agent/extension)',
    loom_update_step: 'plan-step authoring (agent/extension)',
    loom_reorder_steps: 'plan-step authoring (agent/extension)',
    loom_list_plan_steps: 'plan-step read (agent/extension)',
    // AI sampling — the CLI has no sampling path, so these have no terminal twin by design.
    loom_refine_idea: 'AI sampling (no CLI sampling)',
    loom_refine_design: 'AI sampling (no CLI sampling)',
    loom_refine_plan: 'AI sampling (no CLI sampling)',
    loom_generate_idea: 'AI sampling (no CLI sampling)',
    loom_generate_design: 'AI sampling (no CLI sampling)',
    loom_generate_plan: 'AI sampling (no CLI sampling)',
    loom_generate_req: 'AI sampling (no CLI sampling)',
    loom_generate_reference: 'AI sampling (no CLI sampling)',
    loom_generate_chat_reply: 'AI sampling (no CLI sampling)',
    // Req lifecycle — agent/extension authoring; not identified as a way-③ gap in this thread.
    loom_amend_req: 'req lifecycle authoring (not a way-③ gap here)',
    loom_finalize_req: 'req lifecycle authoring (not a way-③ gap here)',
    loom_verify_req: 'req verification (agent/extension)',
    // Context UX — extension sidebar / agent context prefs, no terminal surface.
    loom_get_context_prefs: 'context UX (extension/agent)',
    loom_set_context_prefs: 'context UX (extension/agent)',
    // Onboarding seed — a setup single-surface op (the extension/agent seeds the example).
    loom_seed_example: 'onboarding seed (setup, single-surface)',
    // id→path resolver — the CLI resolves via resolve-ulid / resolve-path / search instead.
    loom_find_doc: 'id→path resolver (CLI uses resolve-ulid/resolve-path/search)',
};

// Tool → the CLI verb (first token of a `loom <verb> …` command) that mirrors it.
// Namespace tools (create/rename) map to their subcommand token under the namespace.
const MAPPING: Record<string, string> = {
    loom_create_idea: 'idea', loom_create_design: 'design', loom_create_plan: 'plan',
    loom_create_req: 'req', loom_create_reference: 'reference', loom_create_chat: 'chat',
    loom_create_weave: 'weave', loom_create_thread: 'thread',
    loom_rename_thread: 'thread', loom_rename_weave: 'weave', loom_rename_reference_file: 'reference',
    loom_retitle: 'retitle',
    loom_archive: 'archive', loom_restore: 'restore', loom_delete: 'delete',
    loom_move_thread: 'move-thread', loom_set_priority: 'set-priority', loom_set_thread_deps: 'set-thread-deps',
    loom_close_plan: 'close-plan', loom_quick_ship: 'quick-ship', loom_promote: 'promote',
    loom_set_status: 'set-status', loom_start_plan: 'start-plan', loom_complete_step: 'complete-step',
    loom_record_release: 'record-release', loom_install: 'install', loom_validate: 'validate',
    loom_search_docs: 'search', loom_get_blocked_steps: 'blocked',
    loom_get_stale_docs: 'stale', loom_get_stale_plans: 'stale',
    loom_refresh_ctx: 'refresh-ctx',
};

async function run() {
    console.log('🔗 Running CLI⇄MCP parity tests...\n');
    const loomRoot = await setupHermeticLoom('loom-parity-tests');

    // 1. Live tool names from the registry (via the in-process server the CLI bundles).
    const catalog = runLoom('catalog tools', loomRoot);
    assert(catalog.exitCode === 0, `catalog tools failed: ${catalog.stderr}`);
    const toolNames = [...new Set([...catalog.stdout.matchAll(/`(loom_[a-z_]+)`/g)].map(m => m[1]))].sort();
    assert(toolNames.length > 20, `expected a populated tool surface, got ${toolNames.length}`);
    console.log(`  • ${toolNames.length} loom_* tools in the live registry`);

    // 2. CLI verb inventory, scanned from the CLI's own command registrations (no execution).
    const indexSrc = await fs.readFile(path.join(__dirname, '..', 'packages', 'cli', 'src', 'index.ts'), 'utf8');
    const cliVerbs = new Set([...indexSrc.matchAll(/\.command\('([^']+)'/g)].map(m => m[1].split(/\s+/)[0]));
    console.log(`  • ${cliVerbs.size} CLI command verbs registered`);

    // 3. Every tool is classified: a mapped twin, or a documented exception. A new tool
    //    that is neither fails here — the whole point of the guard.
    const unclassified = toolNames.filter(t => !(t in MAPPING) && !(t in EXCEPTIONS));
    assert(
        unclassified.length === 0,
        `These loom_* tools are neither mapped to a CLI twin nor listed as single-audience exceptions:\n` +
        `  ${unclassified.join(', ')}\n` +
        `Add a CLI command (+ a MAPPING entry) or add an EXCEPTIONS entry with a reason.`,
    );
    console.log('  ✅ every tool is classified (twin or documented exception)');

    // 4. Every mapped twin actually exists as a CLI command.
    const missingTwins = Object.entries(MAPPING).filter(([, verb]) => !cliVerbs.has(verb));
    assert(
        missingTwins.length === 0,
        `These tools map to a CLI verb that isn't registered:\n` +
        missingTwins.map(([tool, verb]) => `  ${tool} → \`loom ${verb}\` (missing)`).join('\n'),
    );
    console.log('  ✅ every mapped CLI twin is registered');

    // 5. Sanity: the retitle/rename reconciliation landed — `rename` is a namespace, and
    //    the old title-under-`rename` verb is gone in favour of `retitle`.
    assert(cliVerbs.has('retitle'), '`loom retitle` must exist (the title-change verb)');
    assert(cliVerbs.has('rename'), '`loom rename` namespace must exist (folder/file slug renames)');

    await fs.remove(loomRoot);
    console.log('\n✨ All CLI⇄MCP parity tests passed!\n');
}

run().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});
