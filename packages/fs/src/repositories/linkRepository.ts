import * as path from 'path';
import * as fs from 'fs-extra';
import { findMarkdownFiles } from '../utils/pathUtils';
import { loadDoc } from '../serializers/frontmatterLoader';
import { LinkIndex, createEmptyIndex, DocumentEntry, StepBlocker } from '../../../core/dist/linkIndex';
import { Document } from '../../../core/dist/entities/document';
import { PlanDoc } from '../../../core/dist/entities/plan';

const RESERVED_SUBDIR_NAMES = new Set(['plans', 'done', 'ai-chats', 'ctx', 'refs', '.archive']);

function extractThreadId(filePath: string, weavesDir: string): string | undefined {
    const rel = path.relative(weavesDir, filePath);
    const parts = rel.split(path.sep);
    // parts[0]=weaveId, parts[1]=possible threadId, parts[2+]=rest
    if (parts.length < 3) return undefined;
    const candidate = parts[1];
    if (RESERVED_SUBDIR_NAMES.has(candidate) || candidate.endsWith('.md')) return undefined;
    return candidate;
}

export async function buildLinkIndex(loomRoot: string): Promise<LinkIndex> {
    const threadsDir = path.join(loomRoot, 'loom');
    const index = createEmptyIndex();

    if (!fs.existsSync(threadsDir)) {
        return index;
    }

    const allFiles = await findMarkdownFiles(threadsDir);

    for (const filePath of allFiles) {
        try {
            const doc = await loadDoc(filePath) as Document;
            const docId = doc.id;

            const entry: DocumentEntry = {
                path: filePath,
                type: doc.type,
                exists: true,
                archived: filePath.includes('.archive'),
                threadId: extractThreadId(filePath, threadsDir),
            };
            index.documents.set(docId, entry);
            
            if (doc.parent_id) {
                index.parent.set(docId, doc.parent_id);
            }
            
            if (doc.child_ids && doc.child_ids.length > 0) {
                for (const childId of doc.child_ids) {
                    if (!index.children.has(docId)) {
                        index.children.set(docId, new Set());
                    }
                    index.children.get(docId)!.add(childId);
                }
            }
            
            if (doc.type === 'plan') {
                const planDoc = doc as PlanDoc;
                const blockers: StepBlocker[] = [];
                
                if (planDoc.steps) {
                    for (const step of planDoc.steps) {
                        if (step.blockedBy && step.blockedBy.length > 0) {
                            blockers.push({
                                step: step.order,
                                blockedBy: step.blockedBy,
                            });
                        }
                    }
                }
                
                if (blockers.length > 0) {
                    index.stepBlockers.set(docId, blockers);
                }
            }
        } catch (e) {
            console.warn(`[buildLinkIndex] Skipping ${filePath}: ${(e as Error).message}`);
        }
    }
    
    return index;
}

function removeDocumentFromIndex(index: LinkIndex, docId: string): void {
    index.documents.delete(docId);
    index.parent.delete(docId);
    index.children.delete(docId);
    for (const childSet of index.children.values()) childSet.delete(docId);
    index.stepBlockers.delete(docId);
}

export async function updateIndexForFile(
    index: LinkIndex,
    loomRoot: string,
    filePath: string,
    event: 'create' | 'change' | 'delete'
): Promise<void> {
    const weavesDir = path.join(loomRoot, 'loom');
    const docId = path.basename(filePath, '.md');
    removeDocumentFromIndex(index, docId);
    if (event === 'delete') {
        index.documents.set(docId, { path: filePath, type: 'idea', exists: false, archived: filePath.includes('.archive') });
        return;
    }
    try {
        const doc = await loadDoc(filePath) as Document;
        index.documents.set(docId, { path: filePath, type: doc.type, exists: true, archived: filePath.includes('.archive'), threadId: extractThreadId(filePath, weavesDir) });
        if (doc.parent_id) index.parent.set(docId, doc.parent_id);
        if (doc.child_ids) {
            for (const childId of doc.child_ids) {
                if (!index.children.has(docId)) index.children.set(docId, new Set());
                index.children.get(docId)!.add(childId);
            }
        }
        if (doc.type === 'plan') {
            const planDoc = doc as PlanDoc;
            const blockers: StepBlocker[] = [];
            if (planDoc.steps) {
                for (const step of planDoc.steps) {
                    if (step.blockedBy && step.blockedBy.length > 0) {
                        blockers.push({ step: step.order, blockedBy: step.blockedBy });
                    }
                }
            }
            if (blockers.length > 0) index.stepBlockers.set(docId, blockers);
        }
    } catch (e) {
        index.documents.set(docId, { path: filePath, type: 'idea', exists: false, archived: filePath.includes('.archive') });
    }
}