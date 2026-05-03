import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, PlanDoc } from '../../core/dist';
import { buildSummarizationMessages, parseTitleAndBody } from './utils/aiSummarization';

export interface RefinePlanInput {
    filePath: string;
}

export interface RefinePlanDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    aiClient: AIClient;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system.
Your task: read this plan document and produce an improved version — clarify step descriptions, add missing steps, fix blocker references, improve the notes section.
Preserve steps already marked done (⬜ or ✅). Do not change their done status.
Respond with exactly this format — nothing else before or after:

TITLE: <improved or unchanged title>

## Goal
<what this plan implements in 1-2 sentences>

## Steps
| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ⬜ | 1 | <step> | <files> | — |

## Notes
<implementation notes, one bullet per step if needed>`;

export async function refinePlan(
    input: RefinePlanInput,
    deps: RefinePlanDeps
): Promise<{ filePath: string; version: number }> {
    const doc = await deps.loadDoc(input.filePath) as PlanDoc;

    const messages = buildSummarizationMessages(
        SYSTEM_PROMPT,
        `plan document titled "${doc.title}"`,
        doc.content,
    );

    const reply = await deps.aiClient.complete(messages);

    const { title, body } = parseTitleAndBody(reply);

    const today = new Date().toISOString().split('T')[0];
    const updated: PlanDoc = {
        ...doc,
        title,
        version: doc.version + 1,
        updated: today,
        content: `# ${title}\n\n${body}`,
    } as PlanDoc;

    await deps.saveDoc(updated, input.filePath);

    return { filePath: input.filePath, version: updated.version };
}
