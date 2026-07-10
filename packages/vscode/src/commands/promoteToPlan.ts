import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';
import { ensureThreadUlid } from './ensureThreadUlid';

export async function promoteToPlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const sourceId = node?.doc?.id;
    if (!sourceId) { vscode.window.showErrorMessage('Right-click a chat, idea, or design in the tree to promote it.'); return; }

    const toolArgs: Record<string, unknown> = { source_ulid: sourceId, targetType: 'plan' };

    const targetWeaveId = node?.weaveSlug ?? await vscode.window.showInputBox({ prompt: 'Target weave slug', placeHolder: 'e.g., my-feature' });
    if (!targetWeaveId) return;
    toolArgs['target_weave_slug'] = targetWeaveId;

    let targetThreadSlug = node?.threadSlug;
    if (!targetThreadSlug) {
        const input = await vscode.window.showInputBox({ prompt: 'Target thread slug (leave blank for weave-level)', placeHolder: 'e.g., auth-flow' });
        if (input === undefined) return;
        targetThreadSlug = input || undefined;
    }
    // Keep the slug (for the human-readable req.md path in the prompt) AND resolve the ULID
    // (for the tool call), minting the thread manifest for a new thread.
    const targetThreadUlid = targetThreadSlug ? await ensureThreadUlid(root, targetWeaveId, node, targetThreadSlug) : undefined;
    if (targetThreadUlid) toolArgs['target_thread_ulid'] = targetThreadUlid;

    if (await isClaudeInstalled()) {
        const sourceFilePath = (node?.doc as any)?._path as string | undefined;
        const readInstruction = sourceFilePath
            ? `Read the source file at "${sourceFilePath}" using the Read tool (not Bash, not loom_find_doc).`
            : `Use MCP tool loom_find_doc with id="${sourceId}" to get the file path, then read it with the Read tool.`;
        const threadArg = targetThreadUlid ? `, thread_ulid="${targetThreadUlid}"` : '';
        const reqInstruction = targetThreadSlug
            ? `Also read the thread's req.md (at loom/${targetWeaveId}/${targetThreadSlug}/req.md) — its ✅ Included / ❌ Excluded / ⛓ Constraints carry stable IN/EX/C ids. Treat every ❌ Excluded item and ⛓ Constraint as a HARD BOUNDARY (never add excluded work), and ensure every ✅ Included item is advanced by at least one step. `
            : '';
        const satisfiesInstruction = targetThreadSlug
            ? `Set each step's \`satisfies\` array to the IN/C ids that step advances (empty when none; NEVER cite an EX id). `
            : `Leave each step's \`satisfies\` empty (no req in this scope). `;
        await launchClaude(root, `Loom: Promote to Plan`,
            [
                `Loom promote to plan task. source_ulid="${sourceId}", target_weave_slug="${targetWeaveId}"${targetThreadUlid ? `, target_thread_ulid="${targetThreadUlid}"` : ''}.`,
                readInstruction,
                reqInstruction,
                `Then call MCP tool loom_create_plan ONCE with weave_slug="${targetWeaveId}"${threadArg}, a concise title, a \`goal\` (one paragraph), and a structured \`steps\` array — one object per concrete deliverable, in order.`,
                `Each step object: { description, files: [...], blockedBy: [...step ids/plan ids...], satisfies: [...IN/C ids...] }.`,
                satisfiesInstruction,
                `Do NOT pass a Markdown \`content\` body — loom_create_plan owns the Steps table and builds it from the structured steps. Do NOT call loom_update_doc afterwards.`,
                `Do not use loom_promote — sampling is unavailable in Claude Code CLI. Do not invoke CLI commands via Bash.`,
            ].join(' ')
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Promoting to plan…', cancellable: false },
                async () => { result = await getMCP(root).callTool('loom_promote', toolArgs); }
            );
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage(`Plan created from ${sourceId}`);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Promote to plan failed: ${e.message}`);
        }
    }
}
