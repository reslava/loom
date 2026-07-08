import { assert } from './test-utils.ts';
import { buildAgentMcpConfig } from '../packages/vscode/src/agentMcpConfig.ts';

// Pure builder — no VS Code runtime, imported straight from source (ts-node
// transpileOnly). Mirrors what launchClaude writes to the agent's --mcp-config.
const spec = {
    command: '/path/to/electron',
    args: ['/ext/dist/loom-mcp.js'],
    env: { ELECTRON_RUN_AS_NODE: '1', LOOM_ROOT: '/ws' },
};

async function run() {
    console.log('🧩 Running agent-mcp-config tests...\n');

    // ── case (a): loom-only ───────────────────────────────────────────────────
    console.log('  • loom-only config carries exactly the bundled loom server...');
    {
        const cfg = JSON.parse(buildAgentMcpConfig(spec));
        assert(Object.keys(cfg.mcpServers).length === 1, 'loom-only: exactly one server');
        assert(cfg.mcpServers.loom.type === 'stdio', 'loom server is stdio');
        assert(cfg.mcpServers.loom.command === spec.command, 'loom command comes from the spec');
        assert(cfg.mcpServers.loom.args[0] === spec.args[0], 'loom args come from the spec (the bundle)');
        assert(cfg.mcpServers.loom.env.LOOM_ROOT === '/ws', 'loom env comes from the spec');
        console.log('    ✅ loom-only config correct');
    }

    // ── case (c): merge the user's other servers; bundled loom wins ────────────
    console.log('  • merge preserves other servers and the bundled loom overrides the user loom...');
    {
        const cfg = JSON.parse(buildAgentMcpConfig(spec, {
            git: { command: 'git-mcp', args: ['serve'] },
            loom: { command: 'loom', args: ['mcp'] }, // stale user entry — must be overridden
        }));
        assert(Object.keys(cfg.mcpServers).length === 2, 'merged: exactly git + loom (user loom folded away)');
        assert(!!cfg.mcpServers.git && cfg.mcpServers.git.command === 'git-mcp', 'user git server preserved verbatim');
        assert(cfg.mcpServers.loom.command === spec.command, 'bundled loom wins the loom key (not the user command)');
        assert(cfg.mcpServers.loom.args[0] === spec.args[0], 'loom points at the bundle, not the user value');
        console.log('    ✅ merge preserves others, bundled loom wins');
    }

    console.log('\n✨ All agent-mcp-config tests passed!\n');
}

run().catch((err) => {
    console.error('❌ agent-mcp-config.test.ts failed:', err.message);
    process.exit(1);
});
