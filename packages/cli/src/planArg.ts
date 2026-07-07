import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, ConfigRegistry } from '../../fs/dist';
import { getState } from '../../app/dist';

/**
 * Resolve a user-supplied *friendly* plan reference to a plan's stable `pl_` ULID —
 * the CLI-edge resolution that lets the plan commands (`next`, `start-plan`,
 * `complete-step`) stay slug/human-first while the MCP surface they call is strict
 * ULID-only.
 *
 * Accepted forms:
 *   - omitted            → the workspace's active plan (implementing, then active)
 *   - a `pl_…` ULID      → verified against known plans, returned canonical
 *   - `weave/thread` or a bare `thread` slug → that thread's implementing/active plan
 *   - a plan's own id / filename stem (e.g. `plan-001`) → best-effort, first match wins
 *
 * Returns the plan's canonical id, or undefined only for the omitted-and-no-active-plan
 * case (the caller decides how to report that). Any unresolvable explicit value throws.
 */
export async function resolvePlanUlid(friendly?: string): Promise<string | undefined> {
    const registry = new ConfigRegistry();
    const state = await getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs });
    const allPlans = state.weaves.flatMap((w) => w.threads.flatMap((t) => t.plans));

    // No arg → the workspace's active plan.
    if (!friendly) {
        return (
            allPlans.find((p) => p.status === 'implementing')?.id ??
            allPlans.find((p) => p.status === 'active')?.id
        );
    }

    // Already a plan ULID → verify it names a real plan, return the canonical id.
    if (/^pl_/i.test(friendly)) {
        const hit = allPlans.find((p) => p.id === friendly);
        if (!hit) throw new Error(`No plan with ULID '${friendly}' found.`);
        return hit.id;
    }

    // A weave/thread or bare thread slug → that thread's implementing/active plan.
    const [maybeWeave, maybeThread] = friendly.includes('/')
        ? friendly.split('/', 2)
        : [undefined, friendly];
    const match = state.weaves
        .flatMap((w) => w.threads.map((t) => ({ weave: w, thread: t })))
        .find(({ weave, thread }) =>
            maybeWeave ? weave.id === maybeWeave && thread.id === maybeThread : thread.id === maybeThread
        );
    if (match) {
        const plan =
            match.thread.plans.find((p) => p.status === 'implementing') ??
            match.thread.plans.find((p) => p.status === 'active') ??
            match.thread.plans[match.thread.plans.length - 1];
        if (!plan) throw new Error(`Thread '${friendly}' has no plans.`);
        return plan.id;
    }

    // A plan's own id or filename stem (e.g. `plan-001`). Best-effort — stems are not
    // globally unique across threads, so the first match wins; a human who needs an
    // exact plan passes its ULID or `weave/thread`.
    const lc = friendly.toLowerCase().replace(/\.md$/, '');
    const stemOf = (p: { _path?: string }): string | undefined =>
        p._path ? p._path.split(/[\\/]/).pop()!.replace(/\.md$/i, '').toLowerCase() : undefined;
    const planHit = allPlans.find((p) => p.id.toLowerCase() === lc || stemOf(p) === lc);
    if (planHit) return planHit.id;

    throw new Error(
        `Could not resolve '${friendly}' to a plan. Pass a plan ULID (pl_…), a weave/thread slug, or omit it to use the active plan.`,
    );
}
