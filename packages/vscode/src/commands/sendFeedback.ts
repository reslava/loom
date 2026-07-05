import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';

// The extension is a thin MCP client: it reads loom://feedback-context (which
// resolves the repo, gathers the non-PII snapshot, and builds the prefilled
// URL server-side) and just opens the URL. Nothing is sent from here.

interface FeedbackContext {
    repo: string;
    snapshot: {
        loomVersion: string;
        platform: string;
        weaveCount: number;
        threadCount: number;
        donePlanCount: number;
        currentRelease: string | null;
    };
    url: string;
}

export async function sendFeedbackCommand(): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    try {
        const ctx = JSON.parse(await getMCP(root).readResource('loom://feedback-context')) as FeedbackContext;
        await vscode.env.openExternal(vscode.Uri.parse(ctx.url));
    } catch (e: any) {
        vscode.window.showErrorMessage(`Loom: failed to prepare feedback: ${e.message}`);
    }
}
