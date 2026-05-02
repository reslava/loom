import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, Message, PlanDoc } from '../../core/dist';

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

    const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Here is the plan document titled "${doc.title}":\n\n${doc.content}` },
    ];

    const reply = await deps.aiClient.complete(messages);

    const lines = reply.split('\n');
    const titleIdx = lines.findIndex(l => /^TITLE:\s*.+$/i.test(l));
    if (titleIdx === -1) {
        throw new Error(`AI response missing TITLE: line. Got: "${reply.slice(0, 200)}"`);
    }
    const title = lines[titleIdx].match(/^TITLE:\s*(.+)$/i)![1].trim();
    const body = lines.slice(titleIdx + 1).join('\n').trim();

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
