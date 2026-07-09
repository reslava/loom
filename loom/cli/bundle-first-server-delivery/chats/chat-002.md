---
type: chat
id: ch_01KX2Z2J0VXZWFQ9QFKZMRXSM3
title: bundle-first-server-delivery mcp bug Chat 002
status: done
created: 2026-07-09
updated: 2026-07-09
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 19
---
# bundle-first-server-delivery mcp bug Chat 002

## Rafa:

This is .mcp.json in a new 1.21.1 loom project:
```json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@reslava/loom@1.21.1",
        "mcp"
      ],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

mcp connect 
but if i run `/mcp` in Claude CLI i got this warning msg:
```
MCP config diagnostics ⚠

  For help configuring MCP servers, see: https://code.claude.com/docs/en/mcp

  [Contains warnings] Project config (shared via .mcp.json)
  Location: J:\src\TESTS\test-loom-1.21.1\.mcp.json
[Warning] [loom] mcpServers.loom: Missing environment variables: workspaceFolder

   Manage MCP servers
   4 servers

     Project MCPs (J:\src\TESTS\test-loom-1.21.1\.mcp.json)
   ❯ loom · ✔ connected · 59 tools

     claude.ai
...     
```

### Testing Chord Flow

I just teste it in Chord Flow and I got this message from Claude CLI:
```
🔧 MCP: loom_record_release(version="0.13.0")

  Called loom, ran 1 shell command

The MCP server received ${workspaceFolder} literally unexpanded (this CLI session isn't the VS Code host that substitutes it), so it can't resolve paths. Falling back to the loom CLI, which is exactly what the runbook specifies (loom record-release X.Y.Z).
```

This was a note of you when finished:
>One note for next time: the loom record-release MCP tool failed because LOOM_ROOT in .mcp.json is the literal ${workspaceFolder} (only the VS Code host expands that) — the CLI fallback worked, but any loom_* MCP tool will hit the same wall from a plain CLI session until that env value is made concrete.

### Bug

Looks that "LOOM_ROOT" from current 1.21.1 .mcp.json files are not expanding:
```
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
```

## AI:

Confirmed and diagnosed. This is a real regression introduced by `3244bbf` (v1.21.1), and the fix belongs to this thread's Component 3 / `IN5` (`.mcp.json` upkeep for the standalone consumer).

## Root cause

`${workspaceFolder}` is a **VS Code editor variable**. Only a VS Code MCP *host* expands it. But per this thread's own design, `.mcp.json`'s **only real reader is a standalone terminal `claude`** (or Cursor/other agent) — the extension-*launched* agent never reads this file; it binds the bundled server via `--strict-mcp-config --mcp-config <temp>` with a **concrete** `LOOM_ROOT` (`bundledServer.ts:28` → `LOOM_ROOT: workspaceRoot`).

So the placeholder was written into the one file whose consumer cannot expand it. In a terminal session Claude Code recognizes the `${...}` syntax, can't resolve `workspaceFolder`, and:
1. warns `Missing environment variables: workspaceFolder` on `/mcp`, and
2. passes the **literal string** `${workspaceFolder}` through as `LOOM_ROOT`.

And the server's guard doesn't save us: all three entry points do `process.env['LOOM_ROOT'] ?? process.cwd()` (`mcp/src/index.ts:8`, `vscode/loom-mcp-entry.ts:17`, `cli/src/index.ts:310`). The `??` only fires when the var is **unset** — here it's *set to a bad value*, so the fallback never triggers and the server tries to resolve paths under a literal `${workspaceFolder}` dir. Exactly the Chord Flow `loom_record_release` failure.

**Why `3244bbf` "verified" it worked:** that check was a nested `claude -p` almost certainly launched from inside a VS-Code-hosted session, so it inherited a concrete root from its parent env — it never exercised a clean standalone terminal, which is the only thing that actually reads this file.

## The fix (two parts — recommended)

**A. Generator: stop writing `LOOM_ROOT` at all.** The server already defaults to `process.cwd()`, and for the terminal consumer cwd *is* the project root (that's where you run `claude`). So omitting the env is strictly better than either prior form:
- absolute path → works but not committable (one machine's path),
- `${workspaceFolder}` → committable but broken in the terminal,
- **omitted → committable *and* correct, nothing to expand, and the `/mcp` warning disappears.**

**B. Server robustness — a shared `resolveLoomRoot(env, cwd)`.** Replace the three duplicated `?? process.cwd()` sites with one resolver that treats **missing OR an unexpanded `${…}` value** as "use cwd." No legitimate absolute path contains `${`, so this is safe. This is the part that **rescues the already-shipped 1.21.1 projects** that have the bad value baked into their committed `.mcp.json` — non-force `loom_install` only heals the version pin, not `env`, so without server tolerance those repos stay broken until a `--force` reinstall.

## One decision for you

For existing 1.21.1 `.mcp.json` files already on disk, do we *also* strip the broken `LOOM_ROOT` during the activation-time (non-force) install — i.e. extend the reconcile alongside `healMcpPin` — or rely purely on **B** (server ignores the bad value, file stays cosmetically stale but harmless, `/mcp` warning persists until a regen)?
- **B only** is less code and self-heals behavior everywhere; the warning lingers for old installs.
- **B + env-heal** also clears the `/mcp` warning for old installs, at the cost of a second `.mcp.json`-touching reconcile branch.

I lean **B + env-heal** — it fully closes the user-visible symptom (the warning) for the projects already in the wild, and it's the same in-shape-only reconcile discipline `healMcpPin` already established.

## Also in scope (doc-sync)

The `LOOM_ROOT: "${workspaceFolder}"` block is documented in three synced surfaces that must change with the generator: the `LOOM_CLAUDE_MD` template (`installWorkspace.ts:102`), root `CLAUDE.md`, and `.loom/CLAUDE.md`. Two regression tests also currently *assert* the placeholder (`install-workspace.test.ts:146,191`) — they invert to assert no `LOOM_ROOT` (or a tolerated one).

Out of scope but worth a future note: none of this handles `claude` launched from a *subdirectory* (cwd ≠ root). The truly robust resolution is "walk up to find `.loom/`" — a clean follow-up, not this bug.

Give me the call on the one decision and I'll write the plan.

## AI:

Restoring the absolute path is a valid known-good — it's literally what Loom shipped and worked before `3244bbf`, and it's deterministic (works from any cwd, including a subdirectory launch, which the omit-and-use-cwd option does *not*). If reliability is the priority, it's the safe call.

But it re-opens the one problem `3244bbf` was created to fix, so let me name it before we commit:

**An absolute `LOOM_ROOT` is not committable.** It hard-codes one machine's path (`J:/src/loom` here). For any `.mcp.json` that gets **committed and shared** — which includes *this very repo* (we deliberately committed a portable `.mcp.json` so a fresh clone is functional) — a teammate or a fresh checkout on another machine gets the wrong root, and every `loom install` re-dirties the file with the local path. That regression is real and specific.

Two ways to have both safety *and* portability:

- **Option A — omit `LOOM_ROOT`, add the tolerant resolver (my earlier rec).** Portable + committable; each machine's server falls back to its own cwd = its own checkout root. Correct for the normal "launch `claude` from project root" case; the only gap is a *subdirectory* launch.
- **Option B — restore absolute `LOOM_ROOT` (your steer).** Bulletproof from any cwd; but not committable/portable, and the tolerant resolver can't rescue a *stale-but-plausible* absolute path from another machine (it only catches unset / `${…}`).

Either way I'd **still add the shared `resolveLoomRoot(env, cwd)`** that treats an unexpanded `${…}` as → cwd, because it's what rescues the ~already-shipped 1.21.1 installs carrying the broken placeholder, regardless of which option we pick for the generator.

My honest read: for the solo-local case they're equivalent and B is marginally safer; for the committed-repo case A is clearly better and B reintroduces a known bug. So I'd default to **A**, and only go **B** if you specifically want subdirectory-launch robustness and are fine with `.mcp.json` not being committable.

Which do you want for the generator — A (omit, portable) or B (absolute, bulletproof-from-any-cwd)? Then I'll write the plan.

## Rafa:

I like A + add the shared `resolveLoomRoot(env, cwd)`, only problem is user open CLI in a subdir.
I checked it here opening CLI in `tests/` and I got this:
```
New MCP server found in this project: loom

  MCP servers may execute code or access system resources.
  All tool calls require approval. Learn more in the MCP
  documentation.

  ❯ 1. Use this MCP server
    2. Use this and all future MCP servers in this project
    3. Continue without using this MCP server
```
i click 1, but loom mcp connection failed
Claude CLI shows root `tests`

## AI:

A it is — and the `tests/` failure you just hit is A's one gap, but it closes cleanly *inside* `resolveLoomRoot` itself. The fix: don't fall back to raw `cwd` — **walk up from cwd to the nearest ancestor that contains `.loom/`**, and use that as the root. A launch from `tests/` then resolves to the project root, not `tests/`.

So the resolver becomes:

```
resolveLoomRoot(env, cwd):
  1. LOOM_ROOT set AND not an unexpanded ${…}   → use it
  2. else nearest ancestor of cwd containing .loom/ → use it   ← closes the subdir gap
  3. else cwd                                    → last resort
```

This is strictly better than both earlier options:
- **Portable/committable** — no `LOOM_ROOT` in the file (A), so a fresh clone on any machine just works.
- **Subdir-robust** — the `.loom/` walk-up means it no longer matters *where* you launch `claude` from, which was the only reason to consider the absolute path (B). B is now unnecessary.
- **Self-healing for 1.21.1** — an existing file with the literal `${workspaceFolder}` hits rule 1's "unexpanded `${…}`" guard, falls through to the walk-up, and resolves correctly. No `--force` reinstall needed.

This is the "walk up to find `.loom/`" I flagged as a follow-up — turns out it's not a follow-up, it's the actual fix for your case, so it belongs in this plan.

Two notes on what you saw:
- The **"New MCP server found → Use this MCP server"** prompt is normal — the one-time per-project approval for a project-scoped server, unrelated to the bug.
- **"connection failed / root `tests`"** is the cwd-is-`tests` symptom; once the resolver walks up to find `.loom/`, root resolves to the project root and it connects. (If a connection error somehow persists *after* the root is correct, that's a separate thread — but I expect it's the same root cause.)

Plan shape:
1. `resolveLoomRoot(env, cwd)` (unset / `${…}` → walk up for `.loom/` → cwd) in a shared spot, called by all three entry points (`mcp/src/index.ts`, `vscode/loom-mcp-entry.ts`, `cli/src/index.ts`).
2. Generator: drop `LOOM_ROOT` from the written `.mcp.json` + the `migrateMcpCommandToNpx` default.
3. Doc-sync: the three CLAUDE surfaces (`installWorkspace.ts` template, root `CLAUDE.md`, `.loom/CLAUDE.md`) drop the `${workspaceFolder}` env line.
4. Tests: invert the two assertions that require the placeholder; add a `resolveLoomRoot` unit test (env set / `${…}` / subdir walk-up / bare cwd).

Want me to write it as a plan on this thread?

## Rafa:

Yes
If user .mcp.json has 
```
      ,
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
      }
```      
we should delete it in extension update, correct?

## AI:

Correct — delete it on extension update, with one guard: **only strip `LOOM_ROOT` when its value is the unexpanded placeholder** (`${workspaceFolder}`, or any `${…}`), never a concrete path a user set on purpose.

- `LOOM_ROOT: "${workspaceFolder}"` → **delete the key** (it's the broken value we shipped; the resolver already ignores it, so removing it just cleans the file and clears the `/mcp` "Missing environment variables" warning).
- `LOOM_ROOT: "/some/real/path"` → **leave it** (user intent; resolver rule 1 honours it).

This is an in-shape, **silent** heal — same discipline as `healMcpPin`: a within-shape repair, not a semantic change, so it runs as part of the non-force activation install (no consent prompt needed, unlike the `command:"loom"` migration). If deleting `LOOM_ROOT` leaves `env` empty, I'll drop the empty `env` object too for a clean file.

Writing the plan now with these 6 steps:
1. `resolveLoomRoot(env, cwd)` in `packages/fs` — set-and-not-`${…}` → use it; else walk up from cwd to nearest `.loom/`; else cwd.
2. Wire it into the 3 entry points (`mcp/src/index.ts`, `cli/src/index.ts`, `vscode/loom-mcp-entry.ts`), replacing `?? process.cwd()`.
3. Generator: drop `LOOM_ROOT` from the written `.mcp.json` + the `migrateMcpCommandToNpx` default.
4. In-shape env-heal: on non-force install, strip an unexpanded-`${…}` `LOOM_ROOT` (this is the "delete on update" you asked about).
5. Doc-sync: remove the env line from the 3 CLAUDE surfaces.
6. Tests: invert the two placeholder assertions, add env-heal + `resolveLoomRoot` unit tests.

One flag: the req has no item for LOOM_ROOT resolution (it predates this bug and is already stale vs design v6). I'll build the plan now; we should amend the req to add an item for "portable, subdir-robust LOOM_ROOT resolution" so scope stays honest — I'll do that as a follow-up unless you'd rather I fold it in first.

## Rafa:

Ammend req, ammed plan
I started plan
do whole plan
commit

## AI:

Agree — with a scoping refinement so it's helpful, not noisy.

Two distinct sub-cases when there's no explicit `LOOM_ROOT`:
- **Launched from a subdirectory, walk-up *found* `.loom/`** → it now works correctly (resolves to the project root). One short **info** line to **stderr** at boot is nice for transparency ("launched from a subdir, resolved root to …") — this is the note you're after.
- **Walk-up found *no* `.loom/` anywhere up the tree** → we fall back to cwd and `loom_*` will likely fail. This deserves a real **warning** ("no `.loom/` found from … upward; defaulting to cwd — run from the project root or set `LOOM_ROOT`").

Both go to **stderr only** — never stdout (that's the JSON-RPC channel for the stdio server). It's once per server boot, not per call, so no spam. When `LOOM_ROOT` is set explicitly (the extension-launched path always sets a concrete one), it's silent.

Clean shape so the fs util stays pure/testable: `resolveLoomRoot(env, cwd)` returns `{ root, source: 'env' | 'ancestor' | 'cwd-fallback' }`, plus a pure `loomRootNotice(source, root, cwd): string | null` that builds the stderr line. The three entry points do `const { root, source } = resolveLoomRoot(...); const n = loomRootNotice(...); if (n) console.error(n);`. No `console` inside the resolver.

Folding this in as a new plan step (7) and updating steps 1–2 + the tests to the `{ root, source }` shape. Continuing.

## Rafa:

This is loom itself repo:
We have CLAUDE.md now with 2 top header include files:
```
@.loom/CLAUDE.md
@CLAUDE-LOCAL.md
...
```
same as all loom workspaces

we gitignored both because here they are redundant, but we did not delete them
I think we should delete them in this project, having root CLAUDE and @.loom/CLAUDE.md in this project is redundant and dangerous, agree?
If so delete both not needed files before commit

## AI:

Strongly agree — and it's more than redundant, it's actively contradictory.

**Why redundant:** this repo's root `CLAUDE.md` *is* the full, self-contained **recursive** contract (tailored to building Loom, mentions `packages/`, active threads, etc.). Importing `@.loom/CLAUDE.md` loads the **generic** template — a second, overlapping copy of the same rule set — on top of it.

**Why dangerous (concrete, not hypothetical):** the two surfaces are *designed* to differ in wording and structure, and the machine sync only locks rule-marker parity, not the prose. The clearest collision is the **session-start protocol**: the recursive `CLAUDE.md` has an extra step 0 (load `loom/ctx.md`), so its catalog load is **step 3**; the generic template has no ctx step, so its catalog load is **step 2**. Loading both hands the AI two conflicting numbered start sequences. `CLAUDE-LOCAL.md` here is just an empty stub (`# Project-Local AI Rules`), so nothing is lost by dropping it.

**Doing now (before commit):**
1. Remove the `@.loom/CLAUDE.md` + `@CLAUDE-LOCAL.md` header lines from root `CLAUDE.md`.
2. Delete the two gitignored, untracked working files. (They won't appear in the commit — only the header removal will.)

**One real flag — this won't *stay* fixed on its own.** This very thread's design (`IN4`) has the extension run `loom_install` **silently on activation** for initialized workspaces. Once that ships, opening *this* repo in VS Code will re-patch the import header back into root `CLAUDE.md` and regenerate `.loom/CLAUDE.md`. So the durable fix is for `loom_install` to **detect a self-hosting / recursive Loom repo and skip the CLAUDE-patching + template write for it**. That's a separate change (belongs in the bundle-first thread or a small new one) — I'll note it, not fold it into plan-004. Want me to open a thread/step for that after this commit?

Continuing the LOOM_ROOT plan (doc-sync of the remaining user-facing docs + tests), doing these two deletions, then building/testing and committing.

## AI:

Done — plan-004 fully implemented, built, tested, and verified live. Summary:

**The fix (Option A + walk-up):**
- New shared `resolveLoomRoot(env, cwd)` in `packages/fs`: explicit `LOOM_ROOT` wins unless it's an unexpanded `${…}` placeholder → else walk up to the nearest `.loom/` → else cwd. One resolver, wired into all three server entry points (mcp / cli / vscode bundle). Added a guard so the global `~/.loom` **registry** never masquerades as a workspace root.
- Generator stops writing `LOOM_ROOT` entirely (portable + committable + subdir-robust).
- Silent in-shape `healMcpLoomRootEnv` strips a stale `${…}` `LOOM_ROOT` from existing `.mcp.json` on activation → self-heals already-shipped 1.21.1 files and clears the `/mcp` warning; concrete values untouched.
- `loomRootNotice` prints a one-line stderr info (subdir launch) / warning (no `.loom/`) — you asked for this.

**Verified live** (the actual 1.21.1 failure): bundled server spawned from `packages/cli` with `LOOM_ROOT=${workspaceFolder}` now prints `resolved workspace root to J:\src\loom` instead of choking on the literal. `build-all` clean, full `test-all` green (new `resolve-loom-root` + env-heal tests included).

**Doc-sync:** swept the placeholder out of root `CLAUDE.md`, `README.md`, both package READMEs, `CLI_USER_GUIDE.md`, and 3 refs.

**CLAUDE-file cleanup (your call):** deleted the redundant gitignored `.loom/CLAUDE.md` + `CLAUDE-LOCAL.md`; the root `CLAUDE.md` imports now no-op instead of layering the generic contract over the tailored recursive one.

**req/plan:** req amended to v2 (added `IN10`, `IN11`, `EX8`, `C9`) and re-locked; plan steps cite them.

**Still open (flagged earlier, NOT in this commit):** once `IN4` (silent install-on-activation) ships, opening this repo in VS Code will re-patch the root `CLAUDE.md` imports and regenerate `.loom/CLAUDE.md`. Deleting them now is only durable if `loom_install` learns to detect a self-hosting Loom repo and skip the CLAUDE-patch + template write. Want a follow-up thread/step for that?

Committing now.

## Rafa:

I packaged and installed vsix in a 1.21.1 project
do not delete
      ,
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
      }

I downloaded the version to 
      "args": [
        "-y",
        "@reslava/loom@1.20.0",
        "mcp"
      ],      

not updated version
not deleted "LOOM_ROOT": "${workspaceFolder}"

when this is tested and fixed 
we will do loom_quick_ship for detect a self-hosting Loom repo and skip the CLAUDE-patch + template write.

## AI:

Diagnosed. The heal logic is **correct end-to-end** — I reproduced it through the built CLI (same `installWorkspace` the bundled server runs) against your exact config:

```
BEFORE: "@reslava/loom@1.20.0" + "env": { "LOOM_ROOT": "${workspaceFolder}" }
AFTER : "@reslava/loom@1.21.1"  (env removed entirely)
```

Both healed: pin bumped, placeholder stripped. So this is **not** an app bug. The extension calls that same code via `ensureWorkspaceCurrent()` (`extension.ts:467`) → `loom_install {}` on activation. Two things are gating your test:

1. **Your vsix predates this fix.** The env-heal (`healMcpLoomRootEnv`) was only just committed (`db3aa26`). A vsix packaged before that has no env-strip at all — it would heal the *pin* but never touch `LOOM_ROOT`. You need to rebuild the vsix from current `main`.
2. **The activation install is once-per-session, and only at activation.** `ensureWorkspaceCurrent` is guarded by `workspaceRefreshedThisSession` and fires once via `setImmediate` at activate. If you *installed the vsix, then manually downgraded the pin and re-added the placeholder*, the one-shot refresh already ran **before** your edits — so it won't re-heal until the next fresh activation. Also note `.mcp.json` lives at the project **root**, and the extension's watchers are `**/.loom/**` and `**/loom/**/*.md` — neither watches `.mcp.json`, so a mid-session edit to it triggers no re-heal.

**So to see it work:** rebuild the vsix from current `main`, install it, then **Reload Window** (or reopen the project) *after* your manual `.mcp.json` edits. On that fresh activation the pin heals to the bundled version and the `${workspaceFolder}` env is stripped.

Can you confirm your test order — was the vsix built after `db3aa26`, and did you reload the window after downgrading the pin? If it's a fresh build + reload and it *still* doesn't heal, there's a deeper extension-trigger bug and I'll instrument the activation path directly.

**Design question this surfaces:** should the extension also **watch `.mcp.json`** and re-heal on drift (not just at activation)? It'd make drift self-correct mid-session (and make testing trivial), but it's a slightly wider behavior than the "heal on open" model we designed, and needs a small guard so it doesn't fight `workspaceRefreshedThisSession`. Your call — I'd lean yes (it closes a real gap), as a follow-up alongside the self-hosting-repo guard you want to quick-ship.

## Rafa:

I told you I already packaged vsix and installed it (line 298)
the problem was I forgot reload window, now worked

weekly limits 89%
if we can fold in loom_quick_ship for detect a self-hosting Loom repo
and do-release 1.21.2
do it
if not then do-release

## AI:

Good — reload was the only missing step; the heal itself is correct.

**Going with do-release only — deferring the self-hosting guard.** Reasoning:

- `loom_quick_ship` records *already-done* work. The self-hosting guard isn't written yet, so quick-shipping it would be a false record.
- More importantly, it needs a real **design decision I shouldn't rush under the weekly-limit crunch**: *what is the detection signal for "this is the Loom source repo"?* Get that wrong and `loom install` skips the CLAUDE-patch / template write for a **real user's** project — a worse bug than the redundant files it's trying to avoid. Candidate signals (a `@reslava-loom/*` workspace package, a sentinel marker, the presence of `packages/app/src/installWorkspace.ts`) each have false-positive/negative trade-offs worth one careful pass + tests. Not a 10-minute fold-in.

So the durable move is: **ship the LOOM_ROOT fix as 1.21.2 now** (it's complete, tested, and verified live), and treat the self-hosting guard as its own small thread next session when you're not against the limit. The deleted `.loom/CLAUDE.md` + `CLAUDE-LOCAL.md` stay gone until then; worst case a future activation-install re-creates the gitignored copies (harmless, uncommitted).

Starting the 1.21.2 release now.