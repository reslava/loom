import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function weaveCreateCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const weaveId = await vscode.window.showInputBox({
        prompt: 'Weave ID',
        placeHolder: 'e.g., payment-system',
        validateInput: v => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) ? null : 'Use kebab-case (lowercase, hyphens)',
    });
    if (!weaveId) return;

    const weavePath = path.join(workspaceRoot, 'loom', weaveId);
    if (await fs.pathExists(weavePath)) {
        vscode.window.showWarningMessage(`Weave '${weaveId}' already exists.`);
        return;
    }

    await fs.ensureDir(weavePath);
    treeProvider.refresh();
}
