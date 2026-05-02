import * as vscode from 'vscode';

export const Icons = {
    // Activity & View
    loom: 'loom',
    weave: 'weave',
    thread: 'thread',    

    // Document Types
    chat: 'chat',
    idea: 'idea',
    design: 'design',
    plan: 'plan',
    ctx: 'ctx',
    reference: 'reference',
    refs: 'refs',

    // Actions
    actionDelete: 'actionDelete',
    actionArchive: 'actionArchive',
    actionCancel: 'actionCancel',
    actionGenerate: 'actionGenerate',
} as const;

const CodiconMap: Readonly<Record<keyof typeof Icons, string>> = {
    loom: 'graph',
    weave: 'project',
    thread: 'git-branch',
    chat: 'comment-discussion',
    idea: 'lightbulb',
    design: 'symbol-structure',
    plan: 'checklist',
    ctx: 'note',
    reference: 'references',
    refs: 'library',
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

function svgIcon(filename: string, codiconFallback: string): vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri } {
    if (EXT_URI) {
        const uri = vscode.Uri.joinPath(EXT_URI, 'media', 'icons', filename);
        return { light: uri, dark: uri };
    }
    return new vscode.ThemeIcon(codiconFallback);
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
        case 'chat':      return icon(Icons.chat);
        case 'reference': return icon(Icons.reference);
        default:          return icon(Icons.design);
    }
}

/**
 * Returns the appropriate icon for a weave status.
 */
export function getWeaveIcon(status: string): ReturnType<typeof icon> {
    switch (status) {
        case 'IMPLEMENTING': return svgIcon('weave-implementing.svg', 'sync~spin');
        case 'DONE':         return svgIcon('status-done.svg', 'pass-filled');
        case 'CANCELLED':    return new vscode.ThemeIcon('error');
        default:             return icon(Icons.weave);
    }
}

/**
 * Returns the appropriate icon for a thread status.
 */
export function getThreadIcon(status: string): ReturnType<typeof icon> {
    switch (status) {
        case 'IMPLEMENTING': return svgIcon('thread-implementing.svg', 'sync~spin');
        case 'DONE':         return svgIcon('status-done.svg', 'pass-filled');
        case 'CANCELLED':    return new vscode.ThemeIcon('error');
        default:             return icon(Icons.thread);
    }
}

/**
 * Returns the appropriate icon for a plan status.
 */
export function getPlanIcon(status: string): ReturnType<typeof icon> {
    switch (status) {
        case 'implementing': return svgIcon('plan-implementing.svg', 'sync~spin');
        case 'done':         return svgIcon('status-done.svg', 'pass-filled');
        case 'blocked':      return new vscode.ThemeIcon('warning');
        default:             return icon(Icons.plan);
    }
}