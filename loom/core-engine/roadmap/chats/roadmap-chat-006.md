---
type: chat
id: ch_01KV8K2VRFTB0N1P9Y2Q7RW9SG
title: new-thread-fix
status: active
created: 2026-06-16
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 7
---
# new-thread-fix

## Rafa:

When a new `thread` is created from extension, no associated `thread.md` used by roadmap feature is created.

we have a CLI command `loom_create_thread` that shluld call app use case

For extension, I don`t know where tha chain is broken
vscode -> mcp client -> mcp server -> app

I did fast / small research, my feeling is that 
app use case was ommited and 
CLI command `loom_create_thread` do the job directly, if this is true, we broke the architecture contract




## AI:

I traced the whole chain `vscode → mcp client → mcp server → app`. Your instinct is right that the contract is broken — but the break is the **opposite** of what you guessed, and it's one layer higher.

**The MCP→app seam is intact.** `loom_create_thread` does *not* do the job itself. It correctly delegates:

- `packages/mcp/src/tools/createThread.ts` → calls `createThread(...)` from
- `packages/app/src/thread.ts` (the app use case) → writes `thread.md` via `saveDoc`.

So the CLI/MCP tool is clean and the app use case is present. No problem there.

**The real break: the extension never reaches MCP at all for thread creation.** `packages/vscode/src/commands/threadCreate.ts` does raw filesystem work and stops:

```ts
await fs.ensureDir(threadPath);                       // loom/{weave}/{thread}/
await fs.ensureDir(path.join(threadPath, 'chats'));   // chats/
await treeProvider.waitForRefresh();
```

That's it. It calls `fs.ensureDir` directly, never `getMCP(root).callTool('loom_create_thread', ...)`. So the directory appears, the tree shows the thread, but **no `thread.md` is ever written** — which is exactly the roadmap symptom you're seeing.

The chain isn't "broken" so much as **never invoked**: `vscode ─/─► mcp ─► app`. The extension bypasses its own MCP gate with raw fs, the same violation the `loom-mcp-gate` hook exists to prevent for me — but the hook only guards Claude Code sessions, not the extension's own code.

**Proof it's a per-command regression, not a missing capability:** the sibling command `chatNew.ts` does it correctly —

```ts
const result = await getMCP(root).callTool('loom_create_chat', toolArgs);
```

So the MCP client (`getMCP`) is wired up and working; `threadCreate.ts` (and `weaveCreate.ts`) just predate it / were never migrated to it. They're the last two raw-fs holdouts among the create commands.

**Root-cause fix (the clean path):** rewrite `threadCreate.ts` to mirror `chatNew.ts` — call `loom_create_thread` through `getMCP(root)`, drop the raw `fs.ensureDir`. The app use case already `ensureDir`s the thread folder *and* writes `thread.md`, so the manifest gets created the moment the thread does, and the architecture contract (`vscode → mcp → app`, every loom write through a tool) is restored.

Two design questions before I touch code:

1. **`weaveCreate.ts` is the same anti-pattern.** A weave has no manifest, so there's no missing-file symptom today — but it's the same contract violation. Fix both now (consistent + correct), or scope this strictly to the thread bug? I'd fix both.
2. **The `chats/` subdir.** The app `createThread` use case ensures the thread dir but *not* a `chats/` subdir (chats dirs are created lazily on first chat). `threadCreate.ts` currently pre-creates `chats/`. I'd drop that pre-creation and let it be lazy (matches how MCP-created threads behave), unless you want the empty `chats/` folder kept for the tree.

STOP — waiting for `go` (and your call on the two questions above).

## Rafa:

do, fix both and drop the chats dir

### Loom architecture

it is essential that the chain of layers is not broken again, for example by ensuring that: 
vscode -> mcp -> app 

allowing vscode -> fs is risky, maybe useful for some use cases, but dangerous for future features

what you think?

## AI:

You're right — it's systemic, not a one-off. I grepped every command for direct `fs` / `app` imports and got **8 files**. Here's the full audit, bucketed by severity. (Holding off on code — this changed from "fix a bug" to "close an architectural hole," and the clean fix needs new MCP tools that should be designed as a set.)

### The audit — `packages/vscode/src/commands/`

| Command | What it does to `loom/` | Routed how | Verdict |
|---|---|---|---|
| `threadCreate.ts` | `fs.ensureDir` thread folder | **raw fs** | ❌ violation — tool exists (`loom_create_thread`); no `thread.md` written (the bug) |
| `weaveCreate.ts` | `fs.ensureDir` weave folder | **raw fs** | ❌ violation — **no tool exists** (gap) |
| `deleteItem.ts` | `fs.remove` doc / thread / weave | **raw fs** | ❌ violation — **no `loom_delete` tool** (gap) |
| `archiveItem.ts` | `fs.move` → `.archive/` | **raw fs** | ❌ violation — `loom_archive` exists but is **doc-only**; folder (thread/weave) archival unsupported (gap) |
| `restoreItem.ts` | `fs.move` `.archive/` → back | **raw fs** | ❌ violation — **no `loom_restore` tool** (gap) |
| `validate.ts` | reads state | imports `@reslava-loom/app/dist/validate` **directly** | ❌ layer break — `vscode → app`, skips MCP entirely (a `validate-state` prompt already exists) |
| `addRequiresLoad.ts` | enumerates `loom/refs/*.md` to build a picker | reads via `fs`, **writes via `loom_update_doc`** | ⚠️ write is clean; the read reaches around MCP (should be a resource) |
| `claudeTerminal.ts` | writes a prompt tmpfile in `os.tmpdir()` | `fs` outside `loom/` | ✅ fine — not a loom write |

So: **5 commands mutate `loom/` (or import `app`) bypassing `vscode → mcp → app`**, and only **one** of them (`threadCreate`) has a ready tool. weave-create, delete, restore, and folder-archive are **missing MCP surface** — that's why these reached for `fs` in the first place. The hole isn't carelessness; it's that the tools were never built.

### Your architecture question — "what do you think about allowing `vscode → fs`?"

I fully agree it should be **banned, reads included**. Two reasons:

1. **The gate doesn't cover this.** The `loom-mcp-gate` hook only blocks *Claude Code sessions* from `Edit`/`Write` on `loom/**`. It has zero reach into the extension's own compiled code — nothing stops `deleteItem.ts` from calling `fs.remove`. So the extension is the one actor that can silently corrupt state (delete a doc without running reducers, archive a thread without updating the link index, create a thread with no manifest — exactly what bit us).
2. **`vscode → fs` re-couples the UI to the on-disk layout** that MCP exists to hide. The day there's a remote/multi-loom or DB-backed store (your "future features"), every raw-fs command breaks, while every MCP-routed command keeps working. Reads are less *destructive* than writes but carry the same coupling — `addRequiresLoad` knowing refs live in `loom/refs/*.md`, `validate` importing `app` — so the rule should be **zero `fs`, zero `app` imports in `packages/vscode`**, full stop.

**Enforce it mechanically, like you already do for CLAUDE.md sync.** Add a test (or ESLint `no-restricted-imports`) that fails the build if anything under `packages/vscode/src/` imports `fs`, `fs-extra`, or `@reslava-loom/app`. The only carve-out is `claudeTerminal.ts` writing to `os.tmpdir()` — and even that can use `node:fs` against tmp only, or be whitelisted by path. A guard turns "we skipped app again" from a thing you notice months later into a red build on the commit that does it. That's the same philosophy as the gate hook and `claude-md-sync.test.ts`, just pointed at the layer the hook can't see.

### Where this belongs

This *is* the `loom/vscode-extension/vscode-mcp-refactor/` thread — its stated purpose is "refactor the extension to call MCP instead of app." This audit is that thread's actual backlog. I'd home the work there and write a plan:

1. New app use-cases + MCP tools: `loom_create_weave`, `loom_delete`, `loom_restore`, and extend archive to folders (thread/weave).
2. Migrate the 5 commands to call them; drop the eager `chats/` dir.
3. Route `validate` through the `validate-state` MCP prompt/resource; turn the refs enumeration in `addRequiresLoad` into a resource.
4. Add the import-guard test.

### Decision for you (stop rule 3 — this is new API surface)

- **Scope now:** (a) just do `threadCreate` + `weaveCreate` immediately as you authorized (I'll add `loom_create_weave`), and plan the rest — or (b) treat the whole thing as one refactor and let me write the plan in `vscode-mcp-refactor` first?
- **New tools:** confirm you want `loom_create_weave`, `loom_delete`, `loom_restore`, and folder-aware archive added (vs. some other shape — e.g. a single `loom_move`/`loom_remove` pair).
- **Guard:** want the `no-restricted-imports` guard in this same effort?

My recommendation: **(b)** — write the plan in `vscode-mcp-refactor`, design the four tools together (they share the "operate on a doc *or* a thread/weave folder" shape), and land the guard last so it goes green exactly when the last `fs` import dies. Doing thread+weave piecemeal now means adding `loom_create_weave` in isolation and re-touching the same files twice.

STOP — waiting for your call on scope, tool shape, and the guard.

## AI:

⚠️ **Plan created but malformed — reporting before I touch it again (the "MCP failures are findings" rule).**

I called `loom_create_plan` for `vscode-mcp-refactor` with a goal + an 11-element structured `steps` array. The tool returned success and wrote `plans/vscode-mcp-refactor-plan-003.md`, but the doc is broken in two ways:

1. **Steps dropped.** Frontmatter is `steps: []` and the generated `## Steps` table is empty — none of the 11 steps persisted.
2. **Body pollution.** The literal tool-call payload leaked into the body: the Goal paragraph ends with a stray `</goal>` and is followed by the raw `<parameter name="steps">[ {...11 step objects...} ]` JSON as plain markdown text (lines 20–95 of the file).

**Likely cause:** the `steps` argument went over the wire as a single stringified JSON blob rather than a real array, so (a) the server's schema saw no valid `steps` array → `steps: []`, and (b) the unparsed payload bled into the `goal` string. It's plausibly a serialization issue on my side (how I encoded a very large `steps` value), but the leaked `<parameter …>` tag in persisted output is suspicious enough that it could also be a `loom_create_plan` input-handling bug worth a real look — exactly the kind of thing dogfooding should catch, so I don't want to paper over it.

**Recovery options:**
- **A — repair plan-003 in place:** `loom_update_doc` to restore a clean Goal body, then re-add the 11 steps via `loom_add_step` (regenerates the table). Keeps the plan number, no orphan. ~12 calls.
- **B — recreate as plan-004** with a corrected single call (steps as a true array), then archive the broken plan-003. One clean create, but leaves a dead doc in `.archive` and a number gap.
- **C — you look at `loom_create_plan` first** if you suspect a tool bug, since I'd otherwise be working around it blind.

There's a wrinkle for both A and B: deleting the bad doc cleanly is *itself* blocked by the gap this plan exists to fix — there's no `loom_delete`, so the only removal path is `loom_archive`. Mildly ironic confirmation of the problem.

My recommendation: **A** — repair in place so plan-003 stays canonical and nothing gets orphaned, and I'll note the suspected `loom_create_plan` serialization issue as a separate finding for the core-engine roadmap. But since this is a malformed-doc finding, I'm holding per the rule.

STOP — how do you want me to recover (A / B / C)?

## Rafa:

By looking the plan I can only guess a forgotten opening `<goal>`, a duplicated ending `</goal>`. it looks the problem is here:

```markdown
</goal>
<parameter name="steps">
```

maybe the best approach is: 
- I delete the plan
- You create it again carefully

agree? or prefer option A?

## AI:

Agreed — your approach beats option A. A clean delete + fresh create leaves no orphan and no number gap, and your hand-delete neatly sidesteps the missing `loom_delete` tool (no point repairing a doc that was never valid).

Your read of the artifact is right: the `</goal>` + `<parameter name="steps">` lines are the tool-call wire wrapper leaking into the persisted body. The fix on my side: pass `steps` as a genuine structured array argument (not a stringified JSON blob), and keep the `goal` a single clean paragraph so nothing bleeds. The 11-step content itself was sound — I'll re-send it intact.

Delete this file:

`loom/vscode-extension/vscode-mcp-refactor/plans/vscode-mcp-refactor-plan-003.md`

Reply `deleted` (or `go`) once it's gone and I'll recreate plan-003 carefully — then verify with `loom_list_plan_steps` before handing back.

STOP — waiting for `deleted`.

## AI:

**FINDING (logged for hardening) — `loom_create_plan` mangles a large structured `steps` payload.**

Symptom: a `loom_create_plan` call with a goal + 11-element `steps` array produced a malformed doc — `steps: []` in frontmatter (all steps dropped) and the literal tool-call wire wrapper (`</goal>` + `<parameter name="steps">[…]`) leaked verbatim into the body's Goal section, so the generated `## Steps` table was empty. The tool still returned `{id, filePath}` success, so nothing flagged the corruption.

Root cause (suspected): the `steps` argument arrived as a stringified JSON blob rather than a parsed array. The server neither (a) coerced/validated it into the `steps` schema (→ silent empty array) nor (b) rejected the call. A clean retry passing `steps` as a genuine array worked first try, which localizes it to input handling of large/string-encoded `steps`.

Hardening candidates for the core engine:
- **Validate, don't silently empty.** If `steps` is present but unparseable/instring form, coerce (JSON.parse a string) or hard-error — never persist `steps: []` from a non-empty input.
- **Reject body-leak.** The goal/body writer should never emit raw `<parameter …>`/`</goal>` markers; treat their presence as a serialization failure.
- **Post-write assertion.** After create, assert `frontmatter.steps.length === input.steps.length`; mismatch = throw, so a corrupt plan never returns success.

Repro is preserved in `vscode-mcp-refactor-chat-001.md`. This is separate from the vscode→fs work and belongs on the core-engine side.