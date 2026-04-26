#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLoomMcpServer } from './server';

const root = process.env['LOOM_ROOT'] ?? process.cwd();
const server = createLoomMcpServer(root);
const transport = new StdioServerTransport();

server.connect(transport).catch((err: Error) => {
    console.error('Failed to start Loom MCP server:', err.message);
    process.exit(1);
});
