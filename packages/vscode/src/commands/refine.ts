import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { ContextSidebarProvider } from '../providers/contextSidebarProvider';

export async function refineCommand(treeProvider: LoomTreeProvider, node?: TreeNode, contextSidebar?: ContextSidebarProvider): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const id = node?.doc?.id;
    if (!id) {
        vscode.window.showErrorMessage('Right-click a design in the tree to refine it.');
        return;
    }

    try {
        let result: any;
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Refining design…', cancellable: false },
            async () => {
                const contextIds = contextSidebar?.getSelectedIds() ?? [];
                result = await getMCP(root).callTool('loom_refine_design', { id, ...(contextIds.length > 0 ? { context_ids: contextIds } : {}) });
            }
        );
        treeProvider.refresh();
        if (result?.filePath) {
            const doc = await vscode.workspace.openTextDocument(result.filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
        vscode.window.showInformationMessage(`Design refined (v${result?.version})`);
    } catch (e: any) {
        handleMcpError(e, treeProvider);
    }
}
