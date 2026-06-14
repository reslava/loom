import * as vscode from 'vscode';
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';
import { RoadmapBand } from '../view/viewState';

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
    // In the Roadmap view the status filter folds to a band selector
    // (all / roadmap / history) — the present band already subsumes the old
    // active+implementing filter, so there is no redundant status value.
    if (manager.getState().roadmapEnabled) {
        const currentBand = manager.getState().roadmapBand;
        const bands: { label: string; description: string; band: RoadmapBand }[] = [
            { label: '$(list-flat) All', description: 'Future + Present + History', band: 'all' },
            { label: '$(milestone) Roadmap', description: 'Future + Present only (forward-looking)', band: 'roadmap' },
            { label: '$(history) History', description: 'Shipped plans only', band: 'history' },
        ];
        const pickedBand = await vscode.window.showQuickPick(bands, {
            title: 'Roadmap band',
            placeHolder: bands.find(b => b.band === currentBand)?.label ?? 'Select a band',
        });
        if (!pickedBand) return;
        manager.update({ roadmapBand: pickedBand.band });
        treeProvider.refresh();
        onChange?.();
        return;
    }

    const current = manager.getState().statusFilter;
    const options: { label: string; description: string; filter: string[] }[] = [
        { label: '$(list-unordered) All', description: 'Show all statuses', filter: [] },
        { label: '$(circle-filled) Active', description: 'Active weaves/threads only', filter: ['active'] },
        { label: '$(sync~spin) Implementing', description: 'Implementing weaves/threads only', filter: ['implementing'] },
        { label: '$(pass-filled) Done', description: 'Done weaves/threads only', filter: ['done'] },
        { label: '$(warning) Stale', description: 'Threads with stale plans or docs', filter: ['stale'] },
        { label: '$(issues) Blocked', description: 'Threads with blocked steps in implementing plans', filter: ['blocked'] },
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
    const newState = !manager.getState().showArchived;
    manager.update({ showArchived: newState });
    vscode.commands.executeCommand('setContext', 'loom.showArchived', newState);
    treeProvider.refresh();
}
