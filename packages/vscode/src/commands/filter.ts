import * as vscode from 'vscode';
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function setTextFilter(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): Promise<void> {
    const current = manager.getState().textFilter ?? '';
    const input = await vscode.window.showInputBox({
        prompt: 'Filter weaves and documents by text (empty to clear)',
        value: current,
        placeHolder: 'e.g. payment',
    });
    if (input === undefined) return;
    manager.update({ textFilter: input || '' });
    treeProvider.refresh();
}

export async function setStatusFilter(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider,
    onChange?: () => void
): Promise<void> {
    const current = manager.getState().statusFilter;
    const options: { label: string; description: string; filter: string[] }[] = [
        { label: '$(list-unordered) All', description: 'Show all statuses', filter: [] },
        { label: '$(circle-filled) Active', description: 'Active weaves/threads only', filter: ['active'] },
        { label: '$(sync~spin) Implementing', description: 'Implementing weaves/threads only', filter: ['implementing'] },
        { label: '$(pass-filled) Done', description: 'Done weaves/threads only', filter: ['done'] },
    ];
    const currentLabel = options.find(o => JSON.stringify(o.filter) === JSON.stringify(current))?.label;
    const picked = await vscode.window.showQuickPick(options, {
        title: 'Filter by status',
        placeHolder: currentLabel ?? 'Select a filter',
    });
    if (!picked) return;
    manager.update({ statusFilter: picked.filter });
    treeProvider.refresh();
    onChange?.();
}

export function statusFilterLabel(filter: string[]): string {
    if (filter.length === 0) return 'All';
    return filter.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' + ');
}

export function toggleArchived(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): void {
    manager.update({ showArchived: !manager.getState().showArchived });
    treeProvider.refresh();
}
