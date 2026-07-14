import * as crypto from 'crypto';
import { LoomState, getWeaveStatus, getThreadStatus, today as todayStamp } from '../../core/dist';
import { serializeFrontmatter } from '../../core/dist/frontmatterUtils';

export interface CtxTarget {
    ctxId: string;
    /** loom-root-relative path, e.g. `loom/ctx.md`. */
    relPath: string;
    title: string;
}

/**
 * Canonical on-disk target for the global ctx doc. Identity is the frontmatter id
 * (`loom-ctx`); the filename is the positional flat `ctx.md` (ctx-naming convention).
 * ctx is **global-only** (ctx-surface-parity): one `loom/ctx.md` per project — weave
 * ctx is retired, so this takes no scope.
 */
export function ctxTarget(): CtxTarget {
    return { ctxId: 'loom-ctx', relPath: 'loom/ctx.md', title: 'Loom — Global Context' };
}

/** Stable content hash of the assembled source, stored as `source_hash` for idempotency. */
export function computeSourceHash(source: string): string {
    return crypto.createHash('sha1').update(source, 'utf8').digest('hex');
}

/**
 * Canonical frontmatter object for the global ctx doc. parent_id is always null
 * (ctx is positional). `last_refreshed` is the honest recency signal surfaced to the
 * human (ctx has no trustworthy staleness flag — see ctx-surface-parity design §4).
 */
export function buildCtxFrontmatter(args: {
    ctxId: string; title: string; version: number; sourceHash: string; created?: string; today?: string;
}): Record<string, any> {
    const today = args.today ?? todayStamp();
    return {
        type: 'ctx',
        id: args.ctxId,
        title: args.title,
        status: 'active',
        created: args.created ?? today,
        updated: today,
        version: args.version,
        tags: ['ctx', 'summary'],
        parent_id: null,
        requires_load: [],
        source_hash: args.sourceHash,
        last_refreshed: today,
    };
}

/** A ctx shell (frontmatter + H1) for an agent to fill the body of. */
export function buildCtxShell(target: CtxTarget, version: number, sourceHash: string, today?: string): string {
    const fm = buildCtxFrontmatter({ ctxId: target.ctxId, title: target.title, version, sourceHash, today });
    return `${serializeFrontmatter(fm)}\n# ${target.title}\n`;
}

/**
 * Assemble the *source* an agent summarises into the global ctx doc. Pure — reads only
 * LoomState. Lists active/implementing weaves + their threads, one line each.
 */
export function buildCtxSource(state: LoomState): string {
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
