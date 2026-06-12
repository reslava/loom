import { ParsedReq } from './entities/req';

/**
 * Result of diffing two versions of a thread's req for handle referential
 * integrity. Requirement handles (`IN`/`EX`/`C`) are citation targets — plan
 * steps point at them via `satisfies` — so a handle is a primary key: once it
 * exists it must never be renumbered or deleted, only appended to or retired
 * (marked `~dropped`, which keeps the handle present).
 */
export interface ReqHandleDiff {
    /** Handle ids in `prev` that are absent from `next` — a delete or renumber. */
    deleted: string[];
    /** Handle ids in `next` that are not in `prev` — legitimate appends. */
    added: string[];
    /** True when no existing handle vanished (append + status-change only). */
    ok: boolean;
}

function allIds(req: ParsedReq): string[] {
    return [...req.included, ...req.excluded, ...req.constraints].map(i => i.id);
}

/**
 * Pure deterministic referential-integrity check between a req's prior body
 * (`prev`) and a proposed new body (`next`). No IO, no AI.
 *
 * The single invariant: **every handle present in `prev` must still be present
 * in `next`.** A vanished handle is a violation — either an outright delete or a
 * renumber (the old id disappears while a fresh one appears). New ids in `next`
 * are allowed appends; a `dropped` item still appears in `next` (only its status
 * changed) so retiring a requirement is never a deletion.
 */
export function diffReqHandles(prev: ParsedReq, next: ParsedReq): ReqHandleDiff {
    const prevIds = allIds(prev);
    const nextIds = new Set(allIds(next));
    const prevSet = new Set(prevIds);

    const deleted = prevIds.filter(id => !nextIds.has(id));
    const added = [...nextIds].filter(id => !prevSet.has(id));

    return { deleted, added, ok: deleted.length === 0 };
}
