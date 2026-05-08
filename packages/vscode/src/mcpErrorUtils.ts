import * as vscode from 'vscode';
import { disposeMCP } from './mcp-client';
import { LoomTreeProvider } from './tree/treeProvider';

export function isMcpTimeout(e: unknown): boolean {
    const msg = (e as any)?.message;
    return typeof msg === 'string' && (msg.includes('32001') || msg.includes('timed out'));
}

export function handleMcpError(e: unknown, treeProvider: LoomTreeProvider): never {
    if (isMcpTimeout(e)) {
        disposeMCP();
        treeProvider.refresh();
        vscode.window.showErrorMessage('MCP timed out — reconnecting…');
    }
    throw e;
}
