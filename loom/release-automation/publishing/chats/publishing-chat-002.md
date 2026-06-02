---
type: chat
id: ch_01KT4F0224R6EN6CS5FR41ABHA
title: changelog rename Chat
status: active
created: "2026-06-02T00:00:00.000Z"
updated: 2026-06-02
version: 1
tags: []
parent_id: null
requires_load: []
---
# changelog rename Chat

## Rafa:

Both extension places changelog:
`https://marketplace.visualstudio.com/items/reslava.loom-vscode/changelog`
`https://open-vsx.org/extension/reslava/loom-vscode/changes`
only have info from version 0.5.0 to 0.6.5

We forgot to include and update extension 
`packages/vscode/CHANGELOG.md` 

Update it and include it in the pipeline to be reminded next release

### Bug found when trying to rename this chat doc
I got this error:

```
Failed to rename: MCP error -32603: Invalid frontmatter in j:\src\loom\loom\refs\CLAUDE-reference.md: Missing required field: type
```

Fix it

## AI:

Two separate problems here — one is a genuine bug in the rename code path, the other is a process gap in the release pipeline. Findings + proposed fixes below. No code changed yet (Chat Mode); waiting for your `go`.

---

### 1. The rename bug — root cause

The error is *not* about this chat doc. It's `app/src/rename.ts → updateAllReferences()` choking on `loom/refs/CLAUDE-reference.md`.

What happens: `rename` walks **every** markdown file under `loom/` (`findMarkdownFiles`) and calls `loadDoc(file)` on each, unguarded, to check whether it points at the doc being renamed:

```ts
for (const file of files) {
    const doc = await deps.loadDoc(file) as Document;   // ← throws here, aborts the whole rename
    ...
}
```

`loadDoc` throws `Invalid frontmatter … Missing required field: type` on `CLAUDE-reference.md` because that file has **no frontmatter** — it's the verbatim CLAUDE.md template (CLAUDE.md is a Claude Code contract, not a Loom doc, so it has no frontmatter by design). One throw kills the entire rename.

The tell is in the logs: `buildLinkIndex` hits the *same* files and survives —

```
[buildLinkIndex] Skipping …/CLAUDE-reference.md: Invalid frontmatter … Missing required field: type
[buildLinkIndex] Skipping …/CLAUDE-template-reference.md: …
[buildLinkIndex] Skipping …/loom-analysis-reference.md: Missing required field: status
```

`buildLinkIndex` wraps each `loadDoc` in `try/catch` and skips-and-warns (`linkRepository.ts:97`). `updateAllReferences` does **not** — same scan, no guard. So the link index is resilient and rename is brittle, against the identical file set.

**Root cause:** `updateAllReferences` lacks the skip-on-unparseable resilience that `buildLinkIndex` already established as the pattern. It's not specific to CLAUDE-reference.md — any frontmatter-light doc under `loom/` (3 of them today) breaks every rename.

**Clean fix (root cause, not symptom):** mirror `buildLinkIndex` — wrap the per-file `loadDoc` in `try/catch`, skip + `console.warn` on failure. Safe because `updateAllReferences` only ever rewrites `parent_id` and plan-step `blockedBy`; an unparseable reference doc can hold neither, so skipping it loses nothing.

```ts
for (const file of files) {
    let doc: Document;
    try {
        doc = await deps.loadDoc(file) as Document;
    } catch (e) {
        console.warn(`[rename] Skipping ${file}: ${(e as Error).message}`);
        continue;
    }
    ...
}
```

What I would **not** do: add fake frontmatter to `CLAUDE-reference.md` / `CLAUDE-template-reference.md`. Those are copied verbatim into the real CLAUDE.md, which must stay frontmatter-free — patching the data to satisfy a brittle scan is the wrong direction. (`loom-analysis-reference.md` missing `status` is a separate, real frontmatter gap we could fix independently, but it shouldn't be load-bearing for rename either.)

One thing to flag: per the [[feedback_mcp_server_stale_after_build]] note, the running `loom mcp` won't pick this up until the MCP server restarts — a `build-all` alone won't fix the live rename in this session.

---

### 2. `packages/vscode/CHANGELOG.md` — the gap + why

The extension is at **0.8.0**; the changelog's top entry is **0.6.5**. Two missing versions: **0.7.0** and **0.8.0**.

**Why it drifted:** `RELEASING.md`'s pre-tag checklist reminds you to update the **root** `CHANGELOG.md` (which `bump-version.sh` rolls and the `release` job machine-checks), but it never mentions `packages/vscode/CHANGELOG.md` — the *extension-specific* changelog that Marketplace and Open VSX display. Nothing in the pipeline touches or verifies it, so it silently fell behind.

**Backfill content** (from git history between the tags):

- **0.7.0** — real extension-facing changes:
  - Unified context pipeline (Phase 1) — one assembled context bundle per doc/thread
  - Weave-level ctx auto-load activated; thread ctx dropped
  - Three ctx generators consolidated into one (`loom_refresh_ctx`)
  - Context sidebar fix
  - Plan-table truncation fix
  - Refreshed user guides / READMEs

- **0.8.0** — I checked `git diff v0.7.0..v0.8.0 -- packages/vscode`: the **only** change is `package.json` (version bump in monorepo lockstep + the `repository` field for npm OIDC provenance). **No functional extension changes.** Honest entry: synchronized version bump with the CLI / release-automation work; added `repository` packaging metadata. We could also legitimately fold 0.8.0 into a single "0.7.0 / 0.8.0" note, but a thin standalone 0.8.0 entry keeps it aligned 1:1 with the tag.

---

### 3. "Include it in the pipeline to be reminded next release" — needs your call

Two ways to wire the reminder, and this is the one design decision here:

- **Option A — checklist line (trust-based).** Add to the `RELEASING.md` pre-tag checklist: *"Update `packages/vscode/CHANGELOG.md` with the extension's user-facing changes for this version."* Cheap, zero CI, but it's the same trust mechanism that already failed us once.

- **Option B — machine-checked guard (durable).** Mirror what the `release` job already does for the root CHANGELOG: assert `packages/vscode/CHANGELOG.md` has a `## [X.Y.Z]` section matching the tag, and fail the release if it doesn't. Can't silently drift again.

My lean: **B** (plus the checklist line for human guidance). Drift already bit us; the correct-path move is to make the reminder enforced, not advisory — the root CHANGELOG is already guarded, so this just closes the asymmetry. Cost is a few lines in `release.yml` (or the guard job), and it does nudge the spine's `release.yml` again, so flagging that boundary.

---

**Proposed sequence once you pick A or B:**
1. `app/src/rename.ts` — add the try/catch-skip resilience. (code, not a loom doc)
2. `packages/vscode/CHANGELOG.md` — backfill 0.7.0 + 0.8.0.
3. `RELEASING.md` (+ `release.yml` if Option B) — add the extension-changelog reminder/guard.

All three are in `packages/`/root (not `loom/**`), so they're normal edits — no MCP gate. Which option for #3, and do you want all three in one pass or stepwise?

## Rafa:

I pick B
Ensure same machine-checked guard for main `CHANGELOG.md`

Do 1,2,3

## AI:

Done — all three, Option B, plus the root-CHANGELOG guard moved up-front. `build-all.sh` green.

**1. Rename resilience — `packages/app/src/rename.ts`**
`updateAllReferences` now wraps the per-file `loadDoc` in try/catch and skips-and-warns on unparseable docs (mirrors `buildLinkIndex`). A frontmatter-light ref doc can't hold a `parent_id` or plan `blockedBy`, so skipping it changes nothing — it just stops one bad file from aborting the whole rename.

**2. Extension changelog — `packages/vscode/CHANGELOG.md`**
Backfilled the two missing versions:
- **0.7.0** (2026-06-01) — unified context pipeline, Loom user guides; weave ctx auto-load + thread ctx dropped, ctx generators consolidated into `loom_refresh_ctx`; context-sidebar + plan-table-truncation fixes.
- **0.8.0** (2026-06-02) — synchronized lockstep bump + `repository` manifest field for OIDC provenance; explicitly noted **no functional extension changes** (verified via `git diff v0.7.0..v0.8.0 -- packages/vscode` = `package.json` only).

**3. Machine-checked guard (Option B) — `.github/workflows/release.yml` + `RELEASING.md`**
While wiring it I found the root `CHANGELOG.md` was only checked in the **`release` job — which runs *after* all three publishes**. So a missing section would fail the GitHub release but the immutable npm version was already burned. That's the wrong place for a guard.

Fix: I put the existence check for **both** `CHANGELOG.md` and `packages/vscode/CHANGELOG.md` in the **`guard` job** — it runs first, before `build-test` and any publish, and on dry-runs too. Same index-based awk matcher the release job already uses. Now a missing changelog section fails *before* anything ships, for both files. The release job's own extraction of the root section (for the release-notes body) stays as-is — now belt-and-suspenders.
`RELEASING.md`: added the extension-changelog checklist item (noting it's hand-written, *not* rolled by `bump-version.sh`, and required even for a no-change release) and corrected the "machine-checked" note from `release` job → `guard` job.

---

⚠️ **One caveat:** per the stale-MCP-after-build behaviour, the running `loom mcp` in *this* session still has the old `rename.ts`. So renaming this chat will keep failing until you restart the session/MCP — the fix is in the built `dist`, just not in the live server process. Nothing else to do; it'll work on next start.

Files touched (all `packages/`/root — no MCP gate):
- `packages/app/src/rename.ts`
- `packages/vscode/CHANGELOG.md`
- `.github/workflows/release.yml`
- `RELEASING.md`

Next: waiting for direction — want me to commit these to `main`?

## AI:

You're right, and this is a deeper bug than the resilience one. I've held the commit — nothing pushed. Here's the root cause.

### The real bug: rename regenerates the permanent ID from the title

`rename.ts` calls `generatePermanentId(newTitle, doc.type, allIds)` and overwrites `doc.id` with it. But `generatePermanentId` is the **legacy slug-based** id scheme (`idUtils.ts` literally files it under "Slug-based / legacy identity"). The current canonical scheme is **ULID** (`generateDocId` → `ch_…`, `id_…`, `de_…`, …). So rename takes your permanent ULID `ch_01KT4F0224R6EN6CS5FR41ABHA` and replaces it with a title-derived slug.

That produces both symptoms you saw:
1. **ID changed** — `ch_<ULID>` → `changelog-rename-chat-chat` (should never happen).
2. **Double `-chat-chat`** — your title already ends in "Chat", so `toKebabCaseId("changelog rename Chat")` = `changelog-rename-chat`, then `generatePermanentId` appends the type suffix `-chat` → `changelog-rename-chat-chat`.

### Why deriving the id from the title is architecturally wrong

The whole point of the ULID identity is that it's **permanent and content-independent**. Backlinks (`parent_id`, `requires_load`, plan `blockedBy`) all reference the id. If rename re-derives the id from a *mutable* title:
- it breaks the permanence contract (a doc's identity shouldn't change because you renamed it),
- it forces the fragile `updateAllReferences` backlink-rewrite pass — which is the exact code that crashed on `CLAUDE-reference.md` earlier. The resilience patch I added treats a symptom of this same wrong design.

### The id vs filename vs title model (for grounding)

These three are **decoupled** in Loom:
- **`id`** (frontmatter) = permanent ULID `ch_…`. Never changes.
- **filename** = stable human slug — `publishing-chat-002.md` (from `generateChatId` = `{weave}-chat-{NNN}`), `publishing-idea.md`, etc.
- **`title`** (frontmatter) = the display name the **tree view actually shows** (the "chat custom names" feature).

So a rename that wants to change the human-facing name only needs to touch **`title`** (+ the body `# H1`, for the single-source-of-truth sync). The tree reflects it immediately. The id and filename never need to move.

### Correct fix

**rename = update `title` + body H1 only. Leave the ULID `id` and the filename untouched.** That deletes the id-regeneration *and* makes `updateAllReferences` dead code — which removes the backlink-rewrite pass entirely, so the `CLAUDE-reference.md` crash can't happen at all (my resilience patch becomes unnecessary and I'll drop it).

One genuine sub-decision — **what happens to the filename on rename:**
- **Option A (recommend): filename stays stable** (`publishing-chat-002.md`). The tree shows `title`, so the rename is fully visible without moving the file or touching any backlink. Cleanest, zero file IO, zero reference risk.
- **Option B: filename re-slugs from the new title** (keeping the ULID id). Still safe (backlinks reference the id, not the path), but it moves the file and offers no UI benefit since the tree already shows `title`. More IO for cosmetics.

I lean hard to **A**.

### Repairing the already-mangled doc

This chat currently has `id: changelog-rename-chat-chat` and filename `changelog-rename-chat-chat.md`. To restore it cleanly (under Option A) I'd set the id back to `ch_01KT4F0224R6EN6CS5FR41ABHA`, restore the filename to `publishing-chat-002.md`, and keep whatever title you want. (I can't do that through the live MCP rename — it's the buggy code — so it'd be a careful manual repair once we agree the target.)

### Commit status

Held. The other three changes (release.yml dual-changelog guard, vscode CHANGELOG backfill, RELEASING.md) are independent and correct — happy to commit those now. The `rename.ts` change should become the real fix above, not the resilience patch.

**Questions for you:**
1. Filename on rename — **A** (stay stable, my rec) or **B** (re-slug)?
2. Want me to also sync the body `# H1` to the new title on rename (matches the create/refine single-source-of-truth behaviour)?
3. Commit the release/changelog trio now, or bundle everything after the rename fix lands?

STOP — waiting on your call.

## Rafa:

1. A
2. Yes frontmatter Title and # H1 should be synced on rename
3. do fix first

is there other use case when we can find old slug similar problem?
if not commit, push to main

## AI:

Rename is fixed and the audit answer is **yes — the same bug exists in two more places.** So per your "if not, commit" condition: not yet — here's what I found.

### Rename — fixed (build + full test suite green)

`rename` now changes the **title + body H1 only**; the ULID `id` and the filename are untouched, so there are zero backlinks to rewrite (and the `updateAllReferences`/`CLAUDE-reference.md` crash path is gone entirely — my earlier resilience patch was deleted as unnecessary).

Files:
- `packages/app/src/rename.ts` — rewritten: title + `syncBodyH1`, id/filename stable; `updateAllReferences` deleted; deps trimmed to `{loadDoc, saveDoc, getActiveLoomRoot, findDocumentById}`.
- `packages/mcp/src/tools/rename.ts` — description + arg help corrected ("id is NOT changed"); dropped the now-unused deps.
- `packages/cli/src/commands/rename.ts` + `packages/vscode/src/commands/rename.ts` — output/message updated for the new `{id, title}` return.
- `tests/id-management.test.ts` — rename assertions rewritten to verify id/filename/backlink stability + H1 sync.

### Audit: same "stable ULID → title-slug" bug class, 2 more sites

**1. `app/src/finalize.ts`** — `generatePermanentId(doc.title, doc.type)` → assigned to `id`. The test output proves it: a draft idea is created as `id_01KT4HG3PX…` (ULID) and `loom finalize` rewrites its identity to the slug `temporary-test-idea`. Same defect: it destroys a perfectly good permanent ULID and replaces it with a title-derived slug (and would hit the same `-idea-idea` double-suffix if a title ended in "Idea"). **Correct fix:** finalize should keep the ULID `id`, flip `status` to active, and use the slug **only for the filename** — exactly how `weaveDesign` already does it for loose designs (`id = generateDocId('design')`, `filename = slug`).

**2. `app/src/weaveDesign.ts → finalizeIdea` (line ~83)** — same slug-id replacement, **plus** a second smell: it guards on `idea.id.startsWith('new-')`, but ideas now get ULID ids (`id_…`), never `new-…`, so that auto-finalize branch is effectively dead. Worth fixing in the same pass.

**Not a bug:** `weaveDesign.ts` line ~167 uses `generatePermanentId` for a variable literally named `filename` — that's the legitimate slug-for-filename use, id is a separate ULID. Leave it.

### The mangled chat doc (this file)

It still carries the damage: `id: changelog-rename-chat-chat` (should be `ch_01KT4F0224R6EN6CS5FR41ABHA`) and filename `changelog-rename-chat-chat.md` (should be `publishing-chat-002.md`). No MCP tool repairs a corrupted id, and the `loom-mcp-gate` hook blocks a direct `Edit`/`Write` on `loom/**`. So this repair needs either you to `/hooks`-disable the gate for one edit, or your ok to do the id-restore + file-rename as a deliberate one-off data fix.

### Decisions I need

1. **Fix `finalize.ts` + `finalizeIdea` now** (same ULID-keeping fix, ~same size as rename), or scope them to a separate thread? They're real but lower-blast-radius (the MCP create path doesn't go through finalize; mainly the CLI `weave idea` flow).
2. **Repair this chat doc** — disable the gate for one edit, or approve the manual id/filename restore?
3. **Commit timing** — commit the rename fix (+ the release/changelog trio still staged from before) now, or hold until finalize + the doc repair are settled so it's one clean commit?

STOP — waiting on 1/2/3.

## Rafa:

1. do fixes
2. I restored ID and filename already

then commit