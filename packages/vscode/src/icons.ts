import * as vscode from 'vscode';

export const Icons = {
    // Activity & View
    loom: 'loom',
    thread: 'thread',

    // Document Types
    idea: 'idea',
    design: 'design',
    plan: 'plan',
    ctx: 'ctx',

    // Actions
    actionDelete: 'actionDelete',
    actionArchive: 'actionArchive',
    actionCancel: 'actionCancel',
    actionGenerate: 'actionGenerate',
} as const;

const CodiconMap: Readonly<Record<keyof typeof Icons, string>> = {
    loom: 'graph',
    thread: 'project',
    idea: 'lightbulb',
    design: 'symbol-structure',
    plan: 'checklist',
    ctx: 'note',
    actionDelete: 'trash',
    actionArchive: 'archive',
    actionCancel: 'close',
    actionGenerate: 'sparkle',
};

let EXT_URI: vscode.Uri | undefined;

export function setIconBaseUri(uri: vscode.Uri): void {
    EXT_URI = uri;
}

export function icon(id: keyof typeof Icons): vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri } {
    if (EXT_URI) {
        const uri = vscode.Uri.joinPath(EXT_URI, 'media', 'icons', `${id}.svg`);
        return { light: uri, dark: uri };
    }
    return new vscode.ThemeIcon(CodiconMap[id]);
}

/**
 * Returns the appropriate icon for a document type.
 */
export function getDocumentIcon(type: string): ReturnType<typeof icon> {
    switch (type) {
        case 'design': return icon(Icons.design);
        case 'idea':   return icon(Icons.idea);
        case 'plan':   return icon(Icons.plan);
        case 'ctx':    return icon(Icons.ctx);
        default:       return icon(Icons.design);
    }
}

/**
 * Returns the appropriate icon for a thread status.
 */
export function getThreadIcon(status: string): ReturnType<typeof icon> {
    switch (status) {
        case 'IMPLEMENTING': return new vscode.ThemeIcon('sync~spin');
        case 'DONE':         return new vscode.ThemeIcon('pass-filled');
        case 'CANCELLED':    return new vscode.ThemeIcon('error');
        default:             return icon(Icons.thread);
    }
}

/**
 * Returns the appropriate icon for a plan status.
 */
export function getPlanIcon(status: string): ReturnType<typeof icon> {
    switch (status) {
        case 'implementing': return new vscode.ThemeIcon('sync~spin');
        case 'done':         return new vscode.ThemeIcon('pass-filled');
        case 'blocked':      return new vscode.ThemeIcon('warning');
        default:             return icon(Icons.plan);
    }
}