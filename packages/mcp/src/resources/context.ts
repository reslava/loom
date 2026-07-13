import { getState } from '../../../app/dist/getState';
import { assembleContext } from '../../../app/dist/context/assembleContext';
import { serializeBundle } from '../../../app/dist/context/serializeBundle';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, readContextPrefsEntry } from '../../../fs/dist';
import { resolveId, LoadedDoc, LoomState, Thread, Document } from '../../../core/dist';
import { ConfigRegistry } from '../../../fs/dist';
import * as fs from 'fs-extra';

const VALID_MODES = ['chat', 'idea', 'design', 'plan', 'implementing', 'refine', 'promote', 'ctx'] as const;
type Mode = typeof VALID_MODES[number];

/**
 * Parse the Context Dispatcher ledger from the `loaded` query param.
 * Format: comma-separated `id@version` tokens (e.g. `loaded=loom-ctx@3,de_x@2`).
 * Malformed tokens are dropped — a bad ledger entry must never suppress a doc
 * (failing toward re-injection, never silent under-load). Ids are resolved to
 * canonical form inside assembleContext, so a slug here still matches.
 */
function parseLoadedLedger(param: string | null): LoadedDoc[] {
    if (!param) return [];
    return param
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map((token): LoadedDoc | null => {
            const at = token.lastIndexOf('@');
            if (at <= 0) return null;
            const id = token.slice(0, at);
            const version = parseInt(token.slice(at + 1), 10);
            if (!id || Number.isNaN(version)) return null;
            return { id, version };
        })
        .filter((x): x is LoadedDoc => x !== null);
}

/**
 * loom://context/{docUlid}?mode={mode}              (ULID form — strict)
 * loom://context/thread/{weaveSlug}/{threadSlug}?mode={mode}   (slug form — human-pointable)
 *
 * The Unified Context Pipeline delivery point. Builds LoomState (the one impure
 * boundary), runs the pure assembler, and returns the serialised, agent-agnostic
 * markdown bundle. Replaces the legacy loom://thread-context bundling entirely.
 *
 * Two explicit forms, each strict about its own input (naming rule 2 — separate
 * forms, never a dual-accept param):
 *  - ULID form: loom://context/{docUlid} — anchor on a document's canonical id.
 *  - Slug form (human-pointable): loom://context/thread/{weaveSlug}/{threadSlug}
 *    anchors on a thread's primary doc; loom://context/{weaveSlug}/{threadSlug}/{docSlug}
 *    anchors on a named doc within a thread. Slugs resolve → canonical id via the
 *    link index.
 */
function resolveThreadOrThrow(state: LoomState, weaveSlug: string, threadSlug: string): Thread {
    const weave = state.weaves.find(w => w.id === weaveSlug);
    const thread = weave?.threads.find(t => t.id === threadSlug);
    if (!thread) throw new Error(`Thread not found: ${weaveSlug}/${threadSlug}`);
    return thread;
}

/**
 * Resolve a document within a thread from a human-pointable doc slug: the canonical
 * singletons by keyword (idea/design/req), else a match on a doc's own id, its `slug`,
 * or its **filename stem** (plan-NNN, chat-NNN, references — the name a human sees on
 * disk and types, e.g. `chat-001.md`). A trailing `.md` is tolerated on every form,
 * and matching is case-insensitive.
 */
function resolveThreadDocBySlug(thread: Thread, docSlug: string): Document | undefined {
    const s = docSlug.toLowerCase().replace(/\.md$/, '');
    if (s === 'idea') return thread.idea;
    if (s === 'design') return thread.design;
    if (s === 'req') return thread.req;

    const stemOf = (d: { _path?: string }): string | undefined =>
        d._path ? d._path.split(/[\\/]/).pop()!.replace(/\.md$/i, '').toLowerCase() : undefined;
    const matches = (d: Document): boolean =>
        d.id.toLowerCase() === s ||
        (d as { slug?: string }).slug?.toLowerCase() === s ||
        stemOf(d as { _path?: string }) === s;

    // Search every doc collection — allDocs is the union, but plans/chats/refDocs are
    // listed explicitly so resolution never depends on how allDocs was populated.
    const candidates: Document[] = [
        ...thread.allDocs,
        ...thread.plans,
        ...thread.chats,
        ...thread.refDocs,
    ];
    return candidates.find(matches);
}

export async function handleContextResource(root: string, uri: string) {
    const url = new URL(uri.replace('loom://', 'loom://host/'));
    // loom://context/...  →  pathname "/context/..."
    const segments = url.pathname.replace(/^\//, '').split('/').map(s => decodeURIComponent(s));

    const modeParam = url.searchParams.get('mode') ?? 'chat';
    const mode: Mode = (VALID_MODES as readonly string[]).includes(modeParam) ? (modeParam as Mode) : 'chat';

    const registry = new ConfigRegistry();
    const state = await getState({
        getActiveLoomRoot,
        loadWeave,
        buildLinkIndex,
        registry,
        fs,
        workspaceRoot: root,
    });

    let targetId: string;
    if (segments.length === 4) {
        // Both slug forms carry four path segments — the thread form and the
        // path-qualified doc form — distinguished by the `thread` marker.
        if (segments[1] === 'thread') {
            // Slug form (thread): loom://context/thread/{weaveSlug}/{threadSlug}
            const [, , weaveSlug, threadSlug] = segments;
            const thread = resolveThreadOrThrow(state, weaveSlug, threadSlug);
            const primary =
                thread.design ??
                thread.idea ??
                thread.plans.find(p => p.status === 'implementing') ??
                thread.plans.find(p => p.status === 'active') ??
                thread.plans[0] ??
                thread.allDocs[0];
            if (!primary) throw new Error(`Thread ${weaveSlug}/${threadSlug} has no documents to anchor context`);
            targetId = primary.id;
        } else {
            // Slug form (doc): loom://context/{weaveSlug}/{threadSlug}/{docSlug}
            const [, weaveSlug, threadSlug, docSlug] = segments;
            const thread = resolveThreadOrThrow(state, weaveSlug, threadSlug);
            const doc = resolveThreadDocBySlug(thread, docSlug);
            if (!doc) throw new Error(`No document "${docSlug}" in thread ${weaveSlug}/${threadSlug}`);
            targetId = doc.id;
        }
    } else {
        // ULID form (canonical): loom://context/{docUlid}
        targetId = segments.slice(1).join('/');
        if (!targetId) {
            throw new Error('loom://context requires a target: loom://context/{docUlid}, loom://context/thread/{weaveSlug}/{threadSlug}, or loom://context/{weaveSlug}/{threadSlug}/{docSlug}');
        }
    }

    // Persisted sidebar overrides (Phase 3) — keyed by the canonical target id, the
    // same id the sidebar gets back as bundle.targetId. This is the one impure read
    // (file IO) that feeds the pure assembler; every context consumer (do-step,
    // generate, prompts) routes through this handler and so honours prefs uniformly.
    const canonicalId = resolveId(state.index, targetId) ?? targetId;
    const overrides = await readContextPrefsEntry(root, canonicalId);

    // Context Dispatcher (model C): the caller declares the {id@version} set it
    // already holds via `?loaded=…`; the assembler returns only the delta + a
    // manifest of what it assumed present. Absent param ⇒ empty ledger ⇒ full bundle.
    const alreadyLoaded = parseLoadedLedger(url.searchParams.get('loaded'));

    // Bundle scope (the `read`/`reply` slang path): `?scope=doc` emits ONLY the target
    // doc — no ctx, refs, parent chain, or requires_load — so pointing at a doc in an
    // already-loaded thread costs just that doc, not a re-bundle. Default 'full' keeps
    // every existing caller (load, do-step, generate, prompts) unchanged. Composes with
    // ?mode=chat: the target is still resolved as a chat, only the surrounding bundle is dropped.
    const scope: 'full' | 'doc' = url.searchParams.get('scope') === 'doc' ? 'doc' : 'full';

    const bundle = assembleContext(targetId, mode, overrides, state, alreadyLoaded, scope);

    // The sidebar needs the structured bundle (reasons, stale/missing/locked flags,
    // per-doc token estimates) to render its marks; prompt injection needs the
    // agent-agnostic markdown. Same bundle, two encodings — `?format=json` selects
    // the structured form. Default stays markdown so existing callers are unchanged.
    if (url.searchParams.get('format') === 'json') {
        return {
            contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(bundle) }],
        };
    }

    const text = serializeBundle(bundle);
    return {
        contents: [{ uri, mimeType: 'text/plain', text }],
    };
}
