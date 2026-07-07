---
type: done
id: pl_01KWZ7GTH7CXCB430AVD8ACKNT-done
title: Done — Align the CLI surface to the Slug/Ulid API contract
status: done
created: 2026-07-07
version: 7
tags: []
parent_id: pl_01KWZ7GTH7CXCB430AVD8ACKNT
requires_load: []
---
# Done — Align the CLI surface to the Slug/Ulid API contract

## Step 1 — Rename CLI internal call sites so no slug flows through a *Id/*Ulid-named variable — a weave folder is weaveSlug end to end.

Renamed every CLI internal call site where a **weave slug** flowed through a `*Id`-named variable, to `weaveSlug`:

- `refine.ts` — param `weaveId` → `weaveSlug`; `runEvent(weaveSlug, …)`; log now says "applied to weave" (was misleadingly "thread").
- `weaveDesign.ts` — param `weaveId` → `weaveSlug`; `weaveSlug: weaveId` collapses to shorthand `weaveSlug`.
- `weavePlan.ts` — same.
- `validate.ts` — param `weaveId?` → `weaveSlug?`; input shorthand `weaveSlug`.
- `status.ts` — param `weaveId?` → `weaveSlug?` + both use sites.
- `startPlan.ts` — local `weaveId` (returned by `resolveWeaveIdForPlan`) → `weaveSlug` across all three uses.

Scope note (deliberately deferred, not missed): the fs export `resolveWeaveIdForPlan` still carries the banned `Id` token in its name (it returns a weave *slug*). Renaming it to `resolveWeaveSlugForPlan` is an **fs-layer** change that must sweep fs + every caller, which is outside this step's "CLI internal call sites" boundary. Flagged as a small follow-up sweep rather than silently widening step 1 into fs.

## Step 2 — Make user-facing CLI args slug-first with a clean break: drop -id label suffixes, name entity args for the entity, remove old names outright (no aliases).

Made user-facing CLI arg/option placeholders slug-first, entity-named. In `index.ts`: `status [weave]`, `validate [weave]`, `refine-design <weave>`, `weave design <weave>`, `weave plan <weave>`, `start-plan <plan>`, `complete-step <plan>`, `next [plan]`, `context <doc>`, `migrate-plan-steps [doc]`, `finalize <draft>`, `rename <doc> <new-title>`; options `--thread <slug>` (×3), `--weave <weave>` (weave idea + search), and the `--thread` help text "Thread ID" → "Thread slug". Mirrored every one of these in `packages/cli/README.md`.

**Clean-break finding (important, no user impact):** these are commander **positional-arg placeholders** and **option value placeholders** — help-text only. Renaming `[weave-id]`→`[weave]` or `<id>`→`<slug>` does not change how args are parsed (positionals are by position; options keep their `--flag` string). No command name or flag string was renamed, and none needed to be for the model. So the "clean break vs deprecation aliases" decision turned out to cost users nothing: there was no shipped identifier to break. The migration-path worry in the idea over-estimated the blast radius — the only breaking rename would have been a command/flag string, which the surface/naming model does not require.

## Step 3 — next.ts resolves its friendly [plan] arg to a pl_ ULID at the CLI edge (generalize resolveActivePlanId into resolvePlanUlid via getState), then calls do-next-step with a strict planUlid.

Rewrote `next.ts`. `resolveActivePlanId` is generalized into `resolvePlanUlid(friendly?)` — the CLI-edge resolver that always returns a `pl_` ULID (or undefined only for omitted-and-no-active-plan). Accepted friendly forms: omitted → workspace active plan (implementing, then active); a `pl_…` ULID → verified against known plans; a `weave/thread` or bare `thread` slug → that thread's implementing/active/last plan. Unresolvable explicit values throw with a suggestion. `nextCommand`'s param renamed `planId` → `plan`; it now resolves at the edge and passes the strict `planUlid` to the `do-next-step` prompt. This makes step 4 (tighten the prompt to ULID-only) safe — the CLI never forwards a stem anymore.

Scope note: `resolvePlanUlid` is kept local to `next.ts` for now. `start-plan` and `complete-step` still require the canonical plan id (pre-existing behavior — they match `p.id === planId` / pass straight to strict `plan_ulid`); they do not call `do-next-step`, so step 4 does not regress them. Adopting this same edge-resolver in those two commands (to make them equally slug/human-first) is the natural follow-up, deferred rather than silently folded in — it's an enhancement beyond naming alignment, not a regression introduced here.

## Step 4 — Tighten the do-next-step prompt: replace the tolerant resolveDocIdOrThrow with a strict pl_-ULID guard, matching the write tools. Closes the mcp-read-surface-naming deferred item.

Tightened the `do-next-step` prompt to strict `pl_`-ULID. Factored a shared `isPlanUlid(value)` type-guard out of `requirePlanUlid` in `packages/mcp/src/tools/planUlid.ts` so the tools and the prompt share one definition of "a plan ref is a pl_ ULID." `doNextStep.ts` now imports `isPlanUlid` and rejects any non-ULID `planUlid` (filename stem / title) before calling `resolveDocIdOrThrow` — the tolerant resolver no longer masks a stem. Error message mirrors the tools' wording.

This closes the deferred item from `core-engine/mcp-read-surface-naming` (its chat-001:239): the prompt kept its tolerant resolver only until the CLI thread landed edge-resolution. Step 3 made `next.ts` resolve friendly→ULID, so the prompt is now safely strict and uniform with every write tool.

## Step 5 — Verify/extend the slug-path human-pointable form of the context resource (loom://context/{weaveSlug}/{threadSlug}/{docSlug}); fill only the gap left by mcp-read-surface-naming, do not duplicate.

Verified the slug-path form already existed (`context.ts` handled `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` at 4 segments) — but empirically probing Rafa's exact example `loom://context/cli/cli-surface-naming/chat-001.md` against the running server returned `No document "chat-001.md"`. Root cause: `resolveThreadDocBySlug` stripped `.md` only for the idea/design/req keywords, and matched numbered docs against `d.id`/`d.slug` (a chat's id is a `ch_` ULID, so `chat-001` never matched its filename stem).

Fix (fill-the-gap, not duplicate): rewrote `resolveThreadDocBySlug` to (a) strip `.md` and lowercase uniformly, (b) match a doc by `id`, `slug`, **or its filename stem** derived from `_path` (the name a human sees on disk — `chat-001`, `plan-001`), (c) search all doc collections (allDocs + plans + chats + refDocs) so resolution never depends on how allDocs was populated. Also extended the advertised resource template description in `server.ts` to document the doc-slug form (it previously listed only the ULID and thread-slug forms). Empirical re-verification of `…/chat-001.md` is deferred to step 7 (running MCP server still on old dist until build).

## Step 6 — Persist the surface convention: add a Surfaces-and-their-consumers section to api-naming-reference.md, a compact always-present summary to loom/ctx.md §3, and sweep the CLAUDE.md API short-form if the surface nuance is needed.

Persisted the surface/consumer convention in three always-relevant places:

- **`loom/refs/api-naming-reference.md`** (canonical home) — new "## Surfaces and their consumers" section with the three-class table (CLI slug-first + edge-resolution / MCP agent surface strict ULID / MCP human-pointable read resources slug-path) and the "why resolve at the CLI edge" rationale. Placed after the D5 casing section, before the weave exception.
- **`loom/ctx.md` §3 Architecture** (always-present) — compact 5-line summary of the three forms with a pointer to the reference. This is Rafa's "always be present" ask: ctx.md is `load: always`, so it's in context every session. Written via `loom_patch_doc` (governed doc, not gate-excluded).
- **`CLAUDE.md` API naming rule (hard)** — one sentence folding the surface-form-by-consumer split into the existing repo-specific rule, pointing at the reference table.

**Deliberately NOT touched: `packages/app/src/installWorkspace.ts` (`LOOM_CLAUDE_MD` template).** The API-naming convention governs Loom's *own* API authoring — repo-specific, carries no `rule:` marker, and is explicitly not mirrored to the downstream template (per the rule's own note + api-naming-reference "Where this lives"). Adding it there would be wrong and risks the `claude-md-sync` parity test. The design listed this file, but the correct action is to skip it; the CLAUDE.md edit stayed inside a non-marked paragraph so rule-marker parity and the verbatim invariants are unaffected.

## Step 7 — Add/adjust tests (CLI arg parsing + do-next-step strict-ULID rejection) and run build-all + test-all green.

Build + tests green. `./scripts/build-all.sh` compiles all packages clean; `./scripts/test-all.sh` passes end-to-end.

Fixed one regression surfaced by the suite: the tier-1+2 `loom next` test passed a plan **filename stem** (`feature-plan-001`) that (a) my resolver no longer matched and (b) was a legacy kebab id the strict `do-next-step` rejects. Two-part fix, both model-consistent:
- `next.ts` `resolvePlanUlid` now also resolves a plan by its own id or filename stem (best-effort; `plan-001`), returning the plan's canonical id — so `loom next <stem>` still works.
- Modernized the fixture to seed a `pl_` ULID plan id (plans are ULID-addressed now), so the resolved id passes the strict prompt gate.

Tests added:
- `packages/mcp/tests/integration.test.ts` — `do-next-step accepts a pl_ ULID` and `do-next-step rejects a filename stem` (locks the step-4 strict contract).
- `tests/commands.test.ts` — `loom context <weave>/<thread>/<docSlug>` slug-path assertion (locks the step-5 human-pointable form).

Empirically verified Rafa's exact example against the freshly-built CLI: `loom context cli/cli-surface-naming/chat-001.md` resolves to the chat doc `ch_01KWZ5RCPX3RJQGYAQH2B1WXMV` and prints its bundle. (Note: the session's already-running `loom mcp` server stays on the old dist until an MCP/session restart — the CLI path proves the new behavior.)
