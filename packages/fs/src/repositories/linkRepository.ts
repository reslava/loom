import * as path from 'path';
import { loadDoc } from '../serializers/frontmatterLoader';
import { getActiveLoomRoot } from '../utils/workspaceUtils';
import { findMarkdownFiles } from '../utils/pathUtils';
import { LinkIndex, createEmptyIndex, DocumentEntry, StepBlocker } from '../../../core/dist/linkIndex';
import { Document, PlanDoc } from '../../../core/dist/types';

export async function buildLinkIndex(): Promise<LinkIndex> {
  const loomRoot = getActiveLoomRoot();
  const index = createEmptyIndex();
  const allFiles = await findMarkdownFiles(loomRoot);
  for (const filePath of allFiles) {
    try {
      const doc = await loadDoc(filePath) as Document;
      const docId = doc.id;
      index.documents.set(docId, { path: filePath, type: doc.type, exists: true });
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
  filePath: string,
  event: 'create' | 'change' | 'delete'
): Promise<void> {
  const docId = path.basename(filePath, '.md');
  removeDocumentFromIndex(index, docId);
  if (event === 'delete') {
    index.documents.set(docId, { path: filePath, type: 'idea', exists: false });
    return;
  }
  try {
    const doc = await loadDoc(filePath) as Document;
    index.documents.set(docId, { path: filePath, type: doc.type, exists: true });
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
    index.documents.set(docId, { path: filePath, type: 'idea', exists: false });
  }
}