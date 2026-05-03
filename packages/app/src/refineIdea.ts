import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, IdeaDoc, ideaReducer } from '../../core/dist';
import { buildSummarizationMessages, parseTitleAndBody } from './utils/aiSummarization';

export interface RefineIdeaInput {
    filePath: string;
}

export interface RefineIdeaDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    aiClient: AIClient;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system.
Your task: read this idea document and produce an improved version — sharpen the problem statement, clarify the concept, fill in weak sections.
Respond with exactly this format — nothing else before or after:

TITLE: <improved or unchanged title>

## Problem
<what pain or gap this idea addresses>

## Idea
<the core concept in 2-3 sentences>

## Why now
<what makes this worth pursuing>

## Open questions
<what needs to be answered before committing to a design>

## Next step
<design | spike | discard>`;

export async function refineIdea(
    input: RefineIdeaInput,
    deps: RefineIdeaDeps
): Promise<{ filePath: string; version: number }> {
    const doc = await deps.loadDoc(input.filePath) as IdeaDoc;

    const messages = buildSummarizationMessages(
        SYSTEM_PROMPT,
        `idea document titled "${doc.title}"`,
        doc.content,
    );

    const reply = await deps.aiClient.complete(messages);

    const { title, body } = parseTitleAndBody(reply);

    const refined = ideaReducer(doc, { type: 'REFINE_IDEA' });
    const updated: IdeaDoc = {
        ...refined,
        title,
        content: `# ${title}\n\n${body}`,
    };

    await deps.saveDoc(updated, input.filePath);

    return { filePath: input.filePath, version: updated.version };
}
