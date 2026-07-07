const esbuild = require('esbuild');

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: [
        { in: 'src/extension.ts', out: 'extension' },
        // Standalone Loom MCP server bundled into the VSIX (dist/loom-mcp.js).
        // The extension spawns this on VS Code's own Electron-as-Node, so a
        // working MCP server ships with the extension — no global `loom` CLI.
        // Unlike the CLI (which keeps the SDK external), this must inline every
        // dependency: the VSIX is packaged with --no-dependencies, so nothing
        // in node_modules is shipped alongside it.
        { in: 'src/loom-mcp-entry.ts', out: 'loom-mcp' },
    ],
    bundle: true,
    outdir: 'dist',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    sourcemap: !isProduction,
    minify: isProduction,
    logLevel: 'info',
    // Bake the PostHog project key (public, write-only) into the bundled MCP
    // server at release time, mirroring packages/cli/esbuild.js. Unset ⇒ '' ⇒
    // telemetry is structurally Noop, so a key-less build is safe. Set
    // LOOM_POSTHOG_KEY in the packaging environment (see release.yml). Consent
    // still gates emission independently — a baked key never sends on its own.
    define: {
        'process.env.LOOM_POSTHOG_KEY': JSON.stringify(process.env.LOOM_POSTHOG_KEY || ''),
    },
};

if (isWatch) {
    esbuild.context(options).then(ctx => {
        ctx.watch();
        console.log('watching...');
    });
} else {
    esbuild.build(options).catch(() => process.exit(1));
}
