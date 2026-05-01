export interface PlanStep {
    order: number;
    description: string;
    done: boolean;
    files_touched: string[];
    blockedBy: string[];
}

/**
 * Parses the steps table from a plan document's Markdown content.
 */
export function parseStepsTable(content: string): PlanStep[] {
    const steps: PlanStep[] = [];
    
    // Find the steps section: from "# Steps" to the next "---" or "##" or end of file
    const stepsSectionMatch = content.match(/# Steps\s*\n([\s\S]*?)(?=\n---|\n##|$)/i);
    if (!stepsSectionMatch) return steps;
    
    const section = stepsSectionMatch[1];
    const lines = section.split('\n');
    
    for (const line of lines) {
        // Skip lines that don't look like table rows
        if (!line.includes('|') || line.includes('|---')) continue;
        // Skip the header row
        if (line.includes('Done') && line.includes('Step')) continue;
        
        const cols = line.split('|').slice(1, -1).map(c => c.trim());
        if (cols.length < 4) continue;
        
        // Expected columns: Done, #, Step, Files touched, Blocked by
        const doneSymbol = cols[0];
        const order = parseInt(cols[1], 10);
        const description = cols[2];
        const filesTouched = (cols[3] === '—' || cols[3] === '-') ? [] : cols[3].split(',').map(s => s.trim());
        const blockedByRaw = cols[4] || '—';
        
        const done = doneSymbol === '✅';
        const blockedBy = (blockedByRaw === '—' || blockedByRaw === '-') ? [] : blockedByRaw.split(',').map(s => s.trim());
        
        if (!isNaN(order)) {
            steps.push({ order, description, done, files_touched: filesTouched, blockedBy });
        }
    }
    
    return steps;
}

/**
 * Generates the steps table Markdown from an array of plan steps.
 */
export function generateStepsTable(steps: PlanStep[]): string {
    if (!steps.length) return '';
    
    const header = '| Done | # | Step | Files touched | Blocked by |';
    const separator = '|---|---|---|---|---|';
    const rows = steps.map(s => {
        const done = s.done ? '✅' : '🔳';
        const files = s.files_touched?.length ? s.files_touched.join(', ') : '—';
        const blockers = s.blockedBy?.length ? s.blockedBy.join(', ') : '—';
        return `| ${done} | ${s.order} | ${s.description} | ${files} | ${blockers} |`;
    });
    
    return [header, separator, ...rows].join('\n');
}

/**
 * Replaces or appends the steps table in the given document content.
 */
export function updateStepsTableInContent(originalContent: string, steps: PlanStep[]): string {
    const newTable = generateStepsTable(steps);
    
    const stepsRegex = /# Steps\s*\n([\s\S]*?)(?=\n---|\n##|$)/i;
    if (stepsRegex.test(originalContent)) {
        return originalContent.replace(stepsRegex, `# Steps\n\n${newTable}`);
    }
    
    const goalRegex = /(# Goal\s*\n[\s\S]*?)(?=\n---|\n##|$)/i;
    if (goalRegex.test(originalContent)) {
        return originalContent.replace(goalRegex, `$1\n\n# Steps\n\n${newTable}`);
    }
    
    return `${originalContent}\n\n# Steps\n\n${newTable}`;
}