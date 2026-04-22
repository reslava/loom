import * as vscode from 'vscode';
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
import { setTextFilter, toggleArchived } from './commands/filter';
import { chatNewCommand } from './commands/chatNew';
import { chatReplyCommand } from './commands/chatReply';
import { promoteIdeaCommand } from './commands/promoteIdea';
import { setIconBaseUri } from './icons';
import { updateDiagnostics } from './diagnostics';

export function activate(context: vscode.ExtensionContext) {
    console.log('🧵 Loom extension activated');

    // Initialize icon base URI for custom icons
     setIconBaseUri(context.extensionUri);

    const viewStateManager = new ViewStateManager(context.workspaceState);
    const treeProvider = new LoomTreeProvider(viewStateManager);

    const treeView = vscode.window.createTreeView('loom.threads', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('loom');
    context.subscriptions.push(diagnosticCollection);

    function syncAndRefresh(): void {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        treeProvider.setWorkspaceRoot(root);
        treeProvider.refresh();
        if (root) updateDiagnostics(diagnosticCollection, root);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('loom.refresh', syncAndRefresh),
        vscode.commands.registerCommand('loom.weaveIdea', () => weaveIdeaCommand(treeProvider)),
        vscode.commands.registerCommand('loom.weaveDesign', (node?: TreeNode) => weaveDesignCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.weavePlan', (node?: TreeNode) => weavePlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.finalize', (node?: TreeNode) => finalizeCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.rename', () => renameCommand(treeProvider)),
        vscode.commands.registerCommand('loom.refineDesign', (node?: TreeNode) => refineCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.startPlan', (node?: TreeNode) => startPlanCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.completeStep', (node?: TreeNode) => completeStepCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.validate', () => validateCommand(treeProvider)),
        vscode.commands.registerCommand('loom.summarise', (node?: TreeNode) => summariseCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.setGrouping', () => showGroupingSelector(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.setTextFilter', () => setTextFilter(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.toggleArchived', () => toggleArchived(viewStateManager, treeProvider)),
        vscode.commands.registerCommand('loom.chatNew', (node?: TreeNode) => chatNewCommand(treeProvider, node)),
        vscode.commands.registerCommand('loom.chatReply', () => chatReplyCommand()),
        vscode.commands.registerCommand('loom.promoteIdea', () => promoteIdeaCommand(treeProvider))
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => syncAndRefresh())
    );

    const watcher = vscode.workspace.createFileSystemWatcher('**/weaves/**/*.md');
    const debouncedRefresh = debounce(() => treeProvider.refresh(), 300);
    context.subscriptions.push(watcher.onDidCreate(debouncedRefresh));
    context.subscriptions.push(watcher.onDidChange(debouncedRefresh));
    context.subscriptions.push(watcher.onDidDelete(debouncedRefresh));
    context.subscriptions.push(watcher);

    setImmediate(() => syncAndRefresh());
}

export function deactivate() {}

function debounce(fn: () => void, ms: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fn, ms);
    };
}