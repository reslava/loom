import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { loadDoc, saveDoc } from '../../fs/dist';
import { AIClient, PlanDoc, PlanStep, parseStepsTable, today } from '../../core/dist';
import { buildSummarizationMessages, parseTitleAndBody } from './utils/aiSummarization';
import { parentDesignVersion } from './weavePlan';

export interface RefinePlanInput {
    filePath: string;
    extraContext?: string;
}

export interface RefinePlanDeps {
    loadDoc: typeof loadDoc;
    saveDoc: typeof saveDoc;
    aiClient: AIClient;
    fs: typeof fsExtra;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system.
Your task: read this plan document and produce an improved version — clarify step descriptions, add missing steps, fix blocker references, improve the notes section.
Preserve steps already marked done (✅). Do not change their done status.
If the Additional Context contains a locked requirements (req) doc — sections ✅ Included / ❌ Excluded / ⛓ Constraints, each item prefixed with an inline-code \`IN\`/\`EX\`/\`C\` id — then:
- Treat every ❌ Excluded item and ⛓ Constraint as a HARD BOUNDARY: never add a step that pursues Excluded work.
- Make sure every ✅ Included item is advanced by at least one step.
- In each step's Satisfies cell, list the \`IN\`/\`C\` ids that step advances (comma-separated, or — if none). Never cite an \`EX\` id positively.
- Keep any Satisfies ids already present on a step unless you remove the step itself.
Respond with exactly this format — nothing else before or after:

TITLE: <improved or unchanged title>

## Goal
<what this plan implements in 1-2 sentences>

## Steps
| Done | # | Step | Files touched | Blocked by | Satisfies |
|------|---|------|---------------|------------|-----------|
| 🔳 | 1 | <step> | <files> | — | — |

## Notes
<implementation notes, one bullet per step if needed>`;

export async function refinePlan(
    input: RefinePlanInput,
    deps: RefinePlanDeps
): Promise<{ filePath: string; version: number }> {
    const doc = await deps.loadDoc(input.filePath) as PlanDoc;

    const content = input.extraContext
        ? `## Additional Context\n\n${input.extraContext}\n\n---\n\n${doc.content}`
        : doc.content;
    const messages = buildSummarizationMessages(
        SYSTEM_PROMPT,
        `plan document titled "${doc.title}"`,
        content,
    );

    const reply = await deps.aiClient.complete(messages);

    const { title, body } = parseTitleAndBody(reply);

    // Re-parse the refined table so the AI's step edits and Satisfies citations
    // actually take effect (saveDoc regenerates the table from PlanDoc.steps).
    // Merge against the loaded steps so a refine never (a) changes a step's done
    // status or (b) silently strips a citation the table previously carried.
    const parsedSteps = parseStepsTable(body);
    const oldByOrder = new Map((doc.steps ?? []).map(s => [s.order, s]));
    const mergedSteps: PlanStep[] = parsedSteps.length > 0
        ? parsedSteps.map(s => {
            const prev = oldByOrder.get(s.order);
            return {
                ...s,
                status: prev ? prev.status : s.status,
                satisfies: s.satisfies.length ? s.satisfies : (prev?.satisfies ?? []),
            };
        })
        : (doc.steps ?? []); // malformed/empty AI table → keep existing steps, never wipe

    // Re-baseline the staleness marker: a refine brings the plan up to the current
    // design, so stamp design_version = the live design version. Without this, refine
    // bumps the plan's own version but leaves the stale baseline behind, so the plan
    // stays flagged "stale" forever — the very operation meant to clear it never could.
    const threadDir = path.dirname(path.dirname(input.filePath));
    const threadId = path.basename(threadDir);
    const design = await parentDesignVersion(threadDir, threadId, { loadDoc: deps.loadDoc, fs: deps.fs });

    const updated: PlanDoc = {
        ...doc,
        title,
        version: doc.version + 1,
        updated: today(),
        ...(design ? { design_version: design.version } : {}),
        steps: mergedSteps,
        content: `# ${title}\n\n${body}`,
    } as PlanDoc;

    await deps.saveDoc(updated, input.filePath);

    return { filePath: input.filePath, version: updated.version };
}
