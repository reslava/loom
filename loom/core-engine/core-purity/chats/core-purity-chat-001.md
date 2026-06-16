---
type: chat
id: ch_01KV8T6JD7YEE8EQ87CRD7WVRX
title: core-purity Chat
status: done
created: 2026-06-16
updated: 2026-06-16
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 8
---
# core-purity Chat

## Rafa:

I started the Plan 
Do whole plan

## AI:

Starting the whole plan **"Move ConfigRegistry IO into fs + add a core-purity guard"** (5 steps) — you authorized all steps, so I'll run through them without stopping between each, marking ✅ + appending a done note per step.

Two adjustments to the plan as written, both for correctness:
- **Import paths**: step 2 says repoint to `@reslava-loom/fs/dist`, but the actual repo convention is *relative* paths (`../../fs/dist` from app, `../../../fs/dist` from cli/mcp). I'll follow the real convention.
- **Duplicate types**: `packages/fs/src/utils/workspaceUtils.ts` already redefines `LoomEntry`/`LoomRegistry` (a pre-existing duplicate of the ones in `core/src/registry.ts`). To avoid leaving trash, the moved `registryRepository.ts` will own those types and `workspaceUtils.ts` will import them — one definition, no duplication.

Also: the importer set is wider than the plan's indicative file lists (cli `next`/`status`/`search`/`blocked`/`stale`, and all of mcp's resources/tools construct `new ConfigRegistry()`). The grep is the source of truth, so I'll repoint all of them.

## AI:

✅ **Whole plan done** — all 5 steps complete, plan auto-transitioned to `done`.

**What changed**
1. `ConfigRegistry` moved out of pure core → `packages/fs/src/repositories/registryRepository.ts` (it's inherently IO). Deleted `packages/core/src/registry.ts`. Consolidated the pre-existing duplicate `LoomEntry`/`LoomRegistry` in `workspaceUtils.ts` to import from the repository — one definition, no trash.
2. Repointed **28** importers (7 app, 11 cli, 10 mcp) to the fs layer, split the 4 combined mcp imports, and dropped the `ConfigRegistry` re-export from the core barrel.
3. Verified `packages/core/src` has zero fs/os/node:fs imports.
4. Added `tests/core-no-fs-imports.test.ts` (no whitelist — core is 100% IO-free) and wired it into `test-all.sh`.
5. `build-all` clean; `test-all` fully green; new guard scans 44 core files, 0 violations.

**Outcome vs. the idea**: the "core has zero IO" contract is restored *and* mechanically locked — the same drift can't recur silently. The guard would have gone red on the old `registry.ts`.

Nothing committed — all changes are in the working tree (`packages/**` + `tests/**` + `scripts/test-all.sh`). Say the word and I'll commit to `main`.

Next: waiting for direction (commit?).

## Rafa:

commit, push

### Do we need more guards?

Now we have 2 guards:
tests/core-no-fs-imports.test.ts
tests/vscode-no-fs-imports.test.ts

in loom/refs/architecture-reference.md we have 
Package Relationships line 22

```markdown
## 1. Package Relationships (Stage 2)


CLI (packages/cli)          VSCode (packages/vscode)
  │                              │
  │                         thin MCP client
  └──────────┬─────────────────┬─┘
             │                 │
             │                 ▼
             │          MCP Server (packages/mcp)
             │          resources, tools, prompts, sampling
             │                 │
             └─────────────────┤
                                ▼
         Application Layer (app)
         Use-cases: weaveIdea, weaveDesign, weavePlan,
         finalize, rename, startPlan, completeStep,
         closePlan, chatNew, promoteToDesign, etc.
         Query use-cases: searchDocs, getStaleDocs,
         getBlockedSteps (shared by MCP tools + CLI)
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
         Domain Layer (core)    Infrastructure Layer (fs)
         Entities, reducers,    Repositories, serializers,
         events, validation     link index, path utils

**Dependency rules (Stage 2):**
- `cli` may call app directly (inspection/queries) or reach the MCP surface
  **in-process** — `packages/cli/src/mcpClient.ts` builds the server with
  `createLoomMcpServer` over the SDK's in-memory transport and runs the handshake
  internally, so commands like `loom catalog` / `loom resources` / `loom context` /
  `loom next` read MCP resources & prompts with no subprocess or hand-typed JSON-RPC.
  Query commands (`loom search` / `stale` / `blocked`) call the shared app query
  use-cases directly — the same ones their MCP tools delegate to (one source of truth).
- `vscode` **must** call MCP only — no direct app imports
- `mcp` server may **only** import from `app` — it is the gate
- `app` may **only** import from `core` and `fs`
- `core` may **only** import from itself
- `fs` may **only** import from `core` and standard libraries
```

Should we create guards for all Dependeccy rules?


## AI:

Committed + pushed to `main` (`d8c9c68`). Git tracked the move as a rename.

## Do we need more guards?

Short answer: **not "one per rule" — and one of the rules you'd guard is already false today.** I audited the actual imports before answering.

*Vision check first (per the contract): guards are internal architecture hygiene, not a user-visible feature — same justification as the core-purity guard itself. They don't remove a manual user step; they protect a contract that keeps the engine buildable and stops recursive AI sessions from silently eroding the layering. So judge them on that ROI, not on the vision.*

### The finding: the `mcp → app only` rule is not real

The doc says *"mcp server may only import from app — it is the gate."* The code says otherwise:
- `packages/mcp/src` imports **fs directly 66×** and **core directly ~24×** (plus app ~20×).
- That's by design in practice: MCP resources (`state`, `roadmap`, `diagnostics`, `context`) assemble read-models straight from `getActiveLoomRoot`/`loadWeave`/`buildLinkIndex` (fs) + `buildRoadmap`/derived (core), not through app query use-cases.

So a guard for that rule would go **red on ~90 imports on day one**. Before any guard, that's a design decision for you:
- **(A)** The rule is aspirational — correct the doc to *"mcp may import app, plus core (types/derived) and fs (repositories) for read paths."* Reality wins.
- **(B)** The rule is right — route every MCP read through an app query use-case so app is truly the only gate. Bigger refactor, arguably purer, but lots of churn for read-only paths.

My lean: **(A)**. The "gate" that actually matters is *vscode → mcp* (already guarded) and *no upward imports*; forcing trivial reads through app is ceremony.

### The rules genuinely worth guarding (true today, cheap)

These hold right now (I verified: zero violations) and are cheap to lock:
- `app` imports nothing from `cli`/`vscode`/`mcp` ✓
- `fs` imports nothing from `app`/`cli`/`vscode`/`mcp` ✓
- `core` imports nothing from any sibling package (extends the guard I just added beyond just fs) ✓

### Form: one table-driven guard, not N copy-pasted files

If we do this, the clean approach is a **single** `tests/layer-imports.test.ts` with a matrix:

```
core   → (nothing — siblings)        + no node-fs
fs     → core                        + node-fs allowed
app    → core, fs
mcp    → app, core, fs   (per option A)
cli    → app, mcp, core, fs
vscode → mcp                         + no node-fs   (whitelist)
```

Walk each `packages/*/src`, flag any `@reslava-loom/*` or node-fs import not in its row. That covers **all** the dependency rules in one place and folds in the fs-purity concern (core/vscode rows). The two existing bespoke guards could later be subsumed by it (or kept — vscode's has the tmpfile whitelist).

### Honest cost note

This is ~1–2h of inward-facing infra with no user signal — and per our standing context, Loom is still an unvalidated bet where building-in-the-dark is the risk. The two guards we have earned their place because those boundaries *actually drifted*. The `app`/`fs`/`core` rows have **never** drifted, so the table-driven guard is cheap *insurance*, not a fix for an active bug. Defensible inside the "build Loom with Loom" loop; not urgent.

**Decision needed (architecture — I'm stopping here):**
1. mcp rule → **(A)** correct the doc, or **(B)** refactor mcp reads through app?
2. Build the single table-driven `layer-imports` guard, or leave the 2 we have?

I won't write anything until you pick. **STOP — waiting for go.**

## Rafa:

1. A correct the doc, review the rest also
2. Create a weave/thread idea for the single table-driven `layer-imports` guard


## AI:

Both done.

**1. Corrected `architecture-reference.md` §1 (option A) + reviewed the rest.** Audited every dependency rule against the actual imports first:
- **`mcp`** — rewrote the false "may only import from app" rule: `mcp` is the **mutation gate** (state changes go through `app` use-cases), but its read-model resources (`state`/`roadmap`/`diagnostics`/`context`) legitimately compose `core` + `fs` directly. It must not import `cli`/`vscode`. Noted that routing trivial reads through `app` was considered and rejected as ceremony.
- **`cli`** — clarified it also reads `core`/`fs` types directly (verified: imports app 24×, fs 41×, core 6×, mcp 3×, vscode 0×), not just `app`.
- **`vscode`** / **`core`** — added cross-references to their guards (`vscode-no-fs-imports`, `core-no-fs-imports`); both rules verified true (core imports zero siblings, zero node IO).
- **`app`** / **`fs`** — verified accurate (no upward imports), left as-is, tightened wording.
- Added a closing principle: MCP is the gate **for mutations**; engine-internal read paths may compose `core` + `fs`. Bumped the ref to `version: 5`.

**2. Created the idea** for the table-driven guard: `loom/core-engine/layer-imports-guard/layer-imports-guard-idea.md` (`id_01KV93ZE152CHPW6CTV8VNPBMG`, status `draft`, thread manifest auto-scaffolded). It captures the full matrix, the subsume-and-delete of the two existing guards, success criteria, and one open design question (whether to also assert matrix↔doc parity mechanically, like `claude-md-sync` does).

Both changes are **uncommitted** (working tree: `loom/refs/architecture-reference.md` + the new `layer-imports-guard/` thread). I deliberately didn't auto-commit — say the word.

Next: review/finalize the idea (then design → plan when you want it built), or commit these two changes. Your call — waiting.

## Rafa:

commit push

note: I find roadmap very useful