import * as fs from 'fs-extra';
import { installWorkspace } from '../../../app/dist/installWorkspace';
import { ConfigRegistry } from '../../../fs/dist';

export const toolDef = {
    name: 'loom_install',
    description:
        "Install or upgrade Loom into the workspace at LOOM_ROOT: creates .loom/, writes .loom/CLAUDE.md, creates CLAUDE-LOCAL.md once, patches the root CLAUDE.md to import both, and writes .mcp.json, loom/ctx.md, and settings. Idempotent — pass force to overwrite the regenerable files (.mcp.json, ctx, settings) when they already exist. Returns which files were created vs. skipped. This is the in-process equivalent of the `loom install` CLI command, so the VS Code extension can initialise a workspace through MCP instead of shelling out to a terminal.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            force: { type: 'boolean', description: 'Overwrite regenerable files (.mcp.json, ctx, settings) that already exist.' },
            migrate_mcp_command: { type: 'boolean', description: 'Migrate a legacy command:"loom" server in an existing .mcp.json to the canonical npx pin (semantic change — pass only after user consent).' },
        },
        required: [],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const registry = new ConfigRegistry();
    const result = await installWorkspace(
        { force: args['force'] as boolean | undefined, migrateMcpCommand: args['migrate_mcp_command'] as boolean | undefined },
        { fs, registry, cwd: root },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
