const esbuild = require('esbuild');

const isProduction = process.argv.includes('--production');

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/index.js',
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    sourcemap: !isProduction,
    minify: false,
    logLevel: 'info',
    // Bundle the workspace packages (app/core/fs/mcp, imported by relative path) and
    // third-party deps into one binary. The MCP SDK is kept external — it uses ajv,
    // whose generated validators do dynamic requires esbuild can't inline — and is
    // declared as a real runtime dependency so npm installs it with its correct tree.
    external: ['@modelcontextprotocol/sdk'],
    banner: { js: '#!/usr/bin/env node' },
    // Bake the PostHog project key (public, write-only) into the shipped bundle at
    // release time. Unset at build ⇒ '' ⇒ telemetry can never send (Noop), so a
    // key-less build is safe. Set LOOM_POSTHOG_KEY in the release environment.
    define: {
        'process.env.LOOM_POSTHOG_KEY': JSON.stringify(process.env.LOOM_POSTHOG_KEY || ''),
    },
};

esbuild.build(options).catch(() => process.exit(1));
