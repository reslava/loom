import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { makeAIClient } from '../ai/makeAIClient';
import { TreeNode } from '../tree/treeProvider';

const SYSTEM_PROMPT = 'You are an AI assistant participating in a Loom design chat. Write a focused, constructive response continuing the conversation.';

export async function chatReplyCommand(node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const chatId = node?.doc?.id;
    if (!chatId) {
        vscode.window.showErrorMessage('Select a chat document in the Loom tree first.');
        return;
    }

    const filePath = (node!.doc as any)._path as string | undefined;
    if (filePath) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
        await doc.save();
    }

    try {
        let reply: string;
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: AI thinking…', cancellable: false },
            async () => {
                const mcp = getMCP(root);
                const chatContent = await mcp.readResource(`loom://docs/${chatId}`);
                const aiClient = makeAIClient();
                reply = await aiClient.complete([
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: chatContent },
                ]);
                await mcp.callTool('loom_append_to_chat', { id: chatId, role: 'AI', body: reply });
            }
        );

        if (filePath) {
            const updated = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(updated, { preview: false, preserveFocus: false });
        }
    } catch (e: any) {
        vscode.window.showErrorMessage(`Chat reply failed: ${e.message}`);
    }
}
