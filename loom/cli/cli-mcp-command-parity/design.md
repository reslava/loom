---
type: design
id: de_01KX6WEBR2XERVZD8M7NXS4FSG
title: CLI ⇄ MCP command parity + retire pre-ULID commands
status: done
created: 2026-07-10
version: 1
idea_version: 1
tags: []
parent_id: id_01KX6HR9V2HKBWF1YF2TMMKCD0
requires_load: []
---
# CLI ⇄ MCP command parity + retire pre-ULID commands

## Context

Scope settled in `cli/cli-mcp-command-parity/chat-001`. Decisions carried in:

- **Keep the `draft` state** — it's a human *review gate* ("AI generated this, not yet approved"), **not** the obsolete pre-ULID "generate a permanent ID" mechanism. Kill the framing, keep the state.
- **Retire `loom_finalize_doc` + CLI `finalize`** — redundant with generic status-setting.
- **One generic, guarded status verb, mirrored across all three surfaces.**
- **Establish a tri-surface command-parity contract** in CLAUDE.md.
- **Availability motivation:** `docs/WAYS-TO-USE-LOOM.md` sells four ways to run Loom; a parity sweep must guarantee each advertised way is *fully* served on its surface — e.g. a **② Power terminal / ③ Pure agent** user must have every CLI command they need to run the loop from the terminal.

## 1. Status model — label vs guarded

Two kinds of status change, and the bug today is that they're conflated:

| Doc type | Transition | Owner | Guard / side-effect |
|----------|-----------|-------|---------------------|
| idea / design / reference | `draft ↔ active ↔ done` | **`loom_set_status`** | none — free label (tree signal + review gate) |
| plan | `draft ↔ active` | **`loom_set_status`** | allowed (free) |
| plan | `active → implementing` | `loom_start_plan` | plan must be active |
| plan | `implementing → done` | `loom_close_plan` | all steps ✅; writes the done record |
| req | `draft → locked` | `loom_finalize_req` | locks the scope anchor |

**Principle:** `loom_set_status` owns the *free label* transitions. Any transition that has a dedicated **guarded** tool is **refused** by `set_status`, with an error that names the correct tool. "Done" for a plan is *earned* by its steps, never *set*.

## 2. `loom_set_status` — new, dedicated, guarded

- **MCP:** `loom_set_status({ doc_ulid, status })` — ULID-strict, per the write-tool convention.
- **CLI:** `loom set-status <slug> <status>` — resolves the human slug/path → ULID at the CLI edge (slug/human-first).
- **Behavior:** validate `(docType, targetStatus)` against the table above; perform free label sets; **refuse** guarded transitions with a message pointing to `loom_start_plan` / `loom_close_plan` / `loom_finalize_req`.
- It becomes the **single** status path (see §3).

## 3. Remove `status` from `loom_update_doc`

`loom_update_doc` reverts to its real job: **body + `requires_load` only.** Rationale — mixing status into `update_doc` is the original sin that spawned the `finalize` duplicate, and it created a **latent bug**: `loom_update_doc({status:'done'})` sets *any* status on *any* doc, so right-clicking a **plan → Mark Done** today flips it to `done` with **no `close_plan`** — no done-record, no pending-step check (a "buttons must do real work / false-step-4" violation).

- **Caller audit (implementation step):** grep `loom_update_doc` usages that pass `status` and move them to `loom_set_status`. Known: extension `markStatus.ts`. Confirm no app/AI callers rely on `update_doc` for status.

## 4. Retire `finalize`

- Delete `loom_finalize_doc` (MCP), `finalize` (CLI + `finalize.ts`), and the extension `loom.finalize` command/menu.
- **`Finalize Req` stays** — `loom_finalize_req` is a *different* operation (scope lock), not status labeling.
- Purge stale help text: no "generate its permanent ID", no `<draft>`-by-**ID** — slug-addressed throughout.

## 5. CLI parity gaps (serve the advertised ways)

- **Add a create-chat CLI command** (mirror `loom_create_chat`) — the missing twin that lets a Power-terminal user *start* the chat loop from the terminal. Proposed name `loom chat new` (or `loom create-chat` for literal MCP mirroring — decide in §Naming).
- **Availability audit:** walk the four ways in `WAYS-TO-USE-LOOM.md` and confirm each has the CLI/MCP commands it needs; file any other gaps found. This audit is the concrete enforcement of the parity contract (§7).

## 6. Extension

- Menu labels mirror the command: **`Set Status: Done` / `Set Status: Active`** → `loom_set_status`.
- Command ids `loom.setStatusDone` / `loom.setStatusActive` (replacing `loom.markDone` / `loom.markActive`).
- Remove the separate `Finalize` menu item + `loom.finalize`.

## 7. Tri-surface command-parity contract → CLAUDE.md

Add as a hard rule, sibling to the existing `API naming` and `API-refactor scope` rules:

> **Tri-surface command parity (hard).** A capability is exposed on every surface its consumer needs, with **names mirrored** across CLI ⇄ MCP ⇄ extension. Touching a command on one surface obliges you to consider and mirror it on the others in the same change: CLI `foo-bar` ⇄ MCP `loom_foo_bar` ⇄ extension "Foo Bar". Exceptions are **by consumer, not whim**: (a) form differences — CLI slug/human-first vs MCP ULID-strict; (b) genuinely single-audience commands stay single-surface — agent-only workflow tools (`loom_do_step`, `loom_read_chat_tail`) need no CLI/menu twin; setup like `loom install` needs no MCP twin. **Availability clause:** every way advertised in `docs/WAYS-TO-USE-LOOM.md` must be fully runnable on its surface — a parity sweep verifies the advertised ways still hold.

- **Repo-specific authoring rule** — lives in `CLAUDE.md` only, **no `rule:` marker**, not mirrored into the downstream `LOOM_CLAUDE_MD` template (downstream users don't author Loom's own CLI/MCP).

## Naming

- `loom_set_status` ⇄ `loom set-status <slug> <status>` ⇄ extension `Set Status: Done/Active`. **Not** `loom status set` — collides with `loom status` (project overview).
- Create-chat: `loom chat new` reads more naturally than `loom create-chat`; but literal MCP mirroring favors `loom create-chat`. **Decision point** — lean `loom chat new` (human-first ergonomics; the parity rule allows form differences).

## Success criteria

- One guarded status path (`loom_set_status`); `loom_update_doc` no longer accepts `status`.
- `finalize` gone from MCP + CLI + extension; zero "permanent ID" wording; all status ops slug/ULID-addressed correctly per surface.
- A plan can no longer be marked `done` bypassing `loom_close_plan`.
- Create-chat command exists; the four-ways availability audit passes.
- Tri-surface parity contract written into CLAUDE.md.
- README command tables + `WAYS-TO-USE-LOOM.md` + `CLI_USER_GUIDE.md` updated (Mark Done / Finalize → Set Status).

## Blast radius (one change — API-refactor scope rule)

MCP tools (add `set_status`, remove `finalize_doc`, trim `update_doc`) · CLI (add `set-status` + create-chat, remove `finalize`) · extension (`markStatus.ts` rename → `set_status`, remove finalize command + menu) · docs (README tables, WAYS-TO-USE, CLI guide) · CLAUDE.md (parity rule). No half-migration.

## Non-goals

- Not a full CLI redesign — targeted parity + de-stale.
- Not altering the guarded plan/req tools' behavior (only making `set_status` delegate to them).
- `draft` state stays.

## Open items to confirm during planning/implementation

- Exact `loom_update_doc` status-caller list (grep audit).
- Confirm idea/design legitimately reach `done` (they do — Rafa marks them done), so the free-label set includes `done`.
- Extension: two flat menu items vs one `Set Status` with a quick-pick.
