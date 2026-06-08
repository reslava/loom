/**
 * Unit test for the CLI in-process MCP client helper (packages/cli/src/mcpClient.ts).
 *
 * Round-trips loom://catalog over the in-memory transport pair and asserts the
 * returned grouped markdown is non-empty and actually grouped — proving the handshake
 * + readResource path works without spawning `loom mcp` or piping JSON by hand.
 *
 * Run from repo root:
 *   npx ts-node --project tests/tsconfig.json tests/cli-mcp-client.test.ts
 */
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { assert } from './test-utils.ts';
import { connectLocalMcp } from '../packages/cli/src/mcpClient.ts';

async function main(): Promise<void> {
    console.log('🧵 Running CLI mcpClient tests...\n');

    // The catalog is built from the live tool registry, so a minimal root with a
    // .loom/ marker is enough — no weave docs required.
    const root = path.join(os.tmpdir(), `loom-cli-mcp-${Date.now()}`);
    await fs.ensureDir(path.join(root, '.loom'));

    const client = await connectLocalMcp(root);
    try {
        console.log('  • Round-tripping loom://catalog...');
        const catalog = await client.readResource('loom://catalog');
        assert(catalog.length > 0, 'catalog markdown should be non-empty');
        assert(catalog.includes('Loom MCP tools'), 'catalog should carry its header');
        assert(catalog.includes('### '), 'catalog should be grouped (has ### group headings)');
        assert(catalog.includes('loom_do_step'), 'catalog should list a known tool');
        console.log('    ✅ readResource(loom://catalog) returns grouped markdown');

        console.log('  • Listing resources...');
        const resources = await client.listResources();
        assert(resources.length > 0, 'listResources should return at least one resource');
        assert(
            resources.some((r) => r.uri === 'loom://catalog'),
            'listResources should include loom://catalog'
        );
        assert(
            resources.every((r) => typeof r.title === 'string' && r.title.length > 0),
            'every resource should have a non-empty title'
        );
        console.log('    ✅ listResources() returns uri + title');
    } finally {
        await client.close();
    }

    await fs.remove(root);

    console.log('\n✅ CLI mcpClient tests passed\n');
}

main().catch((e) => {
    console.error('❌ CLI mcpClient tests failed:', e);
    process.exit(1);
});
