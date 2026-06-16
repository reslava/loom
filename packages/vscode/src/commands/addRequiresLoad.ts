import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { TreeNode } from '../tree/treeProvider';

interface RefEntry {
    id: string;
    title: string;
    file: string;
}

export async function addRequiresLoadCommand(node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const docId = node?.doc?.id;
    if (!docId) { vscode.window.showErrorMessage('Select an idea, design, or plan first.'); return; }

    let refs: RefEntry[];
    try {
        const raw = await getMCP(root).readResource('loom://refs');
        refs = (JSON.parse(raw).refs ?? []) as RefEntry[];
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to load references: ${e.message}`);
        return;
    }

    if (refs.length === 0) {
        vscode.window.showInformationMessage('No reference docs found in loom/refs/.');
        return;
    }

    const items: vscode.QuickPickItem[] = refs.map(r => ({
        label: r.title,
        description: r.file,
        detail: r.id,
    }));

    const currentRequiresLoad: string[] = (node?.doc as any)?.requires_load ?? [];
    const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Select references to add to requires_load',
    });

    if (!selected?.length) return;

    const selectedIds = selected.map(s => s.detail ?? '').filter(Boolean);
    const merged = [...new Set([...currentRequiresLoad, ...selectedIds])];

    try {
        await getMCP(root).callTool('loom_update_doc', { id: docId, requires_load: merged });
        vscode.window.showInformationMessage(`Added ${selectedIds.length} reference(s) to requires_load.`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to update requires_load: ${e.message}`);
    }
}
