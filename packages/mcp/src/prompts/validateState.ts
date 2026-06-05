import { handleDiagnosticsResource } from '../resources/diagnostics';
import { handleSummaryResource } from '../resources/summary';

export const promptDef = {
    name: 'validate-state',
    description: 'Load project diagnostics and summary, return a prompt to review issues and propose fixes.',
    arguments: [],
};

export async function handle(root: string, _args: Record<string, string | undefined>) {
    const [diagnostics, summary] = await Promise.all([
        handleDiagnosticsResource(root),
        handleSummaryResource(root),
    ]);

    const diagText = diagnostics.contents[0].text;
    const summaryText = summary.contents[0].text;

    return {
        description: 'Loom state diagnostics review',
        messages: [
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: `## Loom Diagnostics\n\n${diagText}\n\n## Summary\n\n${summaryText}`,
                },
            },
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: 'Review the diagnostics and summary above. Identify issues (broken links, stale docs, orphaned documents, and requirement scope-coverage gaps — uncovered Included reqs, steps citing an Excluded req, or dangling citations) and propose concrete fixes using the available Loom tools.',
                },
            },
        ],
    };
}
