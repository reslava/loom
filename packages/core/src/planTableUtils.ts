import { PlanStep, StepStatus } from './entities/plan';

// Single source of the step model lives in entities/plan.ts. This module owns the
// Markdown <-> structured-steps mapping: parsing (migration/legacy read path) and
// serialization (the canonical generated view).

const SYMBOL_BY_STATUS: Record<StepStatus, string> = {
    pending: '\u{1F533}',      // 🔳
    in_progress: '\u{1F504}',  // 🔄
    done: '✅',            // ✅
    cancelled: '❌',       // ❌
};

function statusFromSymbol(symbol: string): StepStatus {
    switch (symbol) {
        case '✅': return 'done';
        case '\u{1F504}': return 'in_progress';
        case '❌': return 'cancelled';
        default: return 'pending';
    }
}

/** Derive a stable, unique-within-plan slug id from a step's title/description. */
export function slugifyStepId(text: string, taken: Set<string>): string {
    const base = (text || 'step')
        .toLowerCase()
        .replace(/`[^`]*`/g, ' ')        // drop code spans before slugging
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .split('-').slice(0, 6).join('-') || 'step';
    let id = base;
    let n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;
    taken.add(id);
    return id;
}

/** Short heading title from a (possibly long) description: first clause, capped. */
function titleFromDescription(description: string): string {
    const firstClause = description.split(/[.;]/)[0].trim();
    return firstClause.length > 80 ? `${firstClause.slice(0, 77)}...` : firstClause;
}

/**
 * Parses the steps table from a plan document's Markdown content.
 *
 * Synthesizes the structured fields the canonical model needs but legacy tables
 * lack — `id` (slug), `status` (from the symbol), and `title` (from description).
 * This is the legacy/migration read path; once steps live in frontmatter it is no
 * longer the source of truth.
 */
export function parseStepsTable(content: string): PlanStep[] {
    const steps: PlanStep[] = [];
    const takenIds = new Set<string>();

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

        const status = statusFromSymbol(doneSymbol);
        const blockedBy = (blockedByRaw === '—' || blockedByRaw === '-') ? [] : blockedByRaw.split(',').map(s => s.trim());
        const satisfies = (satisfiesRaw === '—' || satisfiesRaw === '-') ? [] : satisfiesRaw.split(',').map(s => s.trim());

        if (!isNaN(order)) {
            const title = titleFromDescription(description);
            const id = slugifyStepId(title || description, takenIds);
            steps.push({ id, order, status, title, description, files_touched: filesTouched, blockedBy, satisfies });
        }
    }

    return steps;
}

/** Escape pipes so cell text never spills into adjacent table columns. */
function escapeCell(value: string): string {
    return value.replace(/\|/g, '\\|');
}

/**
 * Generates the canonical 6-column steps table Markdown from an array of plan steps.
 * The Done cell renders from `status`.
 */
export function generateStepsTable(steps: PlanStep[]): string {
    if (!steps.length) return '';

    const header = '| Done | # | Step | Files touched | Blocked by | Satisfies |';
    const separator = '|---|---|---|---|---|---|';
    const rows = steps.map(s => {
        const done = SYMBOL_BY_STATUS[s.status] ?? SYMBOL_BY_STATUS.pending;
        const files = s.files_touched?.length ? s.files_touched.join(', ') : '—';
        const blockers = s.blockedBy?.length ? s.blockedBy.join(', ') : '—';
        const satisfies = s.satisfies?.length ? s.satisfies.join(', ') : '—';
        return `| ${done} | ${s.order} | ${escapeCell(s.description)} | ${escapeCell(files)} | ${escapeCell(blockers)} | ${escapeCell(satisfies)} |`;
    });

    return [header, separator, ...rows].join('\n');
}

const LEGEND = [
    '### Legend',
    '',
    '| Symbol | Meaning |',
    '|--------|---------|',
    '| ✅ | Done |',
    '| \u{1F504} | In Progress |',
    '| \u{1F533} | Pending |',
    '| ❌ | Cancelled |',
].join('\n');

/**
 * The single canonical writer of a plan body. Folds the former `generatePlanBody`
 * (Goal + table + Legend) and per-step detail sections into one deterministic
 * projection of the structured steps — nothing here is hand-authored or re-parsed.
 */
export function serializePlanBody(steps: PlanStep[], opts: { goal?: string } = {}): string {
    const goalSection = opts.goal
        ? opts.goal.trim()
        : '<!-- One paragraph: what this plan implements and why. -->';

    const table = steps.length
        ? generateStepsTable(steps)
        : '| Done | # | Step | Files touched | Blocked by | Satisfies |\n|---|---|---|---|---|---|';

    const detailSections = steps
        .filter(s => s.detail && s.detail.trim())
        .map(s => `### Step ${s.order} — ${s.title}\n\n${s.detail!.trim()}`)
        .join('\n\n');

    return [
        '## Goal',
        '',
        goalSection,
        '',
        '---',
        '',
        '## Steps',
        '',
        table,
        '',
        '---',
        '',
        LEGEND,
        ...(detailSections ? ['', detailSections] : []),
        '',
    ].join('\n');
}

/**
 * True when the content's `## Steps` section already holds at least one table row
 * (header or data), ignoring markdown separator rules. Format-agnostic on purpose:
 * it must detect a *foreign/legacy* table that `parseStepsTable` can't read.
 */
export function stepsSectionHasRows(content: string): boolean {
    const m = content.match(/(?:^|\n)#{1,2} Steps\s*\n([\s\S]*?)(?=\n---|\n#{1,6}\s|$)/i);
    if (!m) return false;
    return m[1].split('\n').some(line => {
        const t = line.trim();
        if (!t.includes('|')) return false;
        // Skip separator rows like |---|---| or | :--- | ---: |.
        if (/^\|?[\s:|-]+\|?$/.test(t)) return false;
        return true;
    });
}

/**
 * Replaces or appends the steps table in the given document content.
 *
 * Legacy/transitional writer: rewrites only the table in place, preserving any
 * `### Step N` detail prose already in the body. Used while the body is still the
 * persisted store; once steps live in frontmatter the saver regenerates the whole
 * body via `serializePlanBody` instead.
 */
export function updateStepsTableInContent(originalContent: string, steps: PlanStep[]): string {
    const newTable = generateStepsTable(steps);

    // Data-loss guard: never replace a populated steps table with an empty one.
    // A parse miss — e.g. a legacy/foreign column format that parseStepsTable can't
    // read — yields zero steps, so newTable is ''. Without this guard, saving would
    // silently wipe a real table (this is exactly how a doc migration once emptied
    // shipped plans). If we'd write nothing but the original already has rows, keep
    // the original untouched.
    if (!newTable && stepsSectionHasRows(originalContent)) {
        return originalContent;
    }

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
