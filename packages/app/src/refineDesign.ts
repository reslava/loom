import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, DesignDoc, designReducer } from '../../core/dist';
import { buildSummarizationMessages, parseTitleAndBody } from './utils/aiSummarization';

export interface RefineDesignInput {
    filePath: string;
}

export interface RefineDesignDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    aiClient: AIClient;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system.
Your task: read this design document and produce an improved version — sharpen the goal, clarify architecture, fill weak sections, surface decisions and open questions.
Respond with exactly this format — nothing else before or after:

TITLE: <improved or unchanged title>

## Goal
<what this design achieves in 1-2 sentences>

## Context
<background, constraints, motivation>

## Design
<the proposed solution — architecture, components, key decisions, trade-offs>

## Decisions
<concrete decisions made, one per bullet>

## Open questions
<anything still unresolved>`;

export async function refineDesign(
    input: RefineDesignInput,
    deps: RefineDesignDeps
): Promise<{ filePath: string; version: number }> {
    const doc = await deps.loadDoc(input.filePath) as DesignDoc;

    const messages = buildSummarizationMessages(
        SYSTEM_PROMPT,
        `design document titled "${doc.title}"`,
        doc.content,
    );

    const reply = await deps.aiClient.complete(messages);
    const { title, body } = parseTitleAndBody(reply);

    const refined = designReducer(doc, { type: 'REFINE_DESIGN' });
    const updated: DesignDoc = {
        ...refined,
        title,
        content: `# ${title}\n\n${body}`,
    };

    await deps.saveDoc(updated, input.filePath);

    return { filePath: input.filePath, version: updated.version };
}
