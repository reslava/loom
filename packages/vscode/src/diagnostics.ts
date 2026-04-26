import * as vscode from 'vscode';
import * as path from 'path';
import { validate } from '@reslava-loom/app/dist/validate';
import { buildLinkIndex, loadDoc } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';

export async function updateDiagnostics(
    collection: vscode.DiagnosticCollection,
    workspaceRoot: string
): Promise<void> {
    collection.clear();

    let result;
    try {
        result = await validate(
            { all: true },
            {
                getActiveLoomRoot: () => workspaceRoot,
                buildLinkIndex,
                loadDoc,
                fs,
                loomRoot: workspaceRoot,
            }
        );
    } catch {
        return;
    }

    const weavesWithIssues = result.results.filter(r => r.issues.length > 0);
    if (weavesWithIssues.length === 0) return;

    const idToUri = await buildDocIdMap();

    for (const weaveResult of weavesWithIssues) {
        const weavePath = path.join(workspaceRoot, 'weaves', weaveResult.id);
        const diagnosticsByUri = new Map<string, vscode.Diagnostic[]>();

        for (const issueText of weaveResult.issues) {
            const docId = extractDocId(issueText);
            let uri: vscode.Uri | undefined;

            if (docId) {
                uri = idToUri.get(docId);
            }
            if (!uri) {
                uri = findAnyFileUnder(idToUri, weavePath);
            }
            if (!uri) continue;

            const key = uri.toString();
            if (!diagnosticsByUri.has(key)) diagnosticsByUri.set(key, []);
            diagnosticsByUri.get(key)!.push(
                new vscode.Diagnostic(
                    new vscode.Range(0, 0, 0, 0),
                    issueText,
                    vscode.DiagnosticSeverity.Warning
                )
            );
        }

        for (const [uriStr, diags] of diagnosticsByUri) {
            const existingDiags = collection.get(vscode.Uri.parse(uriStr)) ?? [];
            collection.set(vscode.Uri.parse(uriStr), [...existingDiags, ...diags]);
        }
    }
}

async function buildDocIdMap(): Promise<Map<string, vscode.Uri>> {
    const map = new Map<string, vscode.Uri>();
    const files = await vscode.workspace.findFiles('loom/**/*.md');
    for (const uri of files) {
        try {
            const doc = await loadDoc(uri.fsPath) as any;
            if (doc?.id) map.set(doc.id, uri);
        } catch {
            // skip unparseable files
        }
    }
    return map;
}

function findAnyFileUnder(idToUri: Map<string, vscode.Uri>, dirPath: string): vscode.Uri | undefined {
    for (const [, uri] of idToUri) {
        if (uri.fsPath.startsWith(dirPath + path.sep) || uri.fsPath.startsWith(dirPath + '/')) {
            return uri;
        }
    }
    return undefined;
}

function extractDocId(issue: string): string | undefined {
    // "Broken parent_id: {docId} → ..."  or  "Dangling child_id: {docId} → ..."
    const arrowMatch = issue.match(/:\s+([\w-]+)\s+[→>]/);
    if (arrowMatch) return arrowMatch[1];
    // "Plan {planId} is stale ..."
    const planMatch = issue.match(/^Plan\s+([\w-]+)\s+/);
    if (planMatch) return planMatch[1];
    return undefined;
}
