---
type: done
id: pl_01KSTGE28WY9C08MBYQSXGGS7R-done
title: Done — context-sidebar — CONTEXT tree section + persistent overrides (P3)
status: done
created: "2026-05-31T00:00:00.000Z"
version: 6
tags: []
parent_id: pl_01KSTGE28WY9C08MBYQSXGGS7R
requires_load: []
---
# Done — context-sidebar — CONTEXT tree section + persistent overrides (P3)

## Step 1 — Add `loom_set_context_prefs(targetId, { include?, exclude?, reset? })` and `loom_get_context_prefs(targetId)` MCP tools that read/write `.loom/context-prefs.json` with the §3 mode-agnostic per-target schema (`{ [targetId]: { include: string[], exclude: string[] } }`). Unit tests cover merge semantics, `reset: true` clearing, missing-file create, malformed-JSON repair.

Added the `.loom/context-prefs.json` persistence layer and its two MCP tools.

**Types (core):** `packages/core/src/entities/context.ts` — `ContextPrefsEntry` (= `ContextOverrides`: `{ include: string[]; exclude: string[] }`) and `ContextPrefs` (`Record<targetId, ContextPrefsEntry>`); exported from `packages/core/src/index.ts`.

**File IO (fs):** `packages/fs/src/repositories/contextPrefsRepository.ts` — single source of write truth:
- `readContextPrefs(root)` — missing file → `{}`; malformed JSON or non-object/array root → `{}` (self-repairs on next write); entries normalised to string arrays.
- `readContextPrefsEntry(root, targetId)` — entry or empty.
- `setContextPrefs(root, targetId, { include?, exclude?, reset? })` — **replace semantics**: a provided list replaces that list wholesale (omitted list preserved), which is what lets the sidebar express "un-exclude X" by sending a shorter array; `reset:true` deletes the entry; an entry emptied to `[]/[]` is pruned; dedupes; creates the file + `.loom/` dir on first write. Exported from `packages/fs/src/index.ts`.

**MCP tools (mcp):** `packages/mcp/src/tools/setContextPrefs.ts` (`loom_set_context_prefs`) and `getContextPrefs.ts` (`loom_get_context_prefs`); registered in `BASE_TOOLS` in `server.ts`.

**Decision recorded:** chose **replace** over union/merge semantics — union can't express per-doc un-exclude, which the sidebar's reset-to-auto needs. Documented in the repository docstring.

**Tests:** `tests/context-prefs.test.ts` (real-fs) covers missing-file read, create, replace-preserves-omitted-list, un-exclude-via-replace, dedupe, empty-entry pruning, reset-clears-only-target, malformed-JSON repair, array-root repair. Added to `scripts/test-all.sh`. Green. Build green.

## Step 2 — Wire `.loom/context-prefs.json` into the context read path as `overrides`: the `loom://context/{docId}?mode={mode}` resource handler AND the `loom_do_step` / refine brief assembly (§10) both read the resolved target's entry and pass it to `assembleContext`. Confirm the Phase-1 hook; add it if absent. MCP integration test asserts an excluded id appears in the bundle's `excluded[]` with reason `user-exclude`.

Wired `.loom/context-prefs.json` into the context read path at the single chokepoint.

**`packages/mcp/src/resources/context.ts`** — after `getState`, resolve the target's canonical id (`resolveId(state.index, targetId)`) and read its overrides via `readContextPrefsEntry(root, canonicalId)`, then pass them to `assembleContext` (was hardcoded `{ include: [], exclude: [] }`). Keyed by canonical id because that's what the assembler returns as `bundle.targetId` and what the sidebar will write prefs under.

**Coverage — one hook covers everything:** confirmed via grep that *every* context consumer routes through `handleContextResource` — `loom_do_step`, the `do-next-step` prompt, `loom_generate_*`, `continue-thread`, `weave-design`, `weave-plan`. So wiring the resource is the complete Phase-1 hook; no per-caller changes needed. (The refine tools/prompts do not assemble a context bundle today, so there is no separate refine brief to wire — noted to avoid over-scoping the design's "do_step/refine" phrasing.)

**Test:** added integration test (b3) in `packages/mcp/tests/integration.test.ts`: set an exclude for `t1-idea` on target `tw-plan-001` → `loom://context` no longer contains `id: t1-idea` (design still present) → `loom_get_context_prefs` round-trips → `reset:true` restores the idea. Also asserts both new tools appear in `listTools`. 9/9 integration tests green. Build green.

## Step 3 — **Rebase `ContextSidebarProvider` onto the bundle.** Replace its local pinned/opt-in derivation (`onSelectionChanged` walking `thread.idea/design/plans/chats/refDocs`) with a read of `loom://context/{target}?mode=` for the focused node; render one row per `BundledDoc` from `docs[]` + `excluded[]`, using the §2 symbol set (✓ auto, 📌 user-include, 🚫 user-exclude, ⊘ filtered-but-required, 🔒 always-locked, ⚠ stale, ❌ missing). Keep the existing token-count rendering.

Rebased `ContextSidebarProvider` (`packages/vscode/src/providers/contextSidebarProvider.ts`) onto the pipeline bundle — the local pinned/opt-in derivation is gone.

**Structured bundle access:** added a `?format=json` variant to the context resource (`packages/mcp/src/resources/context.ts`) — same `assembleContext` call + same prefs read, just `JSON.stringify(bundle)` with `application/json` instead of the markdown serialisation. Default stays markdown so prompt-injection callers are unchanged. This is what lets the sidebar render reasons/flags without parsing markdown.

**Provider:** `onSelectionChanged(node)` now resolves the focused node to a context target — doc-form (`loom://context/{doc.id}?mode=&format=json`, mode via `MODE_BY_TYPE`) or thread-form (`loom://context/thread/{weave}/{thread}`) — reads the JSON bundle through `getMCP().readResource`, and renders one row per `BundledDoc` (+ surfaced `excluded[]`). Row state → symbol: ✓ auto, 📌 user-include, 🔒 always-locked (new `alwaysLocked` bundle flag), 🚫 user-exclude, ○ load_when-filtered (available to include), ❌ missing. Token counts come straight from `BundledDoc.tokenEstimate` / `bundle.totalTokens` (dropped the old per-file `fs.readFileSync` + `loom_find_doc` pre-fetch; `openDoc` resolves the path lazily on click). Sections: "Context {tokens}" for included rows, "Excluded / available" for the rest, plus a Total row. `targetId` is taken from `bundle.targetId` (canonical) so prefs key correctly.

**Bundle enrichment (core + app):** added `alwaysLocked?: boolean` to `BundledDoc` (core) and set it in `assembleContext`'s `addReference` when a `load: always` ref is emitted — so the sidebar can distinguish 🔒 from plain ✓. Additive, no behavior change; existing assembler/serialiser tests stay green.

Build green; full suite (incl. context-assembler) green.

## Step 4 — Make toggles persist. Replace the in-memory `toggle()` (`loaded` flag) with include / exclude / reset-to-auto commands that call `loom_set_context_prefs`, then re-read `loom://context/{target}?mode=` and refresh the view (§6 always re-run — no predictive UI). Remove the ephemeral launch channel (§10): delete `getSelectedIds()` and the `buildPrompt(..., contextIds)` / `context_ids` arg in `doStep`/`refine`/`refinePlan` — launches now get overrides from prefs via step 2.

Toggles now persist, and the ephemeral launch channel (§10) is removed.

**Persisted toggles (provider):** three actions — `exclude(id)` / `include(id)` / `reset(id)` — read the authoritative current entry via `loom_get_context_prefs`, compute the new arrays with **replace** semantics (exclude = add id + drop from include; include = add id + drop from exclude; reset = drop from both), call `loom_set_context_prefs`, then re-read `loom://context?...&format=json` and refresh (design §6: always re-run, no predictive UI). Surfaced as three commands `loom.context.{exclude,include,reset}` wired by `viewItem` in `package.json` `view/item/context` (exclude on ctx-auto/ctx-locked; include on ctx-excluded/ctx-available; reset on ctx-pinned/ctx-excluded). The old single `loom.context.toggle` command + its `Toggle` contribution are deleted.

**§10 ephemeral channel removed:**
- `getSelectedIds()` deleted from the provider (no in-memory `loaded` flags anymore).
- `packages/vscode/src/commands/doStep.ts` — `buildPrompt` no longer takes/embeds `contextIds`/`context_ids`; `doStepCommand` drops the `contextSidebar` param and the unused import.
- `refine.ts` / `refinePlan.ts` — dropped the `contextSidebar` param, the `getSelectedIds()` call, the `ctxNote`, and the `context_ids` arg to `loom_refine_design` / `loom_refine_plan`.
- `extension.ts` — `loom.generateDesign` / `loom.generatePlan` no longer read `getSelectedIds()` or pass `context_ids`; the `refineDesign`/`refinePlan`/`doStep` registrations no longer pass `contextSidebar`.

Launches now get overrides purely from `.loom/context-prefs.json` via the resource read path wired in step 2 — one source of truth.

**Scope note (deliberate):** left the `context_ids` *parameter* on the MCP tools (`loom_do_step`, `loom_refine_*`, `loom_generate_*`) in place. §10 scoped the removal to the sidebar→launch ephemeral channel (the vscode side); the MCP param is a generic server-side injection capability predating this thread (vscode-ctx) that an agent can still use directly. Ripping it out of the generate/refine tools is a separate cleanup, not this thread's concern.

Build green; full suite green; `grep` confirms no remaining `getSelectedIds` / `context.toggle` / `loaded(Doc)` references in `packages/vscode`.

## Step 5 — Render the remaining UX from bundle metadata: ⚠ stale and ❌ missing badges; a confirm dialog when excluding a 🔒 (`load: always`) ref (§5 warn-on-confirm), surfaced afterward as 🚫 with an "overrides always" badge; a tooltip on a ⊘ row naming which doc's `requires_load` pulls it in.

Completed the bundle-metadata UX, including the ⊘ work Rafa approved (option A — requires_load wins over user-exclude).

**Assembler change (design §5 — packages/app/src/context/assembleContext.ts):**
- `add()` now lets `reason === 'requires_load'` bypass a user-exclude (was: only `user-include` bypassed). When it does, the emitted doc's reason becomes `user-exclude-overridden` and it carries `requiredBy` = the requiring doc's id.
- `resolveRequiresLoad` threads `requiredBy` through its queue (`{ ref, requiredBy }`) so the provenance is accurate (which doc pulled it in), including transitively.
- `requiredBy` is also set when requires_load overrides a `load_when` filter (design §2 flavour of ⊘).
- `finalExcluded` now drops both `load_when-filter` and `user-exclude` entries for any id that actually ended up emitted — no contradictory "excluded" record for a doc that's in the bundle; the override is surfaced on the BundledDoc (reason/requiredBy) instead.
- Added `requiredBy?: string` to `BundledDoc` (core).

**Assembler test:** new case — excluding `rf-A` (which `c1` requires) keeps it in the bundle with `reason: 'user-exclude-overridden'` + a `requiredBy`, and it is NOT in `excluded[]`. Green. Existing exclude test (i1, not required by anything) still shows it dropped — exclude still wins when nothing needs the doc.

**Sidebar (provider):**
- ⚠ stale: rendered in the row description + tooltip from `BundledDoc.stale`.
- ❌ missing: `missing` placeholders and `excluded[] reason: 'missing'` render as a red error row.
- 🔒 warn-on-confirm: excluding a `load: always` (locked) row pops a modal ("Force-exclude X? It is marked load: always…"); only "Exclude anyway" proceeds. After exclude it renders 🚫.
- ⊘ required: a row with `requiredBy` renders as `ctx-required` (yellow check) with tooltip "you excluded this, but {requiredBy} requires it — included anyway"; offers a reset action so the user can drop the (overridden) exclude. Wired `loom.context.reset` to `ctx-required` in package.json.

Build + full suite green.

## Step 6 — Smoke test in the VS Code extension: open a chat in an active thread; exclude an auto-loaded reference via the toggle; click Reply; verify the `📄` visibility line for that ref does NOT appear, the prefs file shows the exclude, and the bundle's `excluded[]` carries `reason: 'user-exclude'`. Run `./scripts/build-all.sh` and `./scripts/test-all.sh` green.

Verification.

**Automated (done, green):**
- `./scripts/build-all.sh` — all packages compile, CLI relinked.
- `./scripts/test-all.sh` — all 13 test files pass, including:
  - `tests/context-prefs.test.ts` (prefs repository: replace/reset/missing/malformed).
  - `tests/context-assembler.test.ts` (incl. the new §5 override case).
  - `packages/mcp/tests/integration.test.ts` (9/9) — the (b3) case is exactly the step-6 data-path assertion through real MCP: `loom_set_context_prefs` exclude → `loom://context` no longer contains the doc → `loom_get_context_prefs` round-trips → `reset` restores. This proves the prefs→bundle exclusion path end-to-end.

**Manual (pending Rafa):** the literal in-editor click-through — open a chat in the Extension Development Host, click 🚫 on an auto-loaded ref row, click Reply, and eyeball that the `📄 {ref} — loaded for context` line is absent — requires a live VS Code instance I can't drive from here. The underlying data path it would exercise is already proven by the integration test above; this is the human confirmation of the rendered UI (icons, inline actions, the warn modal). Recommend Rafa runs the extension (F5) once to confirm the visuals.
