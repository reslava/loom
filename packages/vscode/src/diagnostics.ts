import * as vscode from 'vscode';
import * as path from 'path';
import { getMCP } from './mcp-client';

interface ValidationResult {
    id: string;
    issues: string[];
}

export async function updateDiagnostics(
    collection: vscode.DiagnosticCollection,
    workspaceRoot: string
): Promise<void> {
    collection.clear();

    let results: ValidationResult[];
    try {
        const r = await getMCP(workspaceRoot).callTool('loom_validate', { all: true }) as { results: ValidationResult[] };
        results = r.results ?? [];
    } catch {
        return;
    }

    const weavesWithIssues = results.filter(r => r.issues.length > 0);
    if (weavesWithIssues.length === 0) return;

    const idToUri = await buildDocIdMap(workspaceRoot);

    for (const weaveResult of weavesWithIssues) {
        const weavePath = path.join(workspaceRoot, 'loom', weaveResult.id);
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

async function buildDocIdMap(workspaceRoot: string): Promise<Map<string, vscode.Uri>> {
    const map = new Map<string, vscode.Uri>();
    try {
        const raw = await getMCP(workspaceRoot).readResource('loom://link-index');
        const byId = (JSON.parse(raw).byId ?? {}) as Record<string, string>;
        for (const [id, filePath] of Object.entries(byId)) {
            map.set(id, vscode.Uri.file(filePath));
        }
    } catch {
        // leave map empty — issues fall back to findAnyFileUnder / are skipped
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
    // "Plan {planId} is stale ..." or "Plan {planId} has no ..." or "Plan {planId}: Step N: ..."
    const planMatch = issue.match(/^Plan\s+([\w-]+)[\s:]/);
    if (planMatch) return planMatch[1];
    return undefined;
}
