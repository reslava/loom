import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';

// The extension is a thin MCP client: it reads loom://feedback-context (which
// resolves the repo, gathers the non-PII snapshot, and builds the prefilled
// URL server-side) and just opens the URL. Nothing is sent from here.

interface FeedbackContext {
    repo: string | null;
    snapshot: {
        loomVersion: string;
        platform: string;
        weaveCount: number;
        threadCount: number;
        donePlanCount: number;
        currentRelease: string | null;
    };
    url: string | null;
}

export async function sendFeedbackCommand(): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    // The setting is the config-override branch of repo resolution; pass it to the
    // resource so the server does the URL building (single source of truth).
    const override = vscode.workspace.getConfiguration('reslava-loom').get<string>('feedback.repo')?.trim();
    const uri = override
        ? `loom://feedback-context?repo=${encodeURIComponent(override)}`
        : 'loom://feedback-context';

    try {
        const ctx = JSON.parse(await getMCP(root).readResource(uri)) as FeedbackContext;
        if (!ctx.url) {
            const pick = await vscode.window.showWarningMessage(
                'Loom: no target repo for feedback. Set "reslava-loom.feedback.repo", or add a GitHub origin remote.',
                'Open Settings',
            );
            if (pick === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'reslava-loom.feedback.repo');
            }
            return;
        }
        await vscode.env.openExternal(vscode.Uri.parse(ctx.url));
    } catch (e: any) {
        vscode.window.showErrorMessage(`Loom: failed to prepare feedback: ${e.message}`);
    }
}
