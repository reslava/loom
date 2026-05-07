import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { LoomTreeProvider, TreeNode } from './tree/treeProvider';
import { ViewStateManager } from './view/viewStateManager';
import { weaveIdeaCommand } from './commands/weaveIdea';
import { weaveDesignCommand } from './commands/weaveDesign';
import { weavePlanCommand } from './commands/weavePlan';
import { finalizeCommand } from './commands/finalize';
import { renameCommand } from './commands/rename';
import { refineCommand } from './commands/refine';
import { startPlanCommand } from './commands/startPlan';
import { completeStepCommand } from './commands/completeStep';
import { validateCommand } from './commands/validate';
import { summariseCommand } from './commands/summarise';
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
import { refineIdeaCommand } from './commands/refineIdea';
import { refinePlanCommand } from './commands/refinePlan';
import { doStepCommand } from './commands/doStep';
import { closePlanCommand } from './commands/closePlan';
import { markDoneCommand, markActiveCommand } from './commands/markStatus';
import { restoreItemCommand } from './commands/restoreItem';
import { setIconBaseUri } from './icons';
import { disposeMCP, getMCP, getMCPConnected } from './mcp-client';
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
    const treeProvider = new LoomTreeProvider(viewStateManager);
    const tokenEstimator = new TokenEstimatorService(context);
    const contextSidebar = new ContextSidebarProvider(treeProvider, tokenEstimator);

    const treeView = vscode.window.createTreeView('loom.threads', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    const contextView = vscode.window.createTreeView('loom.context', {
        treeDataProvider: contextSidebar,
        showCollapseAll: false,
    });
    context.subscriptions.push(contextView);

    function updateViewTitle(): void {
        treeView.title = statusFilterLabel(viewStateManager.getState().statusFilter);
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
            const filePath = editor.document.uri.fsPath;
            const node = treeProvider.getNodeByFilePath(filePath);
            if (node) {
                treeView.reveal(node, { select: true, focus: false, expand: true });
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('loom.context.toggle', (node: any) => {
            const id = typeof node === 'string' ? node : node?.entry?.id;
            if (id) contextSidebar.toggle(id);
        }),
        vscode.commands.registerCommand('loom.context.openDoc', (id: string) => {
            contextSidebar.openDoc(id);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('loom.refresh', syncAndRefresh),
        vscode.commands.registerCommand('loom.reconnectMcp', () => { disposeMCP(); syncAndRefresh(); }),
        vscode.commands.registerCommand('loom.weaveCreate', () => weaveCreateCommand(treeProvider)),
        vscode.commands.registerCommand('loom.threadCreate', () => threadCreateCommand(treeProvider, treeView)),
        vscode.commands.registerCommand('loom.weaveIdea', (node?: TreeNode) => weaveIdeaCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.weaveDesign', (node?: TreeNode) => weaveDesignCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.weavePlan', (node?: TreeNode) => weavePlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.finalize', (node?: TreeNode) => finalizeCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.rename', (node?: TreeNode) => renameCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.refineDesign', (node?: TreeNode) => refineCommand(treeProvider, node, contextSidebar)),
        vscode.commands.registerCommand('loom.startPlan', (node?: TreeNode) => startPlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.completeStep', (node?: TreeNode) => completeStepCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.validate', () => validateCommand(treeProvider)),
        vscode.commands.registerCommand('loom.summarise', (node?: TreeNode) => summariseCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.setGrouping', () => showGroupingSelector(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.setTextFilter', () => setTextFilter(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.setStatusFilter', () => setStatusFilter(viewStateManager, treeProvider, updateViewTitle)),
        vscode.commands.registerCommand('loom.toggleArchived', () => toggleArchived(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.toggleArchivedOff', () => toggleArchived(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.chatNew', (node?: TreeNode) => chatNewCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.chatReply', (node?: TreeNode) => chatReplyCommand(node)),
        vscode.commands.registerCommand('loom.promoteToIdea', (node?: TreeNode) => promoteToIdeaCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.promoteToDesign', (node?: TreeNode) => promoteToDesignCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.promoteToPlan', (node?: TreeNode) => promoteToPlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.refineIdea', (node?: TreeNode) => refineIdeaCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.refinePlan', (node?: TreeNode) => refinePlanCommand(treeProvider, node, contextSidebar)),
        vscode.commands.registerCommand('loom.doStep', (node?: TreeNode) => doStepCommand(node, contextSidebar)),
        vscode.commands.registerCommand('loom.closePlan', (node?: TreeNode) => closePlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.delete', (node?: TreeNode) => deleteItemCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.archive', (node?: TreeNode) => archiveItemCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.markDone', (node?: TreeNode) => markDoneCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.markActive', (node?: TreeNode) => markActiveCommand(treeProvider, treeView, node)),
        vscode.commands.registerCommand('loom.restoreItem', (node?: TreeNode) => restoreItemCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.generateDesign', async (node?: TreeNode) => {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
            const id = node?.doc?.id;
            if (!id) { vscode.window.showErrorMessage('Right-click an idea in the tree to generate a design.'); return; }
            try {
                let result: any;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Loom: Generating design…', cancellable: false },
                    async () => {
                        const contextIds = contextSidebar.getSelectedIds();
                        result = await getMCP(root).callTool('loom_generate_design', { id, ...(contextIds.length > 0 ? { context_ids: contextIds } : {}) });
                    }
                );
                treeProvider.refresh();
                if (result?.filePath) {
                    const doc = await vscode.workspace.openTextDocument(result.filePath);
                    await vscode.window.showTextDocument(doc, { preview: false });
                }
                vscode.window.showInformationMessage(`Design generated`);
            } catch (e: any) {
                vscode.window.showErrorMessage(`Generate design failed: ${e.message}`);
            }
        }),
        vscode.commands.registerCommand('loom.generatePlan', async (node?: TreeNode) => {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
            const id = node?.doc?.id;
            if (!id) { vscode.window.showErrorMessage('Right-click a design in the tree to generate a plan.'); return; }
            try {
                let result: any;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Loom: Generating plan…', cancellable: false },
                    async () => {
                        const contextIds = contextSidebar.getSelectedIds();
                        result = await getMCP(root).callTool('loom_generate_plan', { id, ...(contextIds.length > 0 ? { context_ids: contextIds } : {}) });
                    }
                );
                treeProvider.refresh();
                if (result?.filePath) {
                    const doc = await vscode.workspace.openTextDocument(result.filePath);
                    await vscode.window.showTextDocument(doc, { preview: false });
                }
                vscode.window.showInformationMessage(`Plan generated`);
            } catch (e: any) {
                vscode.window.showErrorMessage(`Generate plan failed: ${e.message}`);
            }
        }),
        vscode.commands.registerCommand('loom.generateGlobalCtx', async () => {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }
            try {
                let result: any;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Loom: Generating global context…', cancellable: false },
                    async () => {
                        result = await getMCP(root).callTool('loom_generate_global_ctx', {});
                    }
                );
                treeProvider.refresh();
                if (result?.filePath) {
                    const doc = await vscode.workspace.openTextDocument(result.filePath);
                    await vscode.window.showTextDocument(doc, { preview: false });
                }
                vscode.window.showInformationMessage(`Global context updated (v${result?.version})`);
            } catch (e: any) {
                vscode.window.showErrorMessage(`Generate global context failed: ${e.message}`);
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

    let aiEnabled = false;
    function syncAiContext(): void {
        const apiKey = vscode.workspace.getConfiguration('reslava-loom.ai').get<string>('apiKey') ?? '';
        aiEnabled = apiKey.length > 0;
        vscode.commands.executeCommand('setContext', 'loom.aiEnabled', aiEnabled);
    }
    syncAiContext();
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('reslava-loom.ai.apiKey')) {
                syncAiContext();
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
        const aiConfigured = (vscode.workspace.getConfiguration('reslava-loom.ai').get<string>('apiKey') ?? '').length > 0;
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
    const debouncedRefresh = debounce(() => treeProvider.refresh(), 300);
    context.subscriptions.push(watcher.onDidCreate(debouncedRefresh));
    context.subscriptions.push(watcher.onDidChange(debouncedRefresh));
    context.subscriptions.push(watcher.onDidDelete(debouncedRefresh));
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