---
type: chat
id: ch_01KXMY26KA0RA0J1XKN66YQRHS
title: layer-imports-guard Chat 001
status: done
created: 2026-07-16
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 13
---
# layer-imports-guard Chat 001

## Rafa:

read idea
worth to implement? I lean yes
if so, is grounded for a design?
if so, write design

## AI:

### Worth implementing? — yes.

Vision check: this doesn't map to a user-visible behavior — it's internal hygiene, and the idea already says to judge it that way. So the honest frame is *cheap insurance for a keystone invariant*, not a feature. On that frame it's a clear yes:

- The `cli/vscode → mcp → app → core + fs` layering is the design's spine, but today only **2 of the 6 edges** are guarded (`core`-no-fs, `vscode`-no-fs). `app`/`fs`/`cli`/`mcp` hold by convention alone.
- We *just* paid for that gap: the `core-purity` thread fixed a `ConfigRegistry` IO leak that a guard would have caught at write time instead of at audit time. That's the exact drift class, already realized once.
- It's also DRY: the two existing guards duplicate the same `walk` + `SPEC_RE` scan, and the rules are currently written **twice** (prose in `architecture-reference.md` §1 + two partial test files). One executable matrix collapses both.

The one caveat is honesty about urgency: the `app`/`fs`/`core` edges have *never* drifted, so this is insurance, not a fire. Scheduling stays your call — but the cost is low (one test file, subsumes two) and the matrix is already fully specified in the idea, so there's little reason to defer.

### Grounded for a design? — yes, with one fork to settle first.

The idea is unusually design-ready: the allowed-import matrix is fully enumerated, the two bespoke guards are explicitly marked for subsumption, and the vscode tmpfile/bootstrap whitelist is called out as a per-file exception to preserve. The mechanics (`walk` each `packages/*/src`, flag any `@reslava-loom/*` or node-fs import not permitted by the row) are proven code we're consolidating, not inventing.

What *isn't* settled is the idea's own **Open question**, and it's a genuine test-design decision — so per the design-decision stop rule I want your call before I write the design around it:

**Should the guard also assert matrix ↔ `architecture-reference.md` §1 parity mechanically, or just cross-reference?**

- **A — mechanical parity** (like `claude-md-sync.test.ts`): the test parses §1 and asserts the prose matrix matches the executable one. *Pro:* prose can't drift from the rule. *Con:* §1 is English prose, not a table — parsing a dependency matrix out of it is brittle, and to make it robust we'd have to add a machine-readable block/markers to §1, which is real added surface for a 6-row table.
- **B — single source of truth + cross-reference** (my recommendation): the test file's matrix *is* canonical (executable), and §1 gets a one-line "canonical matrix lives in `tests/layer-imports.test.ts`" note. *Pro:* no fragile prose-parsing; matches the idea's own "single source of truth" language better than duplicating the matrix into a parity check. *Con:* relies on a human keeping the §1 prose consistent — but §1 becomes a *description* pointing at the executable truth, not a second source, so there's nothing to drift *out of sync with* in the way the two CLAUDE.md files can.

I lean **B**: mechanical parity earns its brittleness for the CLAUDE.md pair because *both* surfaces are authored prose that must stay verbatim-aligned; here one side is executable code, so the clean move is to make it the sole source and demote §1 to a pointer. A over B only if you want §1 to remain a fully self-contained normative table.

Tell me B (or A), and I'll write the design — matrix model, subsumption of the two guards, whitelist-as-exception, and `test-all.sh` wiring — in one pass.

**Next:** waiting on your A/B call on the parity question, then I generate `design.md`.

## Rafa:

I also lean B
We have hard sync contract for update `loom/refs/architecture-reference.md` when needed so dependencies should be always updated, so the description prose should be accurate alsop, correct?
write design

## AI:

B it is — and yes, you're exactly right: the doc-sync contract already does the work. CLAUDE.md's *"Package layers / architecture"* row lists `architecture-reference.md` as a must-update-in-the-same-commit doc, so §1's prose is *already contractually required* to track any dependency-rule change. That means we don't add anything on the enforcement side: the `MATRIX` constant is the sole executable source of truth, and §1 stays its accurate human-readable mirror, kept honest by the sync contract. A mechanical parity assertion would only earn its brittleness if both sides were prose (the CLAUDE.md pair) — here one side is code, so we make it canonical and point §1 at it.

Design written → `design.md` (draft). Shape:

- **One matrix constant** drives a single `walk` + `SPEC_RE` scan (both lifted verbatim from the existing guards) across every `packages/*/src`. Per row: allowed sibling packages + node-fs banned? + optional per-file whitelist.
- **Two completeness teeth:** whitelist-hygiene (preserved) + a new **package-coverage** assert — add a `packages/*` with no matrix row and the test goes red. That's the tooth that would've caught the `ConfigRegistry` leak class.
- **Subsumes and deletes** both bespoke guards; preserves the vscode whitelist (`claudeTerminal.ts`, `extension.ts`); swaps the two `run_test` lines in `test-all.sh` for one.

Two fidelity corrections to your idea's 6-row sketch, both because getting them wrong makes the guard red on a clean tree — flagging so they're a conscious choice, not a silent edit:

1. **`vscode → { mcp, core }`, not `mcp`-only.** Today's vscode guard already permits pure-`core` type imports; the extension uses them. §1's intent is "no `app`/`fs`", not "no core".
2. **`telemetry` is a real 7th package** the sketch omitted — a leaf importing no sibling, and a permitted target for `app`/`mcp`/`cli`. Its exact appearance in the `mcp`/`cli` rows gets confirmed by the first scan run (the design seeds the matrix from §1, then reconciles each red against the tree rather than snapshotting imports).

node-fs bans stay scoped to `core` + `vscode` only — extending the ban to `app`/`mcp`/`cli` isn't guarded today, so it's out of scope for a subsume-and-extend change (trivial follow-up if you ever want it).

**Next:** review `design.md`. When it reads right, say `finalize design` (or point at a section to adjust) and I'll draft the plan — it's small enough to be a handful of steps.

## Rafa:

i marked idea + design done
write a plan or 
code quick
as you consider

## AI:

Going `code quick`.

Reasoning: this lands as **one atomic unit** — write `tests/layer-imports.test.ts`, delete the two bespoke guards, swap the `run_test` lines. You can't half-ship it (deleting the two guards without the replacement would leave the tree *less* guarded mid-plan), so splitting it into stop-between-me steps would be pure ceremony. And it's **self-verifying**: `test-all` going green on the clean tree *is* the proof, plus I'll inject a violation to confirm it goes red. A formal plan buys nothing here that quick-ship's versioned-history entry doesn't.

Implementing now → build-all + test-all + red-on-violation check → `loom_quick_ship`. Back with the result.

## AI:

Started implementing `code quick` and hit a real finding that changes the design's scan model — stopping before I write, because it involves an architecture-boundary call that's yours.

**1. The design's scan model is insufficient (must fix).** The design says the sibling axis flags `@reslava-loom/<x>` specifiers. But that's not how the engine packages import each other — they use **relative paths**: `app` has 153 cross-package relative imports (`from '../../core/dist'`), `mcp` 185, `cli` 125, `fs` 24. Only `vscode` uses `@reslava-loom/*` specifiers. A specifier-only scan would walk `app`/`fs`/`mcp`/`cli`, find zero `@reslava-loom/*` imports, and **pass vacuously** — the exact packages the idea exists to guard would be checked by a no-op. Fix is clean: resolve every relative specifier to an absolute path and detect its `packages/<x>/` segment (node-fs axis is unaffected — those are always bare specifiers). I'll build the resolving version; that part's not a question.

**2. Reconciled matrix (empirical, resolver-verified against the current tree):**

```
core      → []                          ✓ §1 (zero siblings)      node-fs BANNED
fs        → [core]                       ✓ §1                      node-fs allowed (fs-extra)
telemetry → []                           ✓ §1 (leaf)               node-fs allowed
app       → [core, fs, telemetry]        ✓ §1                      node-fs allowed
mcp       → [app, core, fs, telemetry]   ✓ §1 (+telemetry conf.)   node-fs allowed
cli       → [app, core, fs, mcp, telem.] ✓ §1 (+telemetry conf.)   node-fs allowed
vscode    → [core, fs, mcp]              ⚠️ fs is the finding       node-fs BANNED (whitelist)
```

Everything matches §1 exactly — **except one edge the current guard is blind to:**

**3. The finding: a live `vscode → fs` import the specifier-only guard misses.** `packages/vscode/src/loom-mcp-entry.ts:12` does `import { resolveLoomRoot, loomRootNotice } from '../../fs/dist'`. Today's `vscode-no-fs-imports` guard only bans the `@reslava-loom/fs` *specifier*, so this relative import has been invisible. The resolving guard catches it immediately. It's **not a bug** — that file is the bundled MCP server entry (`dist/loom-mcp.js`), server code that legitimately composes `mcp + app + core + fs + telemetry`, physically in the vscode package only for esbuild bundling. It plays by *server* rules, not *extension-UI* rules.

**The call for you:** how do we model that exception?

- **(a) Per-file whitelist** *(my recommendation)* — add `loom-mcp-entry.ts` to the vscode row's sibling-axis exceptions with reason "bundled MCP server entry — server boot, not extension UI." Keeps the `vscode → {core, mcp}` UI rule strict (`fs`/`app` stay banned for real extension code) while acknowledging the one server file. Mirrors how we already whitelist `claudeTerminal.ts`/`extension.ts` on the node-fs axis.
- **(b) Split the boundary** — treat `loom-mcp-entry.ts` (and anything it's the entry for) as *not* under the vscode UI rule at all, e.g. move server-entry files to their own matrix bucket. Cleaner conceptually, but more churn and the file has to live in `packages/vscode/` for bundling regardless.

I lean **(a)** — smallest honest change, and the whitelist reason documents exactly why the exception exists. (b) is architecturally purer but buys little for one file.

Once you pick, I'll write the resolving guard with that exception, subsume the two old guards, rewire `test-all.sh`, verify green + red-on-violation, and quick-ship. I'd also patch the design's scan-mechanics section to match reality (it currently describes the specifier-only model) — say the word and I'll fold that in.

**Next:** waiting on your (a)/(b) call on the `loom-mcp-entry.ts` exception.

## Rafa:

I knew delaying this was not good idea, but cost and no feedback push me to delay
Now we find surprises, hard to decide, lets think slow and secure...

What we will find when we do the fix: resolve every relative specifier to an absolute path and detect its `packages/<x>/` segment?

About `loom-mcp-entry.ts`, yes, I think it is a justified exception, I lean (A) but also I am thinking if  we could add `app` use cases for `resolveLoomRoot`, `loomRootNotice` and a little mcp resource to wire them. What do you think?

## AI:

On the delay — no self-blame warranted: the idea itself said this was cheap insurance, explicitly *not urgent*, with the never-drifted edges. The surprise isn't rot from waiting; it's that the *old* guards were specifier-only and never saw the relative-path edges at all. We're finding it now because we're finally looking properly. That's the guard doing its job before it even exists.

## 1. What the resolving scan finds — full sweep, all 7 packages

I ran an exhaustive version (resolves relative paths + `@reslava-loom/*` specifiers, and also catches `export…from`, `require()`, and dynamic `import()`). Every cross-package edge in the tree:

```
app  → core(47) fs(45) telemetry(1)
cli  → app(36) core(2) fs(45) mcp(2) telemetry(1)
fs   → core(7)
mcp  → app(58) core(20) fs(69) telemetry(3)
vscode → core(11) fs(1) mcp(1)
(core, telemetry → nothing)
```

Reconciled against §1, **every edge is legal except one**. And two safety checks came back clean:

- **Dynamic `import()`: none anywhere.** So a static scan is complete — there's no runtime-hidden edge that could slip a `require` past us. This is the thing that would have made me nervous; it's clean.
- Against the proposed matrix, the scan flags exactly **three** things, and two are already-known whitelist entries: `claudeTerminal.ts` and `extension.ts` importing node `fs` (carried over from today's guard). The **only** net-new surface is the single `loom-mcp-entry.ts → fs` package edge.

So: no more surprises hiding. The tree is fully conformant except that one server-entry file. That's the whole surface area of this change — which is exactly the "think slow, then it's actually small" outcome we wanted.

## 2. Your `app` use-case + MCP-resource idea for `resolveLoomRoot`/`loomRootNotice`

I love the instinct — "the extension package shouldn't reach into fs" is the right rule for extension *UI* code. But for **this** function it runs into a hard wall, and it's worth seeing why:

**`loom-mcp-entry.ts` is the process that boots the MCP server.** It calls `resolveLoomRoot(process.env, cwd)` to discover *where* `.loom/` is, so it can start the server rooted there. You can't resolve the root by reading an MCP resource, because **the MCP server doesn't exist yet — this file is what creates it.** Chicken-and-egg: the resource would need a running server, which needs the root, which is the thing we're resolving. It's the same category as the `extension.ts` node-fs whitelist ("probes `.loom/` config *before the MCP client exists*").

Making them `app` use-cases doesn't help either: the entry would then import `../../app/dist` instead of `../../fs/dist` — and `app` is *more* forbidden for vscode than `fs` is. It just moves the exception from the fs-edge to the app-edge; net exceptions unchanged, arguably worse.

And the placement is already correct: `resolveLoomRoot` walks the filesystem for `.loom/` — that *is* fs-layer infra, and the CLI's own `loom mcp` boot imports the very same functions from fs with zero issue (cli→fs is legal). The only reason it *looks* like a violation is that Loom's server has a **second** entry point that lives in `packages/vscode/` purely so esbuild can bundle it into the VSIX.

**So the real resolution isn't to route it through MCP — it's to recognize `loom-mcp-entry.ts` is not extension code at all.** `packages/vscode/` compiles **two** bundles: the extension UI (`extension.js`, mcp/core-only) and the bundled server (`dist/loom-mcp.js`), which is a separate executable the extension spawns as a subprocess. The server bundle legitimately composes the engine. **(a) whitelist is the minimal honest way to encode "this one file is the server, not the UI"** — it keeps `fs`/`app` genuinely banned for all real extension code, and the whitelist *reason* documents exactly why the exception exists (same shape as the node-fs whitelist we already keep).

The heavier alternative — hoist `loom-mcp-entry.ts` into its own tiny package (or matrix bucket) so it's categorized as server, not vscode — is architecturally purer but real churn (new package, esbuild rewiring) for one 30-line bootstrap. Not worth it now; if the vscode package ever grows a *second* server-side file, revisit.

**My recommendation: (a)**, sibling-axis per-file exception `loom-mcp-entry.ts → +fs`, reason "bundled MCP server entry — server boot, not extension UI." Reject the MCP-resource route (bootstrap paradox), keep `resolveLoomRoot`/`loomRootNotice` in `fs` where they correctly live.

**Next:** if you're good with (a), I'll write the resolving guard, fold in both node-fs whitelist entries + the one sibling exception, subsume & delete the two old guards, rewire `test-all.sh`, verify green + red-on-injected-violation, patch the design's scan-mechanics section to match, and quick-ship. Say go.

## Rafa:

1. What the resolving scan finds: happier and more at peace thanks to the findings

2. Your `app` use-case + MCP-resource idea: thanks for the reasoning, I see the whol picture clear now, subproccess invloved always drift my vision. I also lean (A), not worthy (B) for this small and justified exception for now. So (A)

go

## AI:

Done — shipped and verified. ✅

**What landed:**
- `tests/layer-imports.test.ts` — one `MATRIX`-driven guard over all 7 packages (319 files scanned), two axes per row (sibling packages + node-fs), resolving **both** `@reslava-loom/*` specifiers **and** relative cross-package paths, plus `export…from`. Includes the node-fs whitelist (`claudeTerminal.ts`, `extension.ts`), the (a) sibling exception (`loom-mcp-entry.ts → +fs`, reason documented in-file), whitelist-hygiene asserts, and the **package-coverage tooth** (new `packages/*` with no row → red).
- `tests/core-no-fs-imports.test.ts` + `tests/vscode-no-fs-imports.test.ts` **deleted** (fully subsumed, no duplicate scan logic left).
- `scripts/test-all.sh` — two `run_test` lines swapped for one.
- `design.md` patched to match reality: resolving scan model, `siblingExceptions` in the data model, the vscode row exception, and the open-questions section now records both implement-time findings (telemetry membership confirmed in `mcp`/`cli`; the `loom-mcp-entry.ts` decision + rationale).

**Verification:**
- `build-all` green; full `test-all` green — **23 passed, 0 failed** with the new guard wired in.
- **Red-on-violation confirmed for four injected cases**, each caught, clean tree passing again after removal:
  - `core → fs` via relative path (invisible to the old guards)
  - `vscode → app` via relative path (invisible to the old guards)
  - `core → node-fs` (the ConfigRegistry class)
  - a new package with no `MATRIX` row (the coverage tooth)

All six dependency edges are now mechanically guarded instead of two — and the guard sees the import mechanism the packages actually use. The §1 prose stays the human mirror under the existing doc-sync contract; the `MATRIX` is canonical, and the test header says so.

Tree is uncommitted — say `commit` when you want it recorded (I'll append the reply first per the commit-last rule, as always).

## AI:

Committing the layer-imports guard work now: the new resolving guard test, the two subsumed guards' deletion, the `test-all.sh` rewire, and this thread's docs (idea status, design + patches, quick-ship plan/done record, this chat). The pre-existing `readme-positioning-overhaul` chat modification stays uncommitted — it predates this session and belongs to that thread's work, not this one.