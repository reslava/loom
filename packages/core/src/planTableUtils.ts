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
        .map(s => `${stepMarker(s.id)}\n### Step ${s.order} — ${s.title}\n\n${s.detail!.trim()}`)
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

// --- Option A: id-keyed per-step detail sections -----------------------------
// Per-step detail prose lives in the body as `### Step N — {title}` sections, and
// `title`/`detail` are deliberately body-owned (not in frontmatter). Keyed only by
// the order number N, those sections drift the moment steps reorder/add/remove. The
// fix: tag each section with a hidden `<!-- step:{id} -->` marker so the saver can
// re-key, reorder, and prune them by stable id — the `Step N` number becomes a
// generated view of current order, authored prose (incl. the title) is preserved.

/** The hidden, stable per-section anchor written above each `### Step N` heading. */
function stepMarker(id: string): string {
    return `<!-- step:${id} -->`;
}

const STEP_MARKER_RE = /^<!--\s*step:(.+?)\s*-->\s*$/;
/** A marker-less (legacy/generated) detail heading: `### Step 3 — …`. */
const STEP_HEADING_RE = /^###\s+Step\s+\d+\b/;

interface ParsedDetailSection {
    id?: string;
    title: string;
    prose: string;
}

/** Strip a leading `Step N — ` from a detail heading, leaving the authored title. */
function stripStepNumber(headingText: string): string {
    return headingText.replace(/^Step\s+\d+\s*—?\s*/, '').trim();
}

/** Render the ordered detail-section block from the step model, drawing prose from
 *  the parsed body sections (`byId`) and falling back to a step's transient `detail`
 *  (set when a step is freshly added) when the body has no section for that id. A
 *  step with neither yields no section — which is also how orphans get pruned. */
function renderDetailSections(steps: PlanStep[], byId: Map<string, ParsedDetailSection>): string {
    const out: string[] = [];
    for (const step of steps) {
        const sec = byId.get(step.id);
        let prose: string;
        let title: string;
        if (sec && sec.prose.trim()) {
            // Authored prose + title win — they are the body-owned source of truth.
            prose = sec.prose.trim();
            title = sec.title.trim();
        } else if (step.detail && step.detail.trim()) {
            // A newly added step carries its detail transiently on the model.
            prose = step.detail.trim();
            title = titleFromDescription(step.title || step.description);
        } else {
            continue;
        }
        const heading = title ? `### Step ${step.order} — ${title}` : `### Step ${step.order}`;
        out.push(`${stepMarker(step.id)}\n${heading}\n\n${prose}`);
    }
    return out.join('\n\n');
}

/**
 * Re-keys a plan body's per-step detail sections by stable step id (Option A).
 *
 * Parses the body's existing `### Step N` detail sections — by their
 * `<!-- step:{id} -->` marker, or, for a marker-less legacy body, mapped to step ids
 * best-effort by document order — then re-emits them in the frontmatter step order:
 * authored prose (and title) preserved, the `Step N` number re-rendered from current
 * order, orphaned sections (id no longer in the plan) pruned, and a freshly added
 * step's `detail` stubbed in. Everything before the first detail section (Goal,
 * Steps table, Legend) and any non-detail trailing section (e.g. `### Notes`) are
 * preserved verbatim. Idempotent. This also retroactively fixes the detail drift
 * that `updateStepsTableInContent` (and thus `loom_reorder_steps`) leaves behind.
 */
export function rekeyDetailSections(content: string, steps: PlanStep[]): string {
    if (!steps || steps.length === 0) return content;

    const lines = content.split('\n');

    // Find where the detail sections begin: a `<!-- step:{id} -->` marker or a
    // legacy `### Step N` heading. The Legend (`### Legend`) and other h3s are not
    // detail sections and stay in the preamble.
    let firstIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (STEP_MARKER_RE.test(lines[i]) || STEP_HEADING_RE.test(lines[i])) {
            firstIdx = i;
            break;
        }
    }

    if (firstIdx === -1) {
        // No detail sections present. Append sections only for steps carrying a
        // transient `detail` (e.g. a just-added step); otherwise leave body as-is.
        const fresh = renderDetailSections(steps, new Map());
        if (!fresh) return content;
        return `${content.replace(/\s*$/, '')}\n\n${fresh}\n`;
    }

    const preamble = lines.slice(0, firstIdx).join('\n').replace(/\s*$/, '');
    const region = lines.slice(firstIdx);

    // Parse the detail region into ordered sections. A non-detail `### ` heading
    // (e.g. `### Notes`) ends the region; the rest is preserved as a verbatim tail.
    const sections: ParsedDetailSection[] = [];
    let cur: ParsedDetailSection | null = null;
    let pendingId: string | undefined;
    const tailLines: string[] = [];
    let inTail = false;

    for (const line of region) {
        if (inTail) { tailLines.push(line); continue; }

        const markerMatch = line.match(STEP_MARKER_RE);
        if (markerMatch) { pendingId = markerMatch[1]; continue; }

        const headingMatch = line.match(/^###\s+(.*)$/);
        if (headingMatch) {
            const isDetail = pendingId !== undefined || STEP_HEADING_RE.test(line);
            if (isDetail) {
                if (cur) sections.push(cur);
                cur = { id: pendingId, title: stripStepNumber(headingMatch[1].trim()), prose: '' };
                pendingId = undefined;
                continue;
            }
            // Non-detail heading → end of the detail region.
            if (cur) { sections.push(cur); cur = null; }
            inTail = true;
            tailLines.push(line);
            continue;
        }

        if (cur) cur.prose += (cur.prose ? '\n' : '') + line;
    }
    if (cur) sections.push(cur);

    // Index parsed sections by id; collect marker-less ones for positional backfill.
    const byId = new Map<string, ParsedDetailSection>();
    const unmarked: ParsedDetailSection[] = [];
    for (const s of sections) {
        if (s.id) byId.set(s.id, s);
        else unmarked.push(s);
    }
    // Backfill: assign each marker-less section to the next step lacking prose, in
    // step order — the best-effort one-time bridge for legacy (marker-less) bodies.
    for (const step of steps) {
        if (!byId.has(step.id) && unmarked.length) {
            byId.set(step.id, unmarked.shift()!);
        }
    }

    const detailBlock = renderDetailSections(steps, byId);
    const tail = tailLines.join('\n').trim();

    let result = preamble;
    if (detailBlock) result += `\n\n${detailBlock}`;
    if (tail) result += `\n\n${tail}`;
    return `${result}\n`;
}
