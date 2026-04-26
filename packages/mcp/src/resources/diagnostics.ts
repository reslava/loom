import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
import { LinkIndex } from '../../../core/dist/linkIndex';
import * as fs from 'fs-extra';

interface DiagnosticIssue {
    docId: string;
    issue: 'broken_parent_id' | 'dangling_child_id';
    detail: string;
}

export async function handleDiagnosticsResource(root: string) {
    const registry = new ConfigRegistry();
    const state = await getState(
        { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }
    );

    const index = state.index as LinkIndex;
    const allIds = new Set(index.documents.keys());
    const issues: DiagnosticIssue[] = [];

    for (const [id, parentId] of index.parent.entries()) {
        if (!allIds.has(parentId)) {
            issues.push({ docId: id, issue: 'broken_parent_id', detail: `parent_id '${parentId}' not found in index` });
        }
    }

    for (const [id, childSet] of index.children.entries()) {
        for (const childId of childSet) {
            if (!allIds.has(childId)) {
                issues.push({ docId: id, issue: 'dangling_child_id', detail: `child_id '${childId}' not found in index` });
            }
        }
    }

    return {
        contents: [{
            uri: 'loom://diagnostics',
            mimeType: 'application/json',
            text: JSON.stringify({ issueCount: issues.length, issues }, null, 2),
        }],
    };
}
