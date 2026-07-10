import * as path from 'path';
import * as fs from 'fs-extra';
import { findMarkdownFiles } from '../utils/pathUtils';
import { loadDoc } from '../serializers/frontmatterLoader';
import { LinkIndex, createEmptyIndex, DocumentEntry, StepBlocker, resolveId } from '../../../core/dist/linkIndex';
import { Document } from '../../../core/dist/entities/document';
import { PlanDoc } from '../../../core/dist/entities/plan';

const RESERVED_SUBDIR_NAMES = new Set(['plans', 'done', 'ai-chats', 'ctx', 'refs', '.archive', 'chats']);

function extractThreadId(filePath: string, weavesDir: string): string | undefined {
    const rel = path.relative(weavesDir, filePath);
    const parts = rel.split(path.sep);
    // parts[0]=weaveSlug, parts[1]=possible threadSlug, parts[2+]=rest
    if (parts.length < 3) return undefined;
    const candidate = parts[1];
    if (RESERVED_SUBDIR_NAMES.has(candidate) || candidate.endsWith('.md')) return undefined;
    return candidate;
}

function addBacklink(index: LinkIndex, targetId: string, sourceId: string): void {
    const list = index.backlinks.get(targetId) ?? [];
    if (!list.includes(sourceId)) list.push(sourceId);
    index.backlinks.set(targetId, list);
}

export async function buildLinkIndex(loomRoot: string): Promise<LinkIndex> {
    const threadsDir = path.join(loomRoot, 'loom');
    const index = createEmptyIndex();

    if (!fs.existsSync(threadsDir)) {
        return index;
    }

    const allFiles = await findMarkdownFiles(threadsDir);

    for (const filePath of allFiles) {
        try {
            const doc = await loadDoc(filePath) as Document & { slug?: string };
            const docId = doc.id;
            const threadSlug = extractThreadId(filePath, threadsDir);

            const entry: DocumentEntry = {
                path: filePath,
                type: doc.type,
                exists: true,
                archived: filePath.includes('.archive'),
                threadSlug,
            };

            // Primary lookup maps
            index.documents.set(docId, entry);
            index.byId.set(docId, filePath);

            // Slug index — reference docs only
            if (doc.type === 'reference' && doc.slug) {
                index.bySlug.set(doc.slug, docId);
            }

            // Parent relationship
            if (doc.parent_id) {
                index.parent.set(docId, doc.parent_id);
                // Populate legacy children map from parent_id (not child_ids)
                if (!index.children.has(doc.parent_id)) {
                    index.children.set(doc.parent_id, new Set());
                }
                index.children.get(doc.parent_id)!.add(docId);
                // Backlinks
                addBacklink(index, doc.parent_id, docId);
            }

            // requires_load backlinks (slugs resolve after full pass — deferred below)
            // Store raw requires_load on a temp side-channel keyed by docId.
            // We resolve slugs in the second pass after bySlug is fully built.
            (index as any).__requiresLoad ??= new Map<string, string[]>();
            if (doc.requires_load && doc.requires_load.length > 0) {
                (index as any).__requiresLoad.set(docId, doc.requires_load);
            }

            // Plan step blockers
            if (doc.type === 'plan') {
                const planDoc = doc as PlanDoc;
                const blockers: StepBlocker[] = [];

                if (planDoc.steps) {
                    for (const step of planDoc.steps) {
                        if (step.blockedBy && step.blockedBy.length > 0) {
                            blockers.push({ step: step.order, blockedBy: step.blockedBy });
                        }
                    }
                }

                if (blockers.length > 0) {
                    index.stepBlockers.set(docId, blockers);
                }
            }
        } catch (e) {
            console.warn(`[buildLinkIndex] Skipping ${filePath}: ${(e as Error).message}`);
        }
    }

    // Second pass: resolve requires_load slugs/ids to backlinks now that bySlug is complete.
    const requiresLoadMap: Map<string, string[]> = (index as any).__requiresLoad ?? new Map();
    for (const [sourceId, entries] of requiresLoadMap) {
        for (const entry of entries) {
            const targetId = index.bySlug.get(entry) ?? (index.byId.has(entry) ? entry : null);
            if (targetId) {
                addBacklink(index, targetId, sourceId);
            }
        }
    }
    delete (index as any).__requiresLoad;

    return index;
}

function removeDocumentFromIndex(index: LinkIndex, docId: string): void {
    index.documents.delete(docId);
    index.byId.delete(docId);
    // Remove from bySlug
    for (const [slug, id] of index.bySlug) {
        if (id === docId) index.bySlug.delete(slug);
    }
    // Remove backlinks emitted by this doc
    for (const list of index.backlinks.values()) {
        const i = list.indexOf(docId);
        if (i !== -1) list.splice(i, 1);
    }
    index.backlinks.delete(docId);
    index.parent.delete(docId);
    index.children.delete(docId);
    for (const childSet of index.children.values()) childSet.delete(docId);
    index.stepBlockers.delete(docId);
}

export async function updateIndexForFile(
    index: LinkIndex,
    loomRoot: string,
    filePath: string,
    event: 'create' | 'change' | 'delete'
): Promise<void> {
    const weavesDir = path.join(loomRoot, 'loom');
    // Use the id from frontmatter when available; fall back to filename for deletes.
    let docId = path.basename(filePath, '.md');
    // For existing entries, find the canonical id from byId (reverse lookup).
    for (const [id, p] of index.byId) {
        if (p === filePath) { docId = id; break; }
    }
    removeDocumentFromIndex(index, docId);

    if (event === 'delete') {
        index.documents.set(docId, { path: filePath, type: 'idea', exists: false, archived: filePath.includes('.archive') });
        return;
    }

    try {
        const doc = await loadDoc(filePath) as Document & { slug?: string };
        const id = doc.id;
        const threadSlug = extractThreadId(filePath, weavesDir);

        index.documents.set(id, { path: filePath, type: doc.type, exists: true, archived: filePath.includes('.archive'), threadSlug });
        index.byId.set(id, filePath);

        if (doc.type === 'reference' && doc.slug) {
            index.bySlug.set(doc.slug, id);
        }

        if (doc.parent_id) {
            index.parent.set(id, doc.parent_id);
            if (!index.children.has(doc.parent_id)) index.children.set(doc.parent_id, new Set());
            index.children.get(doc.parent_id)!.add(id);
            addBacklink(index, doc.parent_id, id);
        }

        if (doc.requires_load) {
            for (const entry of doc.requires_load) {
                const targetId = index.bySlug.get(entry) ?? (index.byId.has(entry) ? entry : null);
                if (targetId) addBacklink(index, targetId, id);
            }
        }

        if (doc.type === 'plan') {
            const planDoc = doc as PlanDoc;
            const blockers: StepBlocker[] = [];
            if (planDoc.steps) {
                for (const step of planDoc.steps) {
                    if (step.blockedBy && step.blockedBy.length > 0) {
                        blockers.push({ step: step.order, blockedBy: step.blockedBy });
                    }
                }
            }
            if (blockers.length > 0) index.stepBlockers.set(id, blockers);
        }
    } catch (e) {
        index.documents.set(docId, { path: filePath, type: 'idea', exists: false, archived: filePath.includes('.archive') });
    }
}

// ---------------------------------------------------------------------------
// Doc id resolution with suggest-on-miss
// ---------------------------------------------------------------------------

const MAX_SUGGESTIONS = 3;

export interface ResolvedDoc {
    id: string;
    filePath: string;
}

/** Plain Levenshtein distance — used to rank close ids/slugs on a lookup miss. */
function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let curr = new Array<number>(n + 1);
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}

function stemOf(filePath: string): string {
    return path.basename(filePath, '.md');
}

/**
 * Ranks candidate doc ids for a key that did not resolve. Three signals, best first:
 *  1. The key is a doc's filename stem (the canonical filename-vs-id mis-call, e.g.
 *     passing `agent-doc-dx-plan-001` instead of the ULID `pl_…`).
 *  2. The key is a substring of (or contains) a filename stem.
 *  3. The key is within edit distance of a known id or slug (typos).
 */
function suggestIds(index: LinkIndex, key: string): string[] {
    const lowerKey = key.toLowerCase();
    const scored: { id: string; score: number }[] = [];

    for (const [id, entry] of index.documents) {
        const stem = stemOf(entry.path).toLowerCase();
        if (stem === lowerKey) {
            scored.push({ id, score: 0 });
        } else if (stem.includes(lowerKey) || lowerKey.includes(stem)) {
            scored.push({ id, score: 1 });
        }
    }

    for (const id of index.byId.keys()) {
        const d = levenshtein(id.toLowerCase(), lowerKey);
        if (d <= Math.max(2, Math.floor(id.length * 0.3))) scored.push({ id, score: 2 + d });
    }

    for (const [slug, id] of index.bySlug) {
        const d = levenshtein(slug.toLowerCase(), lowerKey);
        if (d <= Math.max(2, Math.floor(slug.length * 0.3))) scored.push({ id, score: 2 + d });
    }

    const best = new Map<string, number>();
    for (const { id, score } of scored) {
        const cur = best.get(id);
        if (cur === undefined || score < cur) best.set(id, score);
    }

    return [...best.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, MAX_SUGGESTIONS)
        .map(e => e[0]);
}

/**
 * Resolves a doc id (ULID) or reference slug to its canonical id + absolute path
 * using the link index. On miss, fuzzy-matches the key against known ids, slugs and
 * filename stems and throws an error that names the closest candidates.
 *
 * The candidate set comes from the link index (one FS pass via `buildLinkIndex`), not
 * a second filesystem walk. Pass a prebuilt `index` to avoid even that pass.
 */
export async function resolveDocIdOrThrow(loomRoot: string, key: string, index?: LinkIndex): Promise<ResolvedDoc> {
    const idx = index ?? await buildLinkIndex(loomRoot);
    const canonical = resolveId(idx, key);
    if (canonical) {
        const filePath = idx.byId.get(canonical) ?? idx.documents.get(canonical)?.path;
        if (filePath) return { id: canonical, filePath };
    }

    const suggestions = suggestIds(idx, key);
    const hint = suggestions.length
        ? ` — did you mean ${suggestions.map(s => `'${s}'`).join(', ')}?`
        : '';
    throw new Error(`Document not found: '${key}'${hint}`);
}
