import * as vscode from 'vscode';
import { promoteIdea } from '@reslava-loom/app/dist/promoteIdea';
import { loadDoc, saveDoc } from '@reslava-loom/fs/dist';
import { makeAIClient } from '../ai/makeAIClient';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function promoteIdeaCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor.');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    if (!/-chat(-\d+)?\.md$/.test(filePath)) {
        vscode.window.showErrorMessage('Active file is not a Loom chat document (*-chat.md or *-chat-NNN.md).');
        return;
    }

    await editor.document.save();

    const loomRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!loomRoot) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }

    try {
        const aiClient = makeAIClient();
        let result: { filePath: string; title: string };

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Promoting idea…', cancellable: false },
            async () => {
                const fs = await import('fs-extra');
                result = await promoteIdea(
                    { filePath },
                    { loadDoc, saveDoc, fs, aiClient, loomRoot }
                );
            }
        );

        treeProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(result!.filePath);
        await vscode.window.showTextDocument(doc, { preview: false });
        vscode.window.showInformationMessage(`Idea created: ${result!.title}`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Promote idea failed: ${e.message}`);
    }
}
