---
type: design
id: de_01KTBA3MSAGGDWC5G55A49JN4T
title: Requirements-Driven Development — req doc-type, always-load, and scope verification
status: done
created: 2026-06-05
updated: 2026-06-05
version: 2
idea_version: 4
tags: []
parent_id: id_01KT77TXDA9H80GMW62NY0GD7B
requires_load: []
---
# Requirements-Driven Development — req doc-type, always-load, and scope verification

**Vision tie:** makes the AI faithfully act on durable, user-authored intent — removes the manual step of re-stating include/exclude/constraints at every promotion and re-checking the AI didn't drift.

## Decision summary

A new **`req` doc-type**, one flat `req.md` per thread, holding three immutable ID'd lists — `✅ Included` / `❌ Excluded` / `⛓ Constraints`. It is the **first** node in the chain (`chat → req → idea → design → plan → impl`) **and** a thread-scope always-loaded doc (ctx-like), so every downstream action is built against a locked spec. Shipped in **two phases**:

- **Phase 1 — faithfulness by injection.** `req` exists, is generated-from-chat, curated, explicitly **locked**, and auto-injected into the context bundle for every doc in its thread. Ships the win immediately; touches core/app/mcp/vscode but **not** the plan-step schema.
- **Phase 2 — verification.** Plan steps gain a `satisfies: [IN1,…]` citation field; a pure structural reducer checks scope coverage through the doc graph; an AI semantic pass backstops it; the planner cites requirements as it generates (prevention). `req_version` staleness propagation lands here too.

Lock is **explicit** (`loom_finalize_req`, `draft → locked`); re-open is a deliberate edit that re-locks at version+1.

---

## §1 — The `req` doc-type

**File:** `loom/{weave}/{thread}/req.md` — flat, single stem (`type: req` + `req.md`), like `ctx`/`ctx.md`. One per thread.

**Frontmatter:** base fields + `status: draft | locked`. No new positional fields; scope is positional (thread), as everywhere in Loom.

**Body is the source of truth** (deliberately the opposite of plan-steps-v2). `req` is an *authored authoritative spec*, not a generated view, so its markdown body — not a frontmatter array — is canonical:

```markdown
### ✅ Included
- `IN1` User registration with email/password.
- `IN2` Login flow with session management.

### ❌ Excluded
- `EX1` **Interaction testing** — no manual smoke-test steps.
- `EX2` **Social login** — Google/Facebook auth (Phase 2).

### ⛓ Constraints
- `C1` TypeScript only — no new runtime dependency.
- `C2` Must run offline.
```

IDs (`IN`/`EX`/`C` + ordinal) are inline-code prefixes. A **pure parser in `packages/core`** (`parseReq(body) → { included, excluded, constraints }`, each `{ id, text }[]`) extracts them. The plan-steps-v2 fragility concern does **not** transfer: that was a multi-column status table; this is a flat ID-prefixed bullet list — trivially parseable and round-trip stable. (Entity: `ReqDoc extends BaseDoc<ReqStatus>` in `packages/core/src/entities/req.ts`; `ReqStatus = 'draft' | 'locked'`.)

## §2 — Position & always-load

`req` is dual-natured: **born first** (extracted from the chat opener, before the idea) **and cross-cutting always-loaded** thereafter. The load side is the only context-pipeline change.

- **`loadThread`** (`packages/fs/src/repositories/threadRepository.ts`) reads only `{thread}-idea.md` / `{thread}-design.md` + reserved subdirs today. Add a read of `req.md` → `Thread.req`, and include it in `allDocs` (so `buildCatalog` registers it at `scope: 'thread'`, making it resolvable and citable). Add `case 'req'` to `docPathInThread`.
- **`assembleContext`** (`packages/app/src/context/assembleContext.ts`): inject the **target thread's `req`** with reason `'auto'`, in the `if (thread)` block alongside the parent chain (step 4), ordered *before* idea/design/plan so the spec frames everything after it. This fills the thread-scope slot that ctx intentionally left empty (ctx is global+weave only) — but with authoritative-spec, not regenerable-summary, semantics.
- **Status derivation:** like ctx/reference, a perpetual `req` must not block a thread reaching `DONE`. Exclude `type === 'req'` from the every-done predicate in `getThreadStatus`/`getWeaveStatus` (`packages/core/src/derived.ts`).

## §3 — Lifecycle

```
{generate req from chat} → draft → {user curates: add/delete/edit} → {finalize} → locked
                                                                          ↑            │
                                                          re-lock (version+1)   {reopen/edit}
                                                                          └────────────┘
```

- **Generate** reads the chat (opener especially) and extracts explicit includes/excludes/constraints → `status: draft`. Constrained extraction — the *safe* kind of generation, not the high-risk design→plan transform.
- **Curate** — user edits the lists. Human is the approver; AI proposes.
- **Finalize** — explicit `draft → locked`. The lock is the whole point of the anchor, so it is a deliberate user action with a visible button (not a silent flip on first downstream use).
- **Re-open** — editing a locked `req` returns it to `draft`; the next finalize re-locks at **version+1**, which marks downstream stale (Phase 2 staleness; see §5). Immutability = can't *silently* drift, not frozen-forever.

## §4 — Phase 1: faithfulness by injection

Ships scope faithfulness via the always-loaded locked spec, no schema change.

| Layer | Change |
|---|---|
| **core** | `ReqDoc` entity + `ReqStatus`; pure `parseReq(body)`; `req` in doc-type unions, `serializeFrontmatter` key order, status-derivation exclusion. |
| **fs** | `loadThread` reads `req.md`; `Thread.req`; `docPathInThread` `case 'req'`; save path. |
| **app** | `assembleContext` injects thread `req` (§2); create/refine/finalize use-cases `(input, deps) => result`. |
| **mcp** | `loom_create_req` / `loom_refine_req` / `loom_finalize_req` tools; `loom_generate_req` (sampling, extension only); `req` surfaced in `loom://context/...`. |
| **vscode** | `req` tree node under each thread; **Generate / Refine / Finalize** buttons; locked-state badge. |

## §5 — Phase 2: verification

The "real cost" — additive, because IDs already exist from Phase 1.

1. **Planner-citation contract.** Extend `PlanStep` (`packages/core/src/entities/plan.ts`, currently `{ order, description, done, files_touched, blockedBy }`) with **`satisfies: string[]`** — the `Included`/`Constraint` IDs a step advances. `Excluded` IDs are handed to the planner as hard boundaries (never cited positively). Teach the planner prompt (`packages/mcp/src/tools/generate.ts`) to emit `satisfies`. Optionally render it in the plan-table view (`planTableUtils.ts`).
2. **Structural reducer (pure, core, runs always).** `(parsed req, plan steps) → coverage diagnostics`: every `Included` ID has ≥1 covering step; no step cites an `Excluded` ID; constraints carried. Checks **scope traceability through the doc graph**, *not* functional correctness of built code. Surfaced as a new diagnostic alongside stale/blocked-step.
3. **Semantic backstop (AI).** "Did a step violate `EX1`/`C2` phrased differently?" — VS Code extension runs it as a **sampling** diagnostic; a Claude Code CLI session has the agent verify directly (server→client sampling is blocked there). Two delivery paths, same logic — exactly like `generate`.
4. **`req_version` staleness propagation.** Downstream idea/design/plan record the `req_version` they were built against (parallel to plan `design_version`); a re-locked `req` (version+1) marks them stale via the existing staleness machinery. This is what makes "bump version → downstream stale" real, so it lands with Phase 2.

**Prevention beats detection:** with the planner citing as it generates, most verification collapses into the cheap structural check; the AI pass is a backstop, not the primary gate.

## §6 — MCP surface

Mirrors the existing idea/design pattern: `loom_create_req(weaveId, threadId, content?)`; `loom_generate_req` (extension sampling) ↔ CLI agent calls `loom_create_req` with `content`; `loom_refine_req` (re-extract on chat change, → draft, version bump); `loom_finalize_req` (draft → locked). `req` joins the `loom://context/...` bundle. Phase 2 adds the structural diagnostic to the diagnostics resource.

## §7 — Resolved design decisions

- **Loose-fiber / pre-thread home.** `req` is **thread-scoped only** — no weave-root `req` variant. Before a thread exists, constraints live verbatim in the chat; `generate req` runs from the originating chat **at thread formation** (re-extracted when the thread folder is created). One home, extraction deferred — avoids a second doc-type variant.
- **Migration of existing scope prose.** **No bulk sweep.** Existing idea/design narrative stays as-is; new threads use `req`. `generate req` may be run opt-in on an existing thread to extract its scope. Going forward `req` is the single authoritative surface; legacy prose references it, never the reverse.
- **Body vs frontmatter source of truth.** **Body** (see §1) — `req` is authored spec, not a generated view; storing items in frontmatter would make the body regenerable, contradicting "authoritative spec, not a summary."

## Decisions log

| # | Question | Decision |
|---|---|---|
| §1 | Doc shape | Flat `req.md`, `type: req`, body = three ID'd lists (Include/Exclude/Constraints) |
| §1 | Source of truth | **Body** (authored spec), pure `parseReq` extracts IDs — not frontmatter |
| §1/§3 | Status | `draft | locked`; **explicit** `finalize`; re-lock at version+1 |
| §2 | Load | Thread-scope always-load, injected before parent chain; fills the no-thread-ctx slot |
| §4/§5 | Phasing | Ph1 injection (no schema change); Ph2 `satisfies` + structural reducer + semantic backstop + `req_version` staleness |
| §5 | Verification | Hybrid: structural (pure, always) + semantic (sampling/agent); prevention via planner citation |
| §7 | Pre-thread home | Thread-scoped only; extract at thread formation |
| §7 | Migration | No sweep; opt-in extract; legacy prose references `req` |

## Follow-ups (out of scope)

- Token budgeting once `req` + ctx + parent chain compound (Phase 5 budgeting).
- Whether `Constraints` ever need sub-types (regulatory vs technical) — defer until a real case appears; keep the list flat for now.