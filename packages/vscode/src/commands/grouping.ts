import * as vscode from 'vscode';
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';
import { GroupingMode, HistoryGrouping } from '../view/viewState';

export async function showGroupingSelector(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): Promise<void> {
    const options: vscode.QuickPickItem[] = [
        { label: '$(symbol-class) Type', description: 'Group by document type' },
        { label: '$(project) Thread', description: 'Group by feature thread' },
        { label: '$(git-commit) Status', description: 'Group by workflow status' },
        { label: '$(tag) Release', description: 'Group by target release' },
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select grouping mode',
    });

    if (selected) {
        let mode: GroupingMode;
        if (selected.label.includes('Type')) mode = 'type';
        else if (selected.label.includes('Thread')) mode = 'thread';
        else if (selected.label.includes('Status')) mode = 'status';
        else mode = 'release';

        manager.update({ grouping: mode });
        treeProvider.refresh();
    }
}

/**
 * QuickPick for how the roadmap History band groups shipped plans: by release
 * version (default), by thread, or flat by date. Returns the chosen mode (or
 * undefined if cancelled) so the caller can sync the menu context.
 */
export async function showHistoryGroupingSelector(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): Promise<HistoryGrouping | undefined> {
    const options: vscode.QuickPickItem[] = [
        { label: '$(tag) Release', description: 'Group by release version (newest first)' },
        { label: '$(project) Thread', description: 'Group by feature thread' },
        { label: '$(calendar) Date', description: 'Flat, newest shipped first' },
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Group roadmap history by',
    });

    if (!selected) return undefined;

    let mode: HistoryGrouping;
    if (selected.label.includes('Release')) mode = 'release';
    else if (selected.label.includes('Thread')) mode = 'thread';
    else mode = 'date';

    manager.update({ historyGrouping: mode });
    treeProvider.refresh();
    return mode;
}