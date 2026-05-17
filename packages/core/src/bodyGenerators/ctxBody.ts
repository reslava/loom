export interface CtxSummaryData {
    /** The problem statement / goal of the design. */
    goal: string;
    /** The context / background of the design. */
    context: string;
    /** List of key decisions made. */
    decisions: string[];
    /** List of open questions. */
    questions: string[];
    /** List of active plans with their status and progress. */
    plans: Array<{ id: string; status: string; progress: string }>;
}

/**
 * Generates the Markdown body for a context summary (ctx) document.
 * @param data - The summary data to include in the body.
 * @returns The complete Markdown body (excluding frontmatter).
 */
export function generateCtxBody(data: CtxSummaryData): string {
    const decisions = data.decisions.map(d => `- ${d}`).join('\n');
    const questions = data.questions.map(q => `- ${q}`).join('\n');
    const plans = data.plans.map(p => `- ${p.id} (status: ${p.status}, progress: ${p.progress})`).join('\n');
    const now = new Date().toISOString();

    return `
## Problem Statement
${data.goal}

## Context
${data.context}

## Key Decisions Made
${decisions}

## Open Questions
${questions}

## Active Plans
${plans}

---
*Generated: ${now}*
`;
}