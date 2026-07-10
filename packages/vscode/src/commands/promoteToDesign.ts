import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';
import { ensureThreadUlid } from './ensureThreadUlid';

export async function promoteToDesignCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const sourceId = node?.doc?.id;
    if (!sourceId) { vscode.window.showErrorMessage('Right-click a chat, idea, or doc in the tree to promote it.'); return; }

    const toolArgs: Record<string, unknown> = { source_ulid: sourceId, targetType: 'design' };

    const targetWeaveId = node?.weaveSlug ?? await vscode.window.showInputBox({ prompt: 'Target weave slug', placeHolder: 'e.g., my-feature' });
    if (!targetWeaveId) return;
    toolArgs['target_weave_slug'] = targetWeaveId;

    let targetThreadSlug = node?.threadSlug;
    if (!targetThreadSlug) {
        const input = await vscode.window.showInputBox({ prompt: 'Target thread slug (leave blank for weave-level)', placeHolder: 'e.g., auth-flow' });
        if (input === undefined) return;
        targetThreadSlug = input || undefined;
    }
    const targetThreadUlid = targetThreadSlug ? await ensureThreadUlid(root, targetWeaveId, node, targetThreadSlug) : undefined;
    if (targetThreadUlid) toolArgs['target_thread_ulid'] = targetThreadUlid;

    if (await isClaudeInstalled()) {
        const sourceFilePath = (node?.doc as any)?._path as string | undefined;
        const readInstruction = sourceFilePath
            ? `Read the source file at "${sourceFilePath}" using the Read tool (not Bash, not loom_find_doc).`
            : `Use MCP tool loom_find_doc with id="${sourceId}" to get the file path, then read it with the Read tool.`;
        await launchClaude(root, `Loom: Promote to Design`,
            `Loom promote to design task. source_ulid="${sourceId}", target_weave_slug="${targetWeaveId}"${targetThreadUlid ? `, target_thread_ulid="${targetThreadUlid}"` : ''}. ${readInstruction} Then call MCP tool loom_create_design ONCE with weave_slug="${targetWeaveId}"${targetThreadUlid ? `, thread_ulid="${targetThreadUlid}"` : ''}, a concise title, and content (the full design body derived from the source). Do NOT call loom_update_doc afterwards — pass the body in the content argument of loom_create_design, in the same single call. Do not use loom_promote — sampling is unavailable in Claude Code CLI. Do not invoke CLI commands via Bash.`
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Promoting to design…', cancellable: false },
                async () => { result = await getMCP(root).callTool('loom_promote', toolArgs); }
            );
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage(`Design created from ${sourceId}`);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Promote to design failed: ${e.message}`);
        }
    }
}
