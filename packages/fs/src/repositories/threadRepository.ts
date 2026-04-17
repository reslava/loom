import * as path from 'path';
import * as fs from 'fs-extra';
import { Thread, Document, DesignDoc } from '../../../core/dist/types';
import { loadDoc, FrontmatterParseError } from '../serializers/frontmatterLoader';
import { saveDoc } from '../serializers/frontmatterSaver';
import { resolveThreadPath } from '../utils/workspaceUtils';
import { findMarkdownFiles } from '../utils/pathUtils';

export async function loadThread(threadId: string): Promise<Thread> {
  const threadPath = resolveThreadPath(threadId);
  if (!await fs.pathExists(threadPath)) {
    throw new Error(`Thread directory not found: ${threadPath}`);
  }
  const files = await findMarkdownFiles(threadPath);
  const docs: Document[] = [];
  for (const file of files) {
    try {
      docs.push(await loadDoc(file));
    } catch (e) {
      if (e instanceof FrontmatterParseError) console.warn(`Skipping ${file}: ${e.message}`);
      else throw e;
    }
  }
  const primaryDesign = docs.find(d => d.type === 'design' && (d as DesignDoc).role === 'primary') as DesignDoc | undefined;
  if (!primaryDesign) throw new Error(`No primary design found for thread '${threadId}'`);
  return {
    id: threadId,
    idea: docs.find(d => d.type === 'idea') as any,
    design: primaryDesign,
    supportingDesigns: docs.filter(d => d.type === 'design' && (d as DesignDoc).role !== 'primary') as DesignDoc[],
    plans: docs.filter(d => d.type === 'plan') as any,
    contexts: docs.filter(d => d.type === 'ctx') as any,
    allDocs: docs,
  };
}

function determinePathForDoc(doc: any, threadId: string): string {
  const threadPath = resolveThreadPath(threadId);
  switch (doc.type) {
    case 'idea': return path.join(threadPath, `${threadId}-idea.md`);
    case 'design': {
      if (doc.role === 'primary') return path.join(threadPath, `${threadId}-design.md`);
      return path.join(threadPath, `${doc.id}.md`);
    }
    case 'plan': return path.join(threadPath, 'plans', `${doc.id}.md`);
    case 'ctx': {
      if (doc.source_version !== undefined) return path.join(threadPath, `${threadId}-ctx.md`);
      return path.join(threadPath, 'ctx', `${doc.id}.md`);
    }
    default: throw new Error(`Unknown document type: ${doc.type}`);
  }
}

export async function saveThread(thread: Thread): Promise<void> {
  for (const doc of thread.allDocs) {
    let filePath = (doc as any)._path;
    if (!filePath) filePath = determinePathForDoc(doc, thread.id);
    await saveDoc(doc, filePath);
  }
}