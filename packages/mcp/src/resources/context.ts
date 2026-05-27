import { getState } from '../../../app/dist/getState';
import { assembleContext } from '../../../app/dist/context/assembleContext';
import { serializeBundle } from '../../../app/dist/context/serializeBundle';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
import * as fs from 'fs-extra';

const VALID_MODES = ['chat', 'idea', 'design', 'plan', 'implementing', 'refine', 'promote', 'ctx'] as const;
type Mode = typeof VALID_MODES[number];

/**
 * loom://context/{docId}?mode={mode}
 * loom://context/thread/{weaveId}/{threadId}?mode={mode}
 *
 * The Unified Context Pipeline delivery point. Builds LoomState (the one impure
 * boundary), runs the pure assembler, and returns the serialised, agent-agnostic
 * markdown bundle. Replaces the legacy loom://thread-context bundling entirely.
 *
 * Two addressing forms:
 *  - doc form: anchor on a specific document id.
 *  - thread form: anchor on a thread's primary doc (design ?? idea ?? active
 *    plan ?? first doc) — the migration path for thread-level callers.
 */
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
    if (segments[1] === 'thread') {
        // loom://context/thread/{weaveId}/{threadId}
        const weaveId = segments[2];
        const threadId = segments[3];
        if (!weaveId || !threadId) {
            throw new Error('loom://context/thread requires weaveId and threadId: loom://context/thread/{weaveId}/{threadId}');
        }
        const weave = state.weaves.find(w => w.id === weaveId);
        const thread = weave?.threads.find(t => t.id === threadId);
        if (!thread) throw new Error(`Thread not found: ${weaveId}/${threadId}`);
        const primary =
            thread.design ??
            thread.idea ??
            thread.plans.find(p => p.status === 'implementing') ??
            thread.plans.find(p => p.status === 'active') ??
            thread.plans[0] ??
            thread.allDocs[0];
        if (!primary) throw new Error(`Thread ${weaveId}/${threadId} has no documents to anchor context`);
        targetId = primary.id;
    } else {
        targetId = segments.slice(1).join('/');
        if (!targetId) {
            throw new Error('loom://context requires a document id: loom://context/{docId}?mode={mode}');
        }
    }

    const bundle = assembleContext(targetId, mode, { include: [], exclude: [] }, state);
    const text = serializeBundle(bundle);

    return {
        contents: [{ uri, mimeType: 'text/plain', text }],
    };
}
