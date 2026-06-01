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
};

esbuild.build(options).catch(() => process.exit(1));
