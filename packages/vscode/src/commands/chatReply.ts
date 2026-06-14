import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

let _ctxOut: vscode.OutputChannel | undefined;
function ctxOut(): vscode.OutputChannel {
    if (!_ctxOut) _ctxOut = vscode.window.createOutputChannel('Loom Context');
    return _ctxOut;
}

/**
 * Derive the `📄 …` visibility lines from the SAME serialised bundle the agent
 * receives, so the prompt and the visible record cannot diverge (context
 * pipeline design §5). Parses the provenance headers serializeBundle emits.
 */
function visibilityLinesFromBundle(bundleText: string): string[] {
    const lines: string[] = [];
    for (const line of bundleText.split('\n')) {
        const m = /^### \[(\w+) (\w+)\] (.+?) · id: /.exec(line);
        if (m) {
            const stale = line.includes('⚠️ stale:') ? ' (⚠️ stale)' : '';
            lines.push(`📄 ${m[3]} — loaded for context${stale}`);
            continue;
        }
        const miss = /^### ⚠️ requires_load target missing: (.+)$/.exec(line);
        if (miss) lines.push(`⚠️ requires_load target missing: ${miss[1]}`);
    }
    return lines;
}

export async function chatReplyCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const chatId = node?.doc?.id;
    if (!chatId) { vscode.window.showErrorMessage('Select a chat document in the Loom tree first.'); return; }

    const filePath = (node!.doc as any)._path as string | undefined;
    if (filePath) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
        await doc.save();
    }

    if (await isClaudeInstalled()) {
        // Unified context pipeline: assemble + inject context BEFORE launching the
        // agent, so it never has to grep the project to reconstruct context.
        let contextBlock = '';
        try {
            const bundle = await getMCP(root).readResource(`loom://context/${chatId}?mode=chat`);
            if (bundle && bundle.trim()) {
                contextBlock =
                    `# Loom context (pre-loaded — do NOT grep or re-read these; they are already provided below)\n\n` +
                    `${bundle}\n\n---\n\n`;
                const lines = visibilityLinesFromBundle(bundle);
                if (lines.length) {
                    ctxOut().appendLine(`[chat-reply ${chatId}] injected ${lines.length} context doc(s):`);
                    for (const l of lines) ctxOut().appendLine(`  ${l}`);
                    ctxOut().show(true);
                }
            }
        } catch (e: any) {
            ctxOut().appendLine(`[chat-reply ${chatId}] context pipeline unavailable: ${e?.message ?? e}`);
        }

        const readInstruction = filePath
            ? `The chat document is already included in the Loom context above; you may also read the file at "${filePath}" with the Read tool if needed (not Bash, not loom_find_doc).`
            : `The chat document is already included in the Loom context above.`;
        await launchClaude(root, `Loom: Chat Reply`,
            `${contextBlock}Loom chat reply task. chatId="${chatId}". ${readInstruction} Using the pre-loaded context, write a reply to the last user message, then use MCP tool loom_append_to_chat with id="${chatId}", role="ai", body="<your reply>". The body must be the reply text ONLY — do NOT include a "## AI:" header line; loom_append_to_chat writes the role header itself, so adding your own produces a doubled header. Emit one "📄 <title> — loaded for context" line per context doc above before replying. Do not use loom_generate_chat_reply — sampling is unavailable. Do not invoke CLI commands via Bash.`
        );
    } else {
        try {
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: AI thinking…', cancellable: false },
                async () => { await getMCP(root).callTool('loom_generate_chat_reply', { chatId }); }
            );
            if (filePath) {
                const updated = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(updated, { preview: false, preserveFocus: false });
            }
        } catch (e: any) {
            handleMcpError(e, treeProvider);
        }
    }
}
