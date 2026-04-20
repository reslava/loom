import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { loadDoc } from '../../fs/dist';
import { generatePermanentId } from '../../core/dist';
import { createBaseFrontmatter } from '../../core/dist';
import { generateDesignBody } from '../../core/dist';
import { DesignDoc, IdeaDoc } from '../../core/dist';

export interface WeaveDesignInput {
    threadId: string;
    title?: string;
}

export interface WeaveDesignDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fs;
}

interface IdeaInfo {
    id: string;
    title: string;
    status: string;
    filePath: string;
    content: string;
}

async function findIdeaFile(threadPath: string, deps: WeaveDesignDeps): Promise<IdeaInfo | null> {
    const entries = await deps.fs.readdir(threadPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('-idea.md')) continue;
        
        const ideaPath = path.join(threadPath, entry.name);
        const content = await deps.fs.readFile(ideaPath, 'utf8');
        const idMatch = content.match(/^id:\s*["']?(.+?)["']?\s*$/m);
        const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        const statusMatch = content.match(/^status:\s*["']?(.+?)["']?\s*$/m);
        
        return {
            id: idMatch ? idMatch[1] : path.basename(entry.name, '.md'),
            title: titleMatch ? titleMatch[1] : path.basename(entry.name, '-idea.md'),
            status: statusMatch ? statusMatch[1] : 'draft',
            filePath: ideaPath,
            content,
        };
    }
    return null;
}

async function finalizeIdea(
    ideaPath: string,
    threadPath: string,
    deps: WeaveDesignDeps
): Promise<{ newId: string; title: string }> {
    const idea = await deps.loadDoc(ideaPath) as IdeaDoc;
    
    if (!idea.id.startsWith('new-')) {
        return { newId: idea.id, title: idea.title };
    }
    
    const existingIds = new Set<string>();
    const entries = await deps.fs.readdir(threadPath);
    for (const entry of entries) {
        if (entry.endsWith('.md')) {
            existingIds.add(entry.replace('.md', ''));
        }
    }
    existingIds.delete(idea.id);
    
    const permanentId = generatePermanentId(idea.title, 'idea', existingIds);
    
    const updatedIdea: IdeaDoc = {
        ...idea,
        id: permanentId,
        status: 'active',
        updated: new Date().toISOString().split('T')[0],
    };
    
    const newPath = path.join(threadPath, `${permanentId}.md`);
    await deps.saveDoc(updatedIdea, newPath);
    await deps.fs.remove(ideaPath);
    
    return { newId: permanentId, title: idea.title };
}

export async function weaveDesign(
    input: WeaveDesignInput,
    deps: WeaveDesignDeps
): Promise<{ id: string; filePath: string; autoFinalized: boolean }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadPath = path.join(loomRoot, 'threads', input.threadId);
    
    // Ensure the thread directory exists
    await deps.fs.ensureDir(threadPath);
    
    // Look for an existing idea
    const idea = await findIdeaFile(threadPath, deps);
    
    let parentId: string | null = null;
    let designTitle = input.title || input.threadId;
    let autoFinalized = false;
    
    if (idea) {
        let ideaId = idea.id;
        let ideaTitle = idea.title;
        
        if (ideaId.startsWith('new-')) {
            const finalized = await finalizeIdea(idea.filePath, threadPath, deps);
            ideaId = finalized.newId;
            ideaTitle = finalized.title;
            autoFinalized = true;
        }
        
        parentId = ideaId;
        designTitle = input.title || ideaTitle;
    }
    
    // Generate design ID (no parent required)
    const existingIds = new Set<string>();
    const entries = await deps.fs.readdir(threadPath);
    for (const entry of entries) {
        if (entry.endsWith('.md')) {
            existingIds.add(entry.replace('.md', ''));
        }
    }
    
    const permanentId = generatePermanentId(designTitle, 'design', existingIds);
    const frontmatter = createBaseFrontmatter('design', permanentId, designTitle, parentId);
    (frontmatter as any).role = 'primary';
    
    const content = generateDesignBody(designTitle, 'User');
    
    const doc: DesignDoc = {
        ...frontmatter,
        content,
    } as DesignDoc;
    
    const filePath = path.join(threadPath, `${permanentId}.md`);
    await deps.saveDoc(doc, filePath);
    
    return { id: permanentId, filePath, autoFinalized };
}