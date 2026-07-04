#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLoomMcpServer } from './server';
import { buildServerTelemetry, startTelemetrySession } from './telemetryConfig';

const pkg = require('../package.json');

const root = process.env['LOOM_ROOT'] ?? process.cwd();
const telemetry = buildServerTelemetry(pkg.version);
startTelemetrySession(telemetry);
const server = createLoomMcpServer(root, telemetry);
const transport = new StdioServerTransport();

server.connect(transport).catch((err: Error) => {
    console.error('Failed to start Loom MCP server:', err.message);
    process.exit(1);
});
