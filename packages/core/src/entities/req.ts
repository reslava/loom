import { BaseDoc } from './base';

export type ReqStatus = 'draft' | 'locked';

/**
 * Lifecycle of a single requirement item.
 * - `active` — in force; an Included `active` item demands a covering plan step.
 * - `dropped` — superseded/abandoned but **not deleted**: the handle stays
 *   citation-resolvable (old `satisfies` references still resolve) while being
 *   exempt from coverage nagging. Authored as a `~dropped` marker after the handle.
 */
export type ReqItemStatus = 'active' | 'dropped';

/**
 * A single requirement item parsed out of a req doc body.
 * The `id` is the stable handle authored as an inline-code prefix
 * (e.g. `IN1`, `EX1`, `C1`); `text` is the remainder of the bullet.
 * Handles are **immutable** once authored — never renumbered or deleted; to
 * retire one, mark it `dropped` (see `diffReqHandles`).
 */
export interface ReqItem {
    id: string;
    text: string;
    status: ReqItemStatus;
}

/** Parsed view of a req doc's three lists. */
export interface ParsedReq {
    included: ReqItem[];
    excluded: ReqItem[];
    constraints: ReqItem[];
}

/**
 * Requirements doc — the authoritative, immutable include/exclude/constraints
 * spec for a thread. One flat `req.md` per thread. The markdown body is the
 * source of truth (an authored spec, not a generated view); `parseReq` extracts
 * the structured lists from it. `locked` is the anchored state — downstream
 * idea/design/plan may build against it; re-opening edits it back to `draft`.
 */
export interface ReqDoc extends BaseDoc<ReqStatus> {
    type: 'req';
    status: ReqStatus;
    /** Design version this req was last built/amended against — its staleness
     *  baseline. Stale when `design_version < design.version` (req depends on design;
     *  req is authored after a complete design). See loom/refs/staleness-reference.md. */
    design_version?: number;
}

/** Matches a requirement handle: IN<n>, EX<n>, or C<n>. */
const REQ_ID = /^(IN|EX|C)\d+$/;

/**
 * Pure parser: extract the structured requirement lists from a req doc body.
 *
 * Heading-independent — items are bucketed by their inline-code ID prefix, so
 * section wording/emoji can drift without breaking the parse. A bullet whose
 * first token is not a `` `IN|EX|C<n>` `` handle is ignored (prose, notes).
 */
export function parseReq(body: string): ParsedReq {
    const result: ParsedReq = { included: [], excluded: [], constraints: [] };

    for (const line of body.split('\n')) {
        // A markdown bullet (- or *) whose first token is an inline-code handle.
        const m = line.match(/^\s*[-*]\s+`([^`]+)`\s*(.*)$/);
        if (!m) continue;

        const id = m[1].trim();
        if (!REQ_ID.test(id)) continue;

        // An optional `~dropped` marker immediately after the handle retires the
        // item without deleting it; strip it from the human-readable text.
        let text = m[2].trim();
        let status: ReqItemStatus = 'active';
        const drop = text.match(/^~dropped\b[ \t]*/i);
        if (drop) {
            status = 'dropped';
            text = text.slice(drop[0].length).trim();
        }

        const item: ReqItem = { id, text, status };
        if (id.startsWith('IN')) result.included.push(item);
        else if (id.startsWith('EX')) result.excluded.push(item);
        else result.constraints.push(item); // REQ_ID guarantees C<n> here
    }

    return result;
}
