/**
 * Strict `plan_ulid` reader for the plan-step tools.
 *
 * The API contract (api-naming-reference.md, rule 2) promises a `*_ulid` param
 * accepts the ULID and nothing else — the old "ULID or filename stem" dual-accept
 * is retired. This guard enforces that at the agent-facing boundary: a plan is
 * addressed by its stable `pl_` ULID, never its filename stem. A non-ULID value is
 * rejected with a clear message rather than silently resolved.
 */
/**
 * The shared strict predicate: a plan reference is valid iff it is a `pl_` ULID.
 * Both the plan-step tools (via requirePlanUlid) and the do-next-step prompt gate
 * on this, so the "ULID only, never a stem" contract has a single definition.
 */
export function isPlanUlid(value: unknown): value is string {
    return typeof value === 'string' && /^pl_/i.test(value);
}

export function requirePlanUlid(args: Record<string, unknown>): string {
    const value = args['plan_ulid'];
    if (!isPlanUlid(value)) {
        throw new Error(
            `plan_ulid must be a plan's stable pl_ ULID (e.g. "pl_01J…"), not a filename stem or title. Got: ${JSON.stringify(value)}.`,
        );
    }
    return value;
}
