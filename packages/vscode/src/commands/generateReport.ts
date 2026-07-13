import * as vscode from 'vscode';
import { reportKindSlugs, getReportKind } from '@reslava-loom/core/dist/reportKinds';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { isClaudeInstalled, launchClaude, funnelAiSetup } from './claudeTerminal';

/**
 * Generate a report: pick a kind (+ optional weave/thread filters) and launch a Claude
 * agent that drives the `report` MCP prompt to assemble the slice, synthesize the
 * report, and persist it via `loom_create_report`. Mirrors the launchClaude pattern of
 * the other AI actions. The agent writes asynchronously in a terminal, so we can't hook
 * its completion — offer a Refresh action to reveal the report once it lands.
 *
 * `node` is the Reports node the button was clicked on (undefined from the palette). A
 * weave-scoped Reports subsection carries its weave slug; the cross-weave node carries
 * the 'reports' sentinel (treated as no weave filter).
 */
export async function generateReportCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    // Kind — from the canonical registry so the picker never drifts from the prompt.
    const kindItems: vscode.QuickPickItem[] = reportKindSlugs().map(slug => ({
        label: slug,
        description: getReportKind(slug)?.title ?? '',
    }));
    const kindPick = await vscode.window.showQuickPick(kindItems, {
        title: 'Generate report — pick a kind',
        placeHolder: 'Report kind',
    });
    if (!kindPick) return;
    const kind = kindPick.label;

    // Optional weave scope. Default to the clicked weave-scoped node's weave (the
    // 'reports' sentinel on the cross-weave node means "no weave filter").
    const defaultWeave = node?.weaveSlug && node.weaveSlug !== 'reports' ? node.weaveSlug : '';
    const weaveSlug = (await vscode.window.showInputBox({
        title: 'Generate report — weave filter (optional)',
        prompt: 'Weave slug to scope the report — leave blank for a cross-weave report',
        value: defaultWeave,
    }))?.trim() || undefined;

    // Thread filter only makes sense within a weave.
    const threadSlug = weaveSlug
        ? ((await vscode.window.showInputBox({
            title: 'Generate report — thread filter (optional)',
            prompt: 'Thread slug to further scope the report — leave blank for the whole weave',
        }))?.trim() || undefined)
        : undefined;

    if (!(await isClaudeInstalled())) { await funnelAiSetup(); return; }

    const argLine = [
        `kind="${kind}"`,
        weaveSlug ? `weaveSlug="${weaveSlug}"` : undefined,
        threadSlug ? `threadSlug="${threadSlug}"` : undefined,
    ].filter(Boolean).join(', ');

    const prompt = [
        'Loom generate-report task. Use the loom MCP server.',
        '',
        `1. Call the "report" MCP prompt with: ${argLine}.`,
        '2. Follow its returned instruction: read ONLY the assembled slice it gives you and',
        `   synthesize a clean, visually-scannable ${kind} report as markdown. State coverage`,
        '   honestly if the slice notes it was budget-degraded.',
        `3. Persist it by calling loom_create_report exactly as the prompt instructs: kind="${kind}",`,
        '   a concise date-less title, the full report content, ' +
            (weaveSlug ? `weave_slug="${weaveSlug}",` : '(omit weave_slug — cross-weave report),') + ' and sources.',
        '',
        'Do NOT hand-write or directly edit report files — loom_create_report is the only write',
        'path. Do NOT call loom_generate_* — sampling is unavailable in the Claude Code CLI.',
    ].join('\n');

    await launchClaude(root, 'Loom: Generate Report', prompt);

    // The agent runs asynchronously in the terminal; we can't hook its completion, so
    // give the user a one-click Refresh to reveal the report once it's saved.
    vscode.window.showInformationMessage(
        `Generating a ${kind} report in the Loom AI terminal — click Refresh once it's saved.`,
        'Refresh',
    ).then(pick => { if (pick === 'Refresh') treeProvider.refresh(); });
}
