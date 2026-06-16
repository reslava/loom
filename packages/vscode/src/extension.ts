import * as vscode from 'vscode';
import * as path from 'path';
// Carve-out (see tests/vscode-no-fs-imports.test.ts): activation/bootstrap probes
// .loom/ config to decide whether to light up — this runs before the MCP client
// exists, so it cannot go through it. Reads .loom/ config, never loom/ docs.
import * as fs from 'fs';
import { execSync } from 'child_process';
import { LoomTreeProvider, TreeNode } from './tree/treeProvider';
import { RoadmapDragAndDropController } from './tree/roadmapDnd';
import { ViewStateManager } from './view/viewStateManager';
import { weaveIdeaCommand } from './commands/weaveIdea';
import { weaveDesignCommand } from './commands/weaveDesign';
import { weavePlanCommand } from './commands/weavePlan';
import { finalizeCommand } from './commands/finalize';
import { generateReqCommand, finalizeReqCommand, amendReqCommand, verifyReqCommand } from './commands/req';
import { renameCommand } from './commands/rename';
import { refineCommand } from './commands/refine';
import { startPlanCommand } from './commands/startPlan';
import { completeStepCommand } from './commands/completeStep';
import { validateCommand } from './commands/validate';
import { showGroupingSelector } from './commands/grouping';
import { setTextFilter, toggleArchived, setStatusFilter, statusFilterLabel } from './commands/filter';
import { chatNewCommand } from './commands/chatNew';
import { chatReplyCommand } from './commands/chatReply';
import { weaveCreateCommand } from './commands/weaveCreate';
import { threadCreateCommand } from './commands/threadCreate';
import { deleteItemCommand } from './commands/deleteItem';
import { archiveItemCommand } from './commands/archiveItem';
import { promoteToIdeaCommand } from './commands/promoteToIdea';
import { promoteToDesignCommand } from './commands/promoteToDesign';
import { promoteToPlanCommand } from './commands/promoteToPlan';
import { promoteToReferenceCommand } from './commands/promoteToReference';
import { refineIdeaCommand } from './commands/refineIdea';
import { refinePlanCommand } from './commands/refinePlan';
import { doStepCommand } from './commands/doStep';
import { closePlanCommand } from './commands/closePlan';
import { markDoneCommand, markActiveCommand } from './commands/markStatus';
import { restoreItemCommand } from './commands/restoreItem';
import { createReferenceCommand } from './commands/createReference';
import { addRequiresLoadCommand } from './commands/addRequiresLoad';
import { setIconBaseUri } from './icons';
import { disposeMCP, getMCP, getMCPConnected } from './mcp-client';
import { handleMcpError } from './mcpErrorUtils';
import { isClaudeInstalled, launchClaude } from './commands/claudeTerminal';
import { TokenEstimatorService } from './services/tokenEstimatorService';
import { ContextSidebarProvider } from './providers/contextSidebarProvider';

import { updateDiagnostics } from './diagnostics';

export interface LoomExtensionAPI {
    treeProvider: LoomTreeProvider;
    getAiEnabled: () => boolean;
}

export function activate(context: vscode.ExtensionContext): LoomExtensionAPI {
    console.log('🧵 Loom extension activated');

    // Initialize icon base URI for custom icons
     setIconBaseUri(context.extensionUri);

    const viewStateManager = new ViewStateManager(context.workspaceState);
    vscode.commands.executeCommand('setContext', 'loom.showArchived', viewStateManager.getState().showArchived);
    vscode.commands.executeCommand('setContext', 'loom.syncDocToTreeEnabled', viewStateManager.getState().syncDocToTreeEnabled);
    vscode.commands.executeCommand('setContext', 'loom.roadmapEnabled', viewStateManager.getState().roadmapEnabled);
    vscode.commands.executeCommand('setContext', 'loom.groupHistoryByThread', viewStateManager.getState().groupHistoryByThread);
    const treeProvider = new LoomTreeProvider(viewStateManager);
    const tokenEstimator = new TokenEstimatorService();
    const contextSidebar = new ContextSidebarProvider(treeProvider, tokenEstimator);

    const treeView = vscode.window.createTreeView('loom.threads', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
        dragAndDropController: new RoadmapDragAndDropController(treeProvider, viewStateManager),
    });
    context.subscriptions.push(treeView);

    const contextView = vscode.window.createTreeView('loom.context', {
        treeDataProvider: contextSidebar,
        showCollapseAll: false,
    });
    context.subscriptions.push(contextView);

    function updateViewTitle(): void {
        const vs = viewStateManager.getState();
        treeView.title = vs.roadmapEnabled
            ? `Roadmap${vs.roadmapBand !== 'all' ? ` · ${vs.roadmapBand}` : ''}`
            : statusFilterLabel(vs.statusFilter);
    }
    updateViewTitle();

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('loom');
    context.subscriptions.push(diagnosticCollection);

    function syncAndRefresh(): void {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        treeProvider.setWorkspaceRoot(root);
        treeProvider.refresh();
        if (root) updateDiagnostics(diagnosticCollection, root);
    }

    context.subscriptions.push(
        treeView.onDidChangeSelection(e => {
            const node = e.selection[0] as TreeNode | undefined;
            vscode.commands.executeCommand('setContext', 'loom.selectedWeaveId', node?.weaveId ?? '');
            contextSidebar.onSelectionChanged(node);
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (!editor) return;
            if (!viewStateManager.getState().syncDocToTreeEnabled) return;
            const filePath = editor.document.uri.fsPath;
            const node = treeProvider.getNodeByFilePath(filePath);
            if (node) {
                treeView.reveal(node, { select: true, focus: false, expand: true });
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('loom.context.exclude', (item: any) => {
            const id = item?.row?.id;
            if (id) contextSidebar.exclude(id);
        }),
        vscode.commands.registerCommand('loom.context.include', (item: any) => {
            const id = item?.row?.id;
            if (id) contextSidebar.include(id);
        }),
        vscode.commands.registerCommand('loom.context.reset', (item: any) => {
            const id = item?.row?.id;
            if (id) contextSidebar.reset(id);
        }),
        vscode.commands.registerCommand('loom.context.openDoc', (id: string) => {
            contextSidebar.openDoc(id);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('loom.refresh', syncAndRefresh),
        vscode.commands.registerCommand('loom.reconnectMcp', () => { disposeMCP(); syncAndRefresh(); }),
        vscode.commands.registerCommand('loom.weaveCreate', () => weaveCreateCommand(treeProvider, treeView)),
        vscode.commands.registerCommand('loom.threadCreate', (node?: TreeNode) => threadCreateCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.weaveIdea', (node?: TreeNode) => weaveIdeaCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.weaveDesign', (node?: TreeNode) => weaveDesignCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.weavePlan', (node?: TreeNode) => weavePlanCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.finalize', (node?: TreeNode) => finalizeCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.generateReq', (node?: TreeNode) => generateReqCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.finalizeReq', (node?: TreeNode) => finalizeReqCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.amendReq', (node?: TreeNode) => amendReqCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.verifyReq', (node?: TreeNode) => verifyReqCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.rename', (node?: TreeNode) => renameCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.refineDesign', (node?: TreeNode) => refineCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.startPlan', (node?: TreeNode) => startPlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.completeStep', (node?: TreeNode) => completeStepCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.validate', () => validateCommand(treeProvider)),
        vscode.commands.registerCommand('loom.setGrouping', () => showGroupingSelector(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.setTextFilter', () => setTextFilter(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.setStatusFilter', () => setStatusFilter(viewStateManager, treeProvider, updateViewTitle)),
        vscode.commands.registerCommand('loom.toggleArchived', () => toggleArchived(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.toggleArchivedOff', () => toggleArchived(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.toggleSyncDocToTree', () => {
            const enabled = !viewStateManager.getState().syncDocToTreeEnabled;
            viewStateManager.update({ syncDocToTreeEnabled: enabled });
            vscode.commands.executeCommand('setContext', 'loom.syncDocToTreeEnabled', enabled);
        }),
        vscode.commands.registerCommand('loom.toggleSyncDocToTreeOff', () => {
            const enabled = !viewStateManager.getState().syncDocToTreeEnabled;
            viewStateManager.update({ syncDocToTreeEnabled: enabled });
            vscode.commands.executeCommand('setContext', 'loom.syncDocToTreeEnabled', enabled);
        }),
        ...((): vscode.Disposable[] => {
            const toggleRoadmap = () => {
                const enabled = !viewStateManager.getState().roadmapEnabled;
                viewStateManager.update({ roadmapEnabled: enabled });
                vscode.commands.executeCommand('setContext', 'loom.roadmapEnabled', enabled);
                updateViewTitle();
                treeProvider.refresh();
            };
            const toggleGroupHistory = () => {
                const on = !viewStateManager.getState().groupHistoryByThread;
                viewStateManager.update({ groupHistoryByThread: on });
                vscode.commands.executeCommand('setContext', 'loom.groupHistoryByThread', on);
                treeProvider.refresh();
            };
            return [
                vscode.commands.registerCommand('loom.toggleRoadmap', toggleRoadmap),
                vscode.commands.registerCommand('loom.toggleRoadmapOff', toggleRoadmap),
                vscode.commands.registerCommand('loom.toggleGroupHistory', toggleGroupHistory),
                vscode.commands.registerCommand('loom.toggleGroupHistoryOff', toggleGroupHistory),
            ];
        })(),
        vscode.commands.registerCommand('loom.chatNew', (node?: TreeNode) => chatNewCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.chatReply', (node?: TreeNode) => chatReplyCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.promoteToIdea', (node?: TreeNode) => promoteToIdeaCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.promoteToDesign', (node?: TreeNode) => promoteToDesignCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.promoteToPlan', (node?: TreeNode) => promoteToPlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.promoteToReference', (node?: TreeNode) => promoteToReferenceCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.refineIdea', (node?: TreeNode) => refineIdeaCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.refinePlan', (node?: TreeNode) => refinePlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.doStep', (node?: TreeNode) => doStepCommand(node)),
        vscode.commands.registerCommand('loom.closePlan', (node?: TreeNode) => closePlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.delete', (node?: TreeNode) => deleteItemCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.archive', (node?: TreeNode) => archiveItemCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.markDone', (node?: TreeNode) => markDoneCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.markActive', (node?: TreeNode) => markActiveCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.restoreItem', (node?: TreeNode) => restoreItemCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.createReference', () => createReferenceCommand(treeProvider, treeView)),
        vscode.commands.registerCommand('loom.addRequiresLoad', (node?: TreeNode) => addRequiresLoadCommand(node)),
        vscode.commands.registerCommand('loom.refreshCtx', async (node?: TreeNode) => {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
            const weaveId = node?.weaveId;
            const scope: 'global' | 'weave' = weaveId ? 'weave' : 'global';
            const argsLiteral = weaveId ? `{ scope: "weave", weaveId: "${weaveId}" }` : `{ scope: "global" }`;
            if (await isClaudeInstalled()) {
                await launchClaude(root, 'Loom: Refresh Ctx',
                    `Loom refresh ctx task (scope=${scope}). ctx exists at global + weave scope only. Call MCP tool loom_refresh_ctx with ${argsLiteral} to get the assembled source and the ctxId, write a concise context summary from that source, then call loom_update_doc on the returned ctxId with the summary body.`
                );
            } else {
                // No agent available — ensure the canonical ctx shell + source, open it for editing.
                try {
                    let result: any;
                    await vscode.window.withProgress(
                        { location: vscode.ProgressLocation.Notification, title: 'Loom: Preparing ctx…', cancellable: false },
                        async () => { result = await getMCP(root).callTool('loom_refresh_ctx', weaveId ? { scope, weaveId } : { scope }); }
                    );
                    treeProvider.refresh();
                    if (result?.targetPath) { const doc = await vscode.workspace.openTextDocument(result.targetPath); await vscode.window.showTextDocument(doc, { preview: false }); }
                    vscode.window.showInformationMessage('Ctx shell ready — write the summary (an agent can do this), then save.');
                } catch (e: any) { handleMcpError(e, treeProvider); }
            }
        }),
        vscode.commands.registerCommand('loom.generateDesign', async (node?: TreeNode) => {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
            const id = node?.doc?.id;
            if (!id) { vscode.window.showErrorMessage('Right-click an idea in the tree to generate a design.'); return; }
            if (await isClaudeInstalled()) {
                const weaveId = node?.weaveId ?? '';
                const threadId = node?.threadId ?? '';
                await launchClaude(root, 'Loom: Generate Design',
                    `Loom generate design task. ideaId="${id}", weaveId="${weaveId}", threadId="${threadId}". Use the loom MCP server: use MCP tool loom_find_doc with id="${id}" to read the idea, then call MCP tool loom_create_design ONCE with weaveId="${weaveId}" threadId="${threadId}", a concise title, and content (the full design body derived from the idea). Do NOT call loom_update_doc afterwards — pass the body in the content argument of loom_create_design, in the same single call. Do not use loom_generate_design — sampling is unavailable in Claude Code CLI.`
                );
            } else {
                try {
                    let result: any;
                    await vscode.window.withProgress(
                        { location: vscode.ProgressLocation.Notification, title: 'Loom: Generating design…', cancellable: false },
                        async () => { result = await getMCP(root).callTool('loom_generate_design', { id }); }
                    );
                    treeProvider.refresh();
                    if (result?.filePath) { const doc = await vscode.workspace.openTextDocument(result.filePath); await vscode.window.showTextDocument(doc, { preview: false }); }
                    vscode.window.showInformationMessage('Design generated');
                } catch (e: any) { handleMcpError(e, treeProvider); }
            }
        }),
        vscode.commands.registerCommand('loom.generatePlan', async (node?: TreeNode) => {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
            const id = node?.doc?.id;
            if (!id) { vscode.window.showErrorMessage('Right-click a design in the tree to generate a plan.'); return; }
            if (await isClaudeInstalled()) {
                const weaveId = node?.weaveId ?? '';
                const threadId = node?.threadId ?? '';
                await launchClaude(root, 'Loom: Generate Plan',
                    `Loom generate plan task. designId="${id}", weaveId="${weaveId}", threadId="${threadId}". Use the loom MCP server: use MCP tool loom_find_doc with id="${id}" to read the design, and read loom://context/thread/${weaveId}/${threadId}?mode=plan for the thread's locked requirements (the req doc — appears first). Treat its Excluded items and Constraints as HARD BOUNDARIES (no steps for excluded work), cover every Included requirement, and cite the requirement ids (IN/C handles) each step advances. Then call MCP tool loom_create_plan ONCE with weaveId="${weaveId}" threadId="${threadId}", a concise title, and a content markdown body whose Steps table has a Satisfies column listing the cited ids per step (comma-separated, — when none). Do NOT call loom_update_doc afterwards. Do not use loom_generate_plan — sampling is unavailable in Claude Code CLI.`
                );
            } else {
                try {
                    let result: any;
                    await vscode.window.withProgress(
                        { location: vscode.ProgressLocation.Notification, title: 'Loom: Generating plan…', cancellable: false },
                        async () => { result = await getMCP(root).callTool('loom_generate_plan', { id }); }
                    );
                    treeProvider.refresh();
                    if (result?.filePath) { const doc = await vscode.workspace.openTextDocument(result.filePath); await vscode.window.showTextDocument(doc, { preview: false }); }
                    vscode.window.showInformationMessage('Plan generated');
                } catch (e: any) { handleMcpError(e, treeProvider); }
            }
        }),
        vscode.commands.registerCommand('loom.install.openCliTerminal', () => {
            const t = vscode.window.createTerminal('Loom CLI Install');
            t.show();
            t.sendText('npm install -g @reslava/loom');
        }),
        vscode.commands.registerCommand('loom.install.runInstall', () => runLoomInstall()),
        vscode.commands.registerCommand('loom.install.openAiSettings', () =>
            vscode.commands.executeCommand('workbench.action.openSettings', 'reslava-loom.ai')
        )
    );

    let aiEnabled = true;
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('reslava-loom.ai')) {
                syncSetupContext();
            }
        })
    );

    // Context keys — drive walkthrough completion and notification targeting
    async function syncSetupContext(): Promise<void> {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const cliDetected = isLoomCliAvailable();
        const workspaceInitialized = root ? fs.existsSync(path.join(root, '.loom')) : false;
        const mcpConfigured = root ? await detectMcpConfig(root) : false;
        const mcpLive = getMCPConnected();
        const aiConfigured = cliDetected;
        const hasWeaves = root ? detectHasWeaves(root) : false;

        const set = (key: string, val: boolean) => vscode.commands.executeCommand('setContext', key, val);
        set('loom.cliDetected', cliDetected);
        set('loom.workspaceInitialized', workspaceInitialized);
        set('loom.mcpConnected', mcpConfigured);
        set('loom.aiConfigured', aiConfigured);
        set('loom.hasWeaves', hasWeaves);

        mcpStatusBar.text = mcpLive ? '$(plug) Loom MCP' : '$(debug-disconnect) Loom MCP';
        mcpStatusBar.tooltip = mcpLive ? 'Loom MCP connected — click to reconnect' : 'Loom MCP disconnected — click to reconnect';
        mcpStatusBar.show();
    }

    // MCP status bar
    const mcpStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    mcpStatusBar.command = 'loom.reconnectMcp';
    context.subscriptions.push(mcpStatusBar);

    // Re-sync status bar once MCP actually connects (first successful state read)
    context.subscriptions.push(treeProvider.onMCPStateChange(() => syncSetupContext()));

    syncSetupContext();

    // Partial-setup notification — shown at most once per workspace per session
    async function showSetupNotification(): Promise<void> {
        const shownKey = 'loom.setupNotificationShown';
        if (context.workspaceState.get<boolean>(shownKey)) return;

        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) return;

        const cliOk = isLoomCliAvailable();
        const loomDirOk = fs.existsSync(path.join(root, '.loom'));
        const mcpOk = await detectMcpConfig(root);
        const claudeMdOk = fs.existsSync(path.join(root, '.loom', 'CLAUDE.md'));

        let message: string | undefined;
        let action: string | undefined;
        let onAction: (() => void) | undefined;

        if (!cliOk) {
            message = 'Loom CLI not found. Install it to use Loom.';
            action = 'Open Terminal';
            onAction = () => {
                const t = vscode.window.createTerminal('Loom Setup');
                t.show();
                t.sendText('npm install -g @reslava/loom');
            };
        } else if (!loomDirOk) {
            message = 'Initialize Loom in this workspace?';
            action = 'Initialize';
            onAction = () => runLoomInstall();
        } else if (!mcpOk) {
            message = 'Set up Loom MCP for this workspace?';
            action = 'Set up';
            onAction = () => runLoomInstall();
        } else if (!claudeMdOk) {
            message = 'Update Loom session rules?';
            action = 'Update';
            onAction = () => runLoomInstall();
        }

        if (!message || !action || !onAction) return;

        await context.workspaceState.update(shownKey, true);
        const choice = await vscode.window.showInformationMessage(message, action, 'Not now');
        if (choice === action) onAction();
    }

    setImmediate(() => showSetupNotification());

    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => syncAndRefresh())
    );

    // Watch .loom/ for install/upgrade events — re-sync context keys
    const loomDirWatcher = vscode.workspace.createFileSystemWatcher('**/.loom/**');
    const debouncedSyncSetup = debounce(() => syncSetupContext(), 500);
    context.subscriptions.push(loomDirWatcher.onDidCreate(debouncedSyncSetup));
    context.subscriptions.push(loomDirWatcher.onDidChange(debouncedSyncSetup));
    context.subscriptions.push(loomDirWatcher.onDidDelete(debouncedSyncSetup));
    context.subscriptions.push(loomDirWatcher);

    const watcher = vscode.workspace.createFileSystemWatcher('**/loom/**/*.md');
    const debouncedSyncAndRefresh = debounce(() => syncAndRefresh(), 800);
    context.subscriptions.push(watcher.onDidCreate(debouncedSyncAndRefresh));
    context.subscriptions.push(watcher.onDidChange(debouncedSyncAndRefresh));
    context.subscriptions.push(watcher.onDidDelete(debouncedSyncAndRefresh));
    // Also re-sync context keys (hasWeaves) when loom files appear or disappear
    context.subscriptions.push(watcher.onDidCreate(debouncedSyncSetup));
    context.subscriptions.push(watcher.onDidDelete(debouncedSyncSetup));
    context.subscriptions.push(watcher);

    setImmediate(() => syncAndRefresh());

    return { treeProvider, getAiEnabled: () => aiEnabled };
}

export function deactivate() { disposeMCP(); }

async function detectMcpConfig(workspaceRoot: string): Promise<boolean> {
    // `.mcp.json` at the project root is what `loom install` writes — it is
    // the canonical Claude Code project-scoped MCP config location and must
    // be checked first, otherwise the extension loops re-prompting "Set up
    // Loom MCP" after a successful install.
    const candidates = [
        path.join(workspaceRoot, '.mcp.json'),
        path.join(workspaceRoot, '.claude', 'mcp.json'),
        path.join(workspaceRoot, '.claude.json'),
        path.join(workspaceRoot, '.cursor', 'mcp.json'),
        path.join(workspaceRoot, '.vscode', 'mcp.json'),
    ];
    for (const candidate of candidates) {
        try {
            const raw = fs.readFileSync(candidate, 'utf8');
            const config = JSON.parse(raw);
            // Claude Code format: { mcpServers: { loom: { ... } } }
            // Cursor format: { mcpServers: { loom: { ... } } }
            const servers = config?.mcpServers ?? config?.servers ?? {};
            if (servers['loom']) return true;
        } catch { /* file missing or invalid JSON — continue */ }
    }
    return false;
}

function isLoomCliAvailable(): boolean {
    try { execSync('loom --version', { stdio: 'ignore' }); return true; }
    catch { return false; }
}

function detectHasWeaves(workspaceRoot: string): boolean {
    const loomDir = path.join(workspaceRoot, 'loom');
    try {
        return fs.readdirSync(loomDir).some(entry =>
            fs.statSync(path.join(loomDir, entry)).isDirectory()
        );
    } catch { return false; }
}

function runLoomInstall(): void {
    const terminal = vscode.window.createTerminal('Loom Install');
    terminal.show();
    terminal.sendText('loom install');
}

function debounce(fn: () => void, ms: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fn, ms);
    };
}