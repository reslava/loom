import * as fs from 'fs-extra';
import * as path from 'path';
import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, ChatDoc, IdeaDoc, DesignDoc, createBaseFrontmatter, generateDocId, singletonFileName } from '../../core/dist';
import { buildSummarizationMessages, parseTitleAndBody } from './utils/aiSummarization';
import { resolveThreadFolder } from './utils/resolveThreadFolder';

export interface PromoteToDesignInput {
    filePath: string;
    targetWeaveSlug?: string;
    targetThreadUlid?: string;
    /** Optional title for the new doc, used when `body` is provided (skips AI). Defaults to the source doc title. */
    title?: string;
    /** Optional inline body. When provided, sampling is skipped and this is used verbatim — required in Claude Code where sampling is blocked. */
    body?: string;
}

export interface PromoteToDesignDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    aiClient: AIClient;
    loomRoot: string;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system.
Your task: read the provided document and produce a design doc that formalizes the idea or conversation.
Respond with exactly this format — nothing else before or after:

TITLE: <one concise line describing the design>

## Goal
<what this design achieves in 1-2 sentences>

## Context
<background, constraints, and motivation>

## Design
<the proposed solution — architecture, key decisions, trade-offs>

## Decisions
<list of concrete decisions made, one per bullet>

## Open questions
<anything still unresolved>`;

export async function promoteToDesign(
    input: PromoteToDesignInput,
    deps: PromoteToDesignDeps
): Promise<{ filePath: string; title: string }> {
    const doc = await deps.loadDoc(input.filePath) as ChatDoc | IdeaDoc;

    // Resolve the target: an explicit targetThreadUlid is a stable th_ ULID → folder
    // (never fabricates); a derived location already yields the folder slug.
    let weaveSlug: string;
    let threadSlug: string | undefined;
    if (input.targetWeaveSlug) {
        weaveSlug = input.targetWeaveSlug;
        threadSlug = input.targetThreadUlid
            ? (await resolveThreadFolder(input.targetWeaveSlug, input.targetThreadUlid, {
                getActiveLoomRoot: () => deps.loomRoot, loadDoc: deps.loadDoc, fs: deps.fs,
            })).threadSlug
            : undefined;
    } else {
        ({ weaveSlug, threadSlug } = deriveLocation(input.filePath, deps.loomRoot));
    }

    let title: string;
    let body: string;
    if (input.body !== undefined) {
        body = input.body;
        title = input.title ?? doc.title;
    } else {
        if (!doc.content || doc.content.trim().length === 0) {
            throw new Error(`${doc.type} document is empty.`);
        }
        const label = doc.type === 'chat'
            ? 'chat conversation'
            : `${doc.type} document titled "${doc.title}"`;
        const messages = buildSummarizationMessages(SYSTEM_PROMPT, label, doc.content);
        const reply = await deps.aiClient.complete(messages);
        ({ title, body } = parseTitleAndBody(reply));
    }

    const targetDir = threadSlug
        ? path.join(deps.loomRoot, 'loom', weaveSlug, threadSlug)
        : path.join(deps.loomRoot, 'loom', weaveSlug);
    await deps.fs.ensureDir(targetDir);

    let designFilename: string;
    let filePath: string;
    if (threadSlug) {
        // Thread-level: canonical filename is the flat singleton design.md (one per thread).
        filePath = path.join(targetDir, singletonFileName('design'));
        // Dual-read the singleton guard: refuse if either the flat or legacy design exists.
        const legacyDesign = path.join(targetDir, `${threadSlug}-design.md`);
        if ((await deps.fs.pathExists(filePath)) || (await deps.fs.pathExists(legacyDesign))) {
            throw new Error(`Thread '${threadSlug}' already has a design. Refine the existing one instead.`);
        }
    } else {
        // Weave-root doc: kebab-of-title
        const existingFiles = await deps.fs.readdir(targetDir).catch(() => [] as string[]);
        designFilename = generateDesignId(title, weaveSlug, existingFiles);
        filePath = path.join(targetDir, `${designFilename}.md`);
    }

    const designId = generateDocId('design');
    const frontmatter = createBaseFrontmatter('design', designId, title, doc.id);
    const designDoc: DesignDoc = {
        ...frontmatter,
        type: 'design',
        status: 'draft',
        content: input.body !== undefined ? body : `# ${title}\n\n${body}`,
    } as DesignDoc;

    await deps.saveDoc(designDoc, filePath);

    return { filePath, title };
}

function deriveLocation(filePath: string, loomRoot: string): { weaveSlug: string; threadSlug?: string } {
    const rel = path.relative(path.join(loomRoot, 'loom'), filePath);
    const parts = rel.split(/[\\/]/);
    if (parts.length < 2) throw new Error(`Cannot derive weave from path: ${rel}`);
    const weaveSlug = parts[0];
    if (parts.length >= 3 && parts[1] === 'chats') return { weaveSlug };
    if (parts.length >= 3) return { weaveSlug, threadSlug: parts[1] };
    return { weaveSlug };
}

function generateDesignId(title: string, weaveSlug: string, existingFiles: string[]): string {
    const kebab = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    const base = `${weaveSlug}-${kebab}-design`;
    const taken = new Set(existingFiles.map(f => f.replace(/\.md$/, '')));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
}
