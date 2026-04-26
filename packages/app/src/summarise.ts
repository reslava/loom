import * as fs from 'fs-extra';
import * as path from 'path';
import { serializeFrontmatter } from '../../core/dist/frontmatterUtils';
import { AIClient, Message } from '../../core/dist';

export interface SummariseInput {
    weaveId: string;
    force?: boolean;
}

export interface SummariseDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    getActiveLoomRoot: (wsRoot?: string) => string;
    fs: typeof fs;
    loomRoot: string;
    aiClient?: AIClient;
}

const SYSTEM_PROMPT = `You are an AI assistant embedded in REslava Loom, a document-driven workflow system.
Produce a concise context summary for this weave. The summary will be saved as a -ctx.md file that developers load to quickly understand the current state of a feature.
Respond with plain Markdown content only (no frontmatter, no title heading) with exactly these sections:

## Problem Statement
<what problem this weave addresses>

## Context
<background, constraints, and key motivations>

## Key Decisions Made
<bullet list of concrete decisions already locked in>

## Open Questions
<bullet list of questions still unresolved>

## Active Plans
<bullet list of plans with status and step progress>`;

export async function summarise(
    input: SummariseInput,
    deps: SummariseDeps
): Promise<{ ctxPath: string; generated: boolean }> {
    const weave = await deps.loadWeave(deps.loomRoot, input.weaveId);
    const primaryDesign = weave.threads.find((t: any) => t.design)?.design;
    if (!primaryDesign) {
        throw new Error(`Weave '${input.weaveId}' has no design document.`);
    }

    const loomRoot = deps.getActiveLoomRoot(deps.loomRoot);
    const ctxPath = path.join(loomRoot, 'loom', input.weaveId, `${input.weaveId}-ctx.md`);

    if (!input.force && deps.fs.existsSync(ctxPath)) {
        const raw = await deps.fs.readFile(ctxPath, 'utf8');
        const sourceVersionMatch = raw.match(/^source_version:\s*(\d+)/m);
        if (sourceVersionMatch && Number(sourceVersionMatch[1]) === primaryDesign.version) {
            return { ctxPath, generated: false };
        }
    }

    const planLines = weave.threads.flatMap((t: any) => t.plans).map((p: any) => {
        const done = p.steps?.filter((s: any) => s.done).length ?? 0;
        const total = p.steps?.length ?? 0;
        return `- ${p.id} (${p.status}, ${done}/${total} steps)`;
    }).join('\n') || '(none)';

    const ideaLines = [
        ...weave.threads.map((t: any) => t.idea).filter(Boolean),
        ...weave.looseFibers.filter((f: any) => f.type === 'idea'),
    ].map((i: any) => `- ${i.title} (${i.status})`).join('\n') || '(none)';

    const doneLines = weave.threads.flatMap((t: any) => t.dones).map((d: any) => {
        const decisions = (d.content ?? '')
            .split('\n')
            .filter((l: string) => l.startsWith('- '))
            .slice(0, 5)
            .join('\n');
        const openItems = (() => {
            const openIdx = (d.content ?? '').indexOf('## Open items');
            if (openIdx === -1) return '';
            return d.content.slice(openIdx + '## Open items'.length).trim().split('\n').filter((l: string) => l.startsWith('- ')).slice(0, 5).join('\n');
        })();
        return [
            `### ${d.title} (parent: ${d.parent_id})`,
            decisions ? `**Decisions made:**\n${decisions}` : '',
            openItems ? `**Open items:**\n${openItems}` : '',
        ].filter(Boolean).join('\n');
    }).join('\n\n') || '(none)';

    const userMessage = [
        `Weave: ${input.weaveId}`,
        `Primary design: ${primaryDesign.title} (v${primaryDesign.version})`,
        '',
        '=== Design document ===',
        primaryDesign.content || '',
        '',
        '=== Ideas ===',
        ideaLines,
        '',
        '=== Plans ===',
        planLines,
        '',
        '=== Done docs (implementation records) ===',
        doneLines,
    ].join('\n');

    const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
    ];

    if (!deps.aiClient) {
        throw new Error('No AI client configured. Set reslava-loom.ai.apiKey in VS Code settings.');
    }
    const summaryBody = await deps.aiClient.complete(messages);

    const now = new Date().toISOString();
    const summaryFrontmatter = {
        type: 'ctx',
        id: `${input.weaveId}-ctx`,
        title: `Context Summary — ${primaryDesign.title}`,
        status: 'active',
        created: now.split('T')[0],
        version: 1,
        tags: ['ctx', 'summary'],
        parent_id: primaryDesign.id,
        requires_load: [],
        source_version: primaryDesign.version,
    };

    const frontmatterStr = serializeFrontmatter(summaryFrontmatter);
    const output = `${frontmatterStr}\n# Context Summary — ${primaryDesign.title}\n\n${summaryBody.trim()}\n\n---\n*Generated: ${now}*\n`;
    await deps.fs.writeFile(ctxPath, output);

    return { ctxPath, generated: true };
}
