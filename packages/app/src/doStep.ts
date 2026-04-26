import * as fs from 'fs-extra';
import * as path from 'path';
import { saveDoc } from '../../fs/dist';
import { generateChatId, createBaseFrontmatter, AIClient, Message } from '../../core/dist';
import { ChatDoc } from '../../core/dist';
import { PlanDoc } from '../../core/dist/entities/plan';

export interface DoStepInput {
    planId: string;
    steps: number[];
}

export interface DoStepDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    aiClient: AIClient;
    loomRoot: string;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, helping implement plan steps.
The user will provide a plan and the specific steps to implement now.

Your response must be thorough — this document is the permanent implementation record:
1. Describe exactly what needs to be done for each step.
2. List every file that needs to be created or modified, with the specific changes.
3. Note any decisions you made that were not specified in the plan.
4. If you reach a blocking decision that requires human input, state it clearly and end your response with "BLOCKED: <reason>".
5. Do not summarize — be detailed and complete.`;

export async function doStep(
    input: DoStepInput,
    deps: DoStepDeps
): Promise<{ chatPath: string; chatId: string }> {
    const weaveId = input.planId.split('-plan-')[0];
    if (!weaveId) throw new Error(`Invalid plan ID: "${input.planId}"`);

    const weave = await deps.loadWeave(deps.loomRoot, weaveId);
    const plan = weave.threads.flatMap((t: any) => t.plans).find((p: PlanDoc) => p.id === input.planId) as PlanDoc | undefined;
    if (!plan) throw new Error(`Plan '${input.planId}' not found in weave '${weaveId}'.`);

    const selectedSteps = input.steps
        .map(n => plan.steps.find(s => s.order === n))
        .filter((s): s is NonNullable<typeof s> => s !== undefined);
    if (selectedSteps.length === 0) throw new Error('No valid steps selected.');

    const stepLines = selectedSteps
        .map(s => `- Step ${s.order}: ${s.description}${s.files_touched.length ? ` (files: ${s.files_touched.join(', ')})` : ''}`)
        .join('\n');

    const planSummary = plan.steps
        .map(s => `${s.done ? '✅' : '⬜'} Step ${s.order}: ${s.description}`)
        .join('\n');

    const userMessage = [
        `Plan: ${plan.title} (${input.planId})`,
        `Status: ${plan.status}`,
        '',
        '=== Full step list ===',
        planSummary,
        '',
        '=== Steps to implement now ===',
        stepLines,
    ].join('\n');

    const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
    ];

    const aiResponse = await deps.aiClient.complete(messages);

    const weavePath = path.join(deps.loomRoot, 'loom', weaveId);
    const chatsDir = path.join(weavePath, 'ai-chats');
    await deps.fs.ensureDir(chatsDir);

    const existingFiles = await deps.fs.readdir(chatsDir).catch(() => [] as string[]);
    const existingChatIds = existingFiles
        .filter((f: string) => f.match(/-chat(-\d+)?\.md$/))
        .map((f: string) => f.replace(/\.md$/, ''));

    const chatId = generateChatId(weaveId, existingChatIds);
    const stepLabel = input.steps.length === 1 ? `Step ${input.steps[0]}` : `Steps ${input.steps.join(', ')}`;
    const title = `${plan.title} — ${stepLabel}`;

    const userContent = `Implement ${stepLabel} of plan \`${input.planId}\`:\n\n${stepLines}`;
    const chatContent = `# CHAT\n\n## Rafa:\n${userContent}\n\n## AI:\n${aiResponse.trim()}\n`;

    const frontmatter = createBaseFrontmatter('chat', chatId, title, input.planId);
    const doc: ChatDoc = {
        ...frontmatter,
        type: 'chat',
        status: 'active',
        content: chatContent,
    };

    const chatPath = path.join(chatsDir, `${chatId}.md`);
    await deps.saveDoc(doc, chatPath);

    return { chatPath, chatId };
}
