export interface PlanStep {
    order: number;
    description: string;
    done: boolean;
    files_touched: string[];
    blockedBy: string[];
    /** Requirement ids (IN/C handles from the thread's req) this step advances. */
    satisfies: string[];
}

/**
 * Parses the steps table from a plan document's Markdown content.
 */
export function parseStepsTable(content: string): PlanStep[] {
    const steps: PlanStep[] = [];
    
    // Find the steps section: matches "## Steps" (canonical) or "# Steps" (legacy, pre-H1-sync).
    // Boundary is any heading (#{1,6}) or a --- rule, so an h3 section (e.g. "### Notes")
    // directly after the table is treated as the end of the section, not part of it.
    const stepsSectionMatch = content.match(/(?:^|\n)#{1,2} Steps\s*\n([\s\S]*?)(?=\n---|\n#{1,6}\s|$)/i);
    if (!stepsSectionMatch) return steps;
    
    const section = stepsSectionMatch[1];
    const lines = section.split('\n');
    
    for (const line of lines) {
        // Skip lines that don't look like table rows
        if (!line.includes('|') || line.includes('|---')) continue;

        // Split on UNESCAPED pipes only, then un-escape \| back to | so a step
        // description containing a literal pipe (e.g. a code span "a | b") is read
        // back as a single cell rather than spilling across columns.
        const cols = line.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim().replace(/\\\|/g, '|'));
        if (cols.length < 4) continue;

        // Skip the header row by exact cell match. A substring test (line includes
        // "Done" && "Step") false-positived on data rows whose Files cell names files
        // like appendDone.ts and doStep.ts, silently dropping that step from the plan.
        if (cols[0] === 'Done' && cols[2] === 'Step') continue;
        
        // Expected columns: Done, #, Step, Files touched, Blocked by, [Satisfies].
        // Satisfies is appended last so older 5-column tables still parse (→ []).
        const doneSymbol = cols[0];
        const order = parseInt(cols[1], 10);
        const description = cols[2];
        const filesTouched = (cols[3] === '—' || cols[3] === '-') ? [] : cols[3].split(',').map(s => s.trim());
        const blockedByRaw = cols[4] || '—';
        const satisfiesRaw = cols[5] || '—';

        const done = doneSymbol === '✅';
        const blockedBy = (blockedByRaw === '—' || blockedByRaw === '-') ? [] : blockedByRaw.split(',').map(s => s.trim());
        const satisfies = (satisfiesRaw === '—' || satisfiesRaw === '-') ? [] : satisfiesRaw.split(',').map(s => s.trim());

        if (!isNaN(order)) {
            steps.push({ order, description, done, files_touched: filesTouched, blockedBy, satisfies });
        }
    }
    
    return steps;
}

/**
 * Generates the steps table Markdown from an array of plan steps.
 */
/** Escape pipes so cell text never spills into adjacent table columns. */
function escapeCell(value: string): string {
    return value.replace(/\|/g, '\\|');
}

export function generateStepsTable(steps: PlanStep[]): string {
    if (!steps.length) return '';

    const header = '| Done | # | Step | Files touched | Blocked by | Satisfies |';
    const separator = '|---|---|---|---|---|---|';
    const rows = steps.map(s => {
        const done = s.done ? '✅' : '🔳';
        const files = s.files_touched?.length ? s.files_touched.join(', ') : '—';
        const blockers = s.blockedBy?.length ? s.blockedBy.join(', ') : '—';
        const satisfies = s.satisfies?.length ? s.satisfies.join(', ') : '—';
        return `| ${done} | ${s.order} | ${escapeCell(s.description)} | ${escapeCell(files)} | ${escapeCell(blockers)} | ${escapeCell(satisfies)} |`;
    });

    return [header, separator, ...rows].join('\n');
}

/**
 * Replaces or appends the steps table in the given document content.
 */
export function updateStepsTableInContent(originalContent: string, steps: PlanStep[]): string {
    const newTable = generateStepsTable(steps);

    // Boundary is any heading (#{1,6}) or a --- rule. Critically, this must stop at an
    // h3 such as "### Notes" sitting directly after the table with no preceding ---,
    // otherwise the lazy match runs to EOF and the replacement deletes that section
    // (data-loss bug — h3 content after the steps table was silently dropped on save).
    const stepsRegex = /(?<=^|\n)#{1,2} Steps\s*\n([\s\S]*?)(?=\n---|\n#{1,6}\s|$)/i;
    if (stepsRegex.test(originalContent)) {
        return originalContent.replace(stepsRegex, `## Steps\n\n${newTable}`);
    }

    const goalRegex = /(#{1,2} Goal\s*\n[\s\S]*?)(?=\n---|\n#{1,2}\s|$)/i;
    if (goalRegex.test(originalContent)) {
        return originalContent.replace(goalRegex, `$1\n\n## Steps\n\n${newTable}`);
    }

    return `${originalContent}\n\n## Steps\n\n${newTable}`;
}