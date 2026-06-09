import * as crypto from 'crypto';
import { LoomState, Document, getWeaveStatus, getThreadStatus } from '../../core/dist';
import { serializeFrontmatter } from '../../core/dist/frontmatterUtils';

export type CtxScope = 'global' | 'weave';

export interface CtxTarget {
    ctxId: string;
    /** loom-root-relative path, e.g. `loom/ctx.md` or `loom/{weave}/ctx.md`. */
    relPath: string;
    title: string;
}

/**
 * Canonical on-disk target for a ctx doc at the given scope. Identity is the
 * frontmatter id (`loom-ctx` / `{weave}-ctx`); the filename is the positional
 * flat `ctx.md` (ctx-naming convention).
 */
export function ctxTarget(scope: CtxScope, weaveId: string | undefined): CtxTarget {
    if (scope === 'global') {
        return { ctxId: 'loom-ctx', relPath: 'loom/ctx.md', title: 'Loom — Global Context' };
    }
    if (!weaveId) throw new Error('weaveId is required for weave-scoped ctx');
    return { ctxId: `${weaveId}-ctx`, relPath: `loom/${weaveId}/ctx.md`, title: `Context Summary — ${weaveId}` };
}

/** Stable content hash of the assembled source, stored as `source_hash` for idempotency. */
export function computeSourceHash(source: string): string {
    return crypto.createHash('sha1').update(source, 'utf8').digest('hex');
}

/** Canonical frontmatter object for a ctx doc. parent_id is always null (ctx is positional). */
export function buildCtxFrontmatter(args: {
    ctxId: string; title: string; version: number; sourceHash: string; today?: string;
}): Record<string, any> {
    const today = args.today ?? new Date().toISOString().split('T')[0];
    return {
        type: 'ctx',
        id: args.ctxId,
        title: args.title,
        status: 'active',
        created: today,
        updated: today,
        version: args.version,
        tags: ['ctx', 'summary'],
        parent_id: null,
        requires_load: [],
        source_hash: args.sourceHash,
    };
}

/** A ctx shell (frontmatter + H1) for an agent to fill the body of. */
export function buildCtxShell(target: CtxTarget, version: number, sourceHash: string, today?: string): string {
    const fm = buildCtxFrontmatter({ ctxId: target.ctxId, title: target.title, version, sourceHash, today });
    return `${serializeFrontmatter(fm)}\n# ${target.title}\n`;
}

/**
 * Assemble the *source* an agent summarises into a ctx doc. Pure — reads only LoomState.
 * - global → active/implementing weaves + their threads, one line each.
 * - weave  → the weave's primary design body + ideas + plans + done decisions/open items.
 */
export function buildCtxSource(scope: CtxScope, weaveId: string | undefined, state: LoomState): string {
    return scope === 'global' ? buildGlobalSource(state) : buildWeaveSource(weaveId!, state);
}

function buildGlobalSource(state: LoomState): string {
    const lines: string[] = [`Workspace: ${state.loomName}`];
    for (const weave of state.weaves) {
        const ws = getWeaveStatus(weave);
        if (ws !== 'ACTIVE' && ws !== 'IMPLEMENTING') continue;
        lines.push('', `## ${weave.id} (${ws})`);
        for (const thread of weave.threads) {
            const ts = getThreadStatus(thread);
            const label = thread.design?.title ?? thread.idea?.title ?? '(no design/idea)';
            lines.push(`- ${thread.id} (${ts}): ${label}`);
        }
    }
    if (lines.length === 1) lines.push('', '(no active or implementing weaves)');
    return lines.join('\n');
}

function buildWeaveSource(weaveId: string, state: LoomState): string {
    const weave = state.weaves.find(w => w.id === weaveId);
    if (!weave) throw new Error(`Weave not found: ${weaveId}`);

    const primaryDesign = weave.threads.find(t => t.design)?.design;

    const planLines = weave.threads.flatMap(t => t.plans).map(p => {
        const done = p.steps?.filter(s => s.status === 'done').length ?? 0;
        const total = p.steps?.length ?? 0;
        return `- ${p.id} (${p.status}, ${done}/${total} steps)`;
    }).join('\n') || '(none)';

    const ideaDocs: Document[] = [
        ...weave.threads.map(t => t.idea).filter((i): i is NonNullable<typeof i> => Boolean(i)),
        ...weave.looseFibers.filter(f => f.type === 'idea'),
    ];
    const ideaLines = ideaDocs.map(i => `- ${i.title} (${i.status})`).join('\n') || '(none)';

    const doneLines = weave.threads.flatMap(t => t.dones).map(d => {
        const content = d.content ?? '';
        const decisions = content.split('\n').filter(l => l.startsWith('- ')).slice(0, 5).join('\n');
        const openIdx = content.indexOf('## Open items');
        const openItems = openIdx === -1 ? '' :
            content.slice(openIdx + '## Open items'.length).trim().split('\n')
                .filter(l => l.startsWith('- ')).slice(0, 5).join('\n');
        return [
            `### ${d.title} (parent: ${d.parent_id})`,
            decisions ? `**Decisions made:**\n${decisions}` : '',
            openItems ? `**Open items:**\n${openItems}` : '',
        ].filter(Boolean).join('\n');
    }).join('\n\n') || '(none)';

    return [
        `Weave: ${weaveId}`,
        primaryDesign ? `Primary design: ${primaryDesign.title} (v${primaryDesign.version})` : 'Primary design: (none)',
        '',
        '=== Design document ===',
        primaryDesign?.content ?? '(no design)',
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
}
