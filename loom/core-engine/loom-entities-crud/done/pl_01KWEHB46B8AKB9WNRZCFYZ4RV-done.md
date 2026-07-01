---
type: done
id: pl_01KWEHB46B8AKB9WNRZCFYZ4RV-done
title: Done — Loom entities CRUD
status: done
created: 2026-07-01
version: 7
tags: []
parent_id: pl_01KWEHB46B8AKB9WNRZCFYZ4RV
requires_load: []
---
# Done — Loom entities CRUD

## Step 1 — Add a canonical doc-filename derivation module + per-thread ordinal allocator (gaps allowed, by created order) and unify ALL filename-derivation sites onto it — docPathInThread's fallback switch AND the per-type MCP create tools, which currently disagree — producing idea.md, design.md, plan-NNN.md, plan-NNN-done.md, chat-NNN.md; req/thread/reference unchanged.

Added the canonical filename module and routed the write + read sites onto it (transition strategy A: dual-read; new-scheme writes, legacy-tolerant reads).

**New module — `packages/core/src/docNaming.ts`** (pure logic, so core not fs — deviation from the plan's stated path, since core's own generators and fs both consume it):
- Writers: `planFileName(n)`→`plan-NNN.md`, `doneFileName(n)`→`plan-NNN-done.md`, `chatFileName(n)`→`chat-NNN.md`, `singletonFileName('idea'|'design'|…)`→`idea.md`/`design.md`; `nextOrdinal(files, 'plan'|'chat')` (max+1, gaps preserved, recognises legacy names via suffix-anchored regex).
- Dual-read recognisers: `isPlanFile`/`isDoneFile`/`isChatFile`/`isIdeaFile`/`isDesignFile`, plus `planOrdinalFromFile`/`chatOrdinalFromFile`. Exported from core index.

**Write sites rewired to new-scheme names:** `weaveIdea` (idea.md), `weaveDesign` (design.md), `weavePlan` (plan-NNN.md via nextOrdinal), `chatNew` (chat-NNN.md), `promoteToIdea/Design/Plan`, `closePlan` + `appendDone` (done → plan-NNN-done.md derived from the plan's filename ordinal; done doc *id* stays `{planId}-done`, only the filename humanises). fs `docPathInThread` fallback: idea/design → flat.

**Read sites made dual-read (canonical first, legacy second):** `loadThread` (idea/design lookup + constraint-warning filters via isIdeaFile/isDesignFile), `weaveDesign`/`req`/`parentDesignVersion`/`parentIdeaVersion` parent lookups, `backfillStalenessBaselines` (uses design `_path`). Plans/dones/chats already dual-read because `loadMdFiles` filters by frontmatter `type`, not filename.

**Verification:** `build-all` green; full `test-all` green. Fixed test expectations that asserted the legacy done filename to the new `plan-NNN-done.md` (`close-plan`, `append-done`, `workspace-workflow`); the seeded-legacy-done cases pass unchanged, proving dual-read works. The MCP integration test reads live-style state over this repo's still-legacy-named docs and passes — dual-read confirmed end-to-end.

Not done here (later steps): migratePlanSteps' `/-plan-\d+/` matcher still assumes a prefix (historical migration, effectively dead); weave-root loose-doc creation paths untouched (Step 3 retires them); `loom migrate-layout` (Step 2) not yet built.

## Step 2 — Add loom migrate-layout (its own CLI command, not folded into migrate-to-threads.ts): a one-pass, rename-only sweep of existing docs to the new scheme sharing the naming module, with --dry-run.

Added `loom migrate-layout` — a rename-only normaliser to the canonical flat scheme. **Not run on this repo** (deferred to a fresh session per plan); fixture-tested only.

- **`packages/app/src/migrateLayout.ts`** — walks `loom/{weave}/{thread}/`, plans renames: idea/design → flat singletons; `*-plan-NNN.md` → `plan-NNN.md`; done docs → `plan-NNN-done.md` (ordinal from the done's own name, else resolved via its `parent_id` → the plan's ordinal, using a planId→ordinal map built while scanning plans/); `*-chat-NNN.md` → `chat-NNN.md` (ordinal-less/bare names get a fresh ordinal via `nextOrdinal`). Rename-only (zero content rewrites), idempotent (canonical names are no-ops), collision-safe (never overwrites an existing target — skips with a reason). `--dry-run` returns the planned renames without moving anything.
- **`packages/cli/src/commands/migrateLayout.ts`** + registration in `packages/cli/src/index.ts` → `loom migrate-layout [--dry-run]`.
- **`tests/migrate-layout.test.ts`** (registered in `scripts/test-all.sh`): dry-run plans-but-doesn't-move; real run renames to canonical + preserves ULID identity + is idempotent on a second pass; both messy done variants (ULID-named via parent_id, plan-named via own ordinal) resolve; bare ordinal-less chat gets a fresh number; collision case leaves the legacy file and doesn't overwrite the pre-existing canonical target.

Verified: `build-all` green, `migrate-layout` test green, full `test-all` still green (run again at end of phase). Fixture frontmatter needed the full required field set for `loadDoc` to parse (that's how the parent_id→ordinal map is populated).

## Step 3 — Remove the dead weave-root document-creation code paths so every doc must live in a thread: strip the no-threadId branch from weaveIdea/weaveDesign/weavePlan and require a thread for weave-root chat creation.

Enforced the "every doc lives in a thread; a weave contains only threads" invariant for idea/design/plan.

- **weaveIdea / weaveDesign / weavePlan**: removed the weave-root creation branches; each now throws a clear error if no `threadId` is given ("Cannot create a {type} at weave root: every doc must live in a thread…").
- **CLI `loom weave idea`**: retired the `--loose` flag; `--thread` now defaults to a kebab-of-title, so a new idea starts a new thread (one-command UX preserved under the invariant). Updated `weaveIdeaCommand` + `index.ts`.
- **Tests updated** for the new behaviour: `create-with-body` (idea now needs a thread), `id-management` (dropped `--loose`; idea path is now `{thread}/idea.md`), MCP `integration` (`loom_create_idea` now passes a threadId). All green.

**Scope decisions (flagged for Rafa):**
1. **Chats deliberately NOT forced into threads.** The plan's step-3 wording said "require a thread for weave-root chat creation," but `vision-reference.md` explicitly says chats live "at any level — weave, thread, attached." Forcing chats into threads would contradict the north star, so I left weave-root (and root-level `loom/chats/`) chat creation intact. Idea/design/plan are the doc types the invariant governs.
2. **promoteToIdea/Design (weave-root `else` branches) left intact.** Promoting a *loose weave-root chat* into an idea/design still has a weave-root path; retiring it needs a "promote into which thread?" answer (more involved). Out of this step's scope — noted as a follow-up so the invariant is eventually total.

Verified: `build-all` green, full `test-all` green (18/18 MCP integration included).

## Step 4 — Add app use-cases renameWeave (rename weave folder), renameThread (rename thread folder slug; thread.md ULID and docs untouched), and moveThread (move a thread folder to another weave; th_ ULID and depends_on survive).

Added the weave/thread folder-CRUD app use-cases (fs behind app, so the extension never touches fs directly).

- **`renameWeave({ weaveId, newWeaveId })`** (weave.ts) — renames the `loom/{weave}` folder. Guards: valid ids, not a reserved loom/ entry (.archive/refs/chats), source exists, target free. Zero content rewrites (weave is a title-less fs container; all cross-refs are ULID).
- **`renameThread({ weaveId, threadId, newThreadId })`** (thread.ts) — renames the thread folder (slug). thread.md `th_` ULID + all docs untouched, so depends_on and backlinks survive. Also **flattens any legacy `{oldThreadId}-idea.md`/`-design.md` → idea.md/design.md** after the move, so the rename holds on an un-migrated repo (else loadThread(newThreadId) couldn't find a thread-prefixed singleton). No-op post-migration.
- **`moveThread({ fromWeaveId, threadId, toWeaveId })`** (thread.ts) — moves the thread folder to another weave; the `th_` ULID travels so depends_on survives. Refuses if the destination weave is missing or already has a thread with that id. threadId unchanged → no singleton flattening needed.

Build green; full test-all green. (Dedicated unit tests land in Step 9.)

## Step 5 — Add moveDoc(id, toWeaveId, toThreadId) that hard-refuses when the doc has a parent_id or children, or when the destination singleton slot (idea/design) is occupied; and renameDocFile(id, newSlug) guarded to type:reference.

Added the loose-fiber doc move + reference filename-slug rename.

- **`moveDoc({ id, toWeaveId, toThreadId })`** (moveDoc.ts) — moves a LOOSE FIBER (a doc with **no parent AND no children** — a graph position, not a location) to another thread. Uses `buildLinkIndex` for the children check (`index.children`). Hard-refuses (never auto-detaches) when the doc has a parent_id, has ≥1 child, or isn't a movable type (idea/design/chat). idea/design → the destination's flat singleton slot (refused if taken, dual-read legacy too); chat → destination `chats/chat-NNN.md` with a fresh ordinal. Destination thread must exist. Pure file relocation — ULID identity means zero content rewrite.
- **`renameDocFile({ id, newSlug })`** (renameDocFile.ts) — references only (the one type whose filename IS a human slug). Updates the on-disk `{slug}.md` AND the `slug` frontmatter field in lockstep; refuses non-reference docs (their filenames are machine-owned — use loom_rename for the title). ULID + backlinks untouched.

**Terminology cleanup (per Rafa's note):** reconciled code comments so "loose fiber" consistently means "a doc with no parent and no children," NOT a weave-root location. Fixed the conflating comments in weaveRepository.ts, promoteToIdea/Design.ts, and the loom_create_weave description. Flagged: the `weave.looseFibers` FIELD still encodes the old weave-root meaning across core/fs/vscode/app — renaming that field (e.g. → weaveRootDocs) is a broader cleanup deferred to the `Migration, clean legacy read` thread.

Build green; full test-all green (dedicated moveDoc guard tests in Step 9).

## Step 6 — Expose the new app use-cases as thin MCP tools: loom_rename_weave, loom_rename_thread, loom_move_thread, loom_move_doc, loom_rename_doc_file; register them so the auto-generated loom://catalog picks them up. loom_rename stays title-only.

Exposed the folder/doc CRUD use-cases as thin MCP tools and registered them so the auto-generated `loom://catalog` picks them up.

- New tool modules (each = toolDef + handle → the app use-case with fs deps): `renameWeave.ts` (`loom_rename_weave`), `renameThread.ts` (`loom_rename_thread`), `moveThread.ts` (`loom_move_thread`), `moveDoc.ts` (`loom_move_doc`), `renameDocFile.ts` (`loom_rename_doc_file`).
- Registered in `server.ts`: `loom_move_doc` + `loom_rename_doc_file` under group **doc**; `loom_rename_thread` + `loom_move_thread` under **thread**; `loom_rename_weave` under a new **weave** group. `loom_rename` stays title-only.
- Verified via a fresh `loom catalog` process: all five appear, correctly grouped (doc / thread / weave). MCP integration test still 18/18. build-all green.

Note: the session's live MCP server is stale until reconnected — these tools won't be callable in-session until Rafa reconnects (requested next).

## Step 7 — Fix the mis-wired rename: F2 renames doc title vs weave/thread folder by node kind; add a reference-only 'Rename file' action; add drag-and-drop (thread→weave = loom_move_thread, loose-fiber doc→thread = loom_move_doc with rejection message); make the destructive tree action archive-first with a separate confirmed delete; fix package.json when-clauses.

Extension wiring — the build-verifiable parts (built + typechecked clean; live behaviour needs a VS Code Reload Window).

**Done:**
- **Fixed the mis-wired rename (the confirmed bug #3).** `commands/rename.ts` `renameCommand` now DISPATCHES by node kind: weave node → `loom_rename_weave` (folder), thread node → `loom_rename_thread` (folder slug), doc node → `loom_rename` (title). No more "Document ID to rename" prompt on a weave/thread folder. Node kind read from `contextValue` (`weave` / `thread*`) + `weaveId`/`threadId`.
- **Reference file rename**: new `renameFileCommand` → `loom_rename_doc_file`; registered in `extension.ts`; `loom.renameFile` command + a `viewItem =~ /^reference/` context-menu entry in package.json.
- **F2 keybinding** → `loom.rename` (`when: focusedView == loom.threads`), so F2 renames title on a doc and folder on a weave/thread.
- **Archive-first delete**: `deleteItem.ts` modal now leads with "Archive instead" (recoverable → `loom_archive`) alongside "Delete permanently" (→ `loom_delete`).
- package.json: rename command title → "Rename (title / folder)"; new keybindings section.

**Deferred (carved out for the live-verification pass): drag-and-drop** (thread→weave = `loom_move_thread`, loose-fiber→thread = `loom_move_doc`). The current `RoadmapDragAndDropController` is tightly coupled to roadmap thread-reordering (priority via a dedicated MIME); adding tree moves means extending it, and DnD is only meaningfully testable live (Reload Window), not headless. Rather than ship unverifiable DnD that could regress the roadmap reorder, I'm leaving it for the live pass — the F2 + context-menu path already gives full move/rename coverage without DnD. Flagging for Rafa: do drag-and-drop in the live-test session, or split it into its own follow-up step/thread.

Verified: build-all green; `tsc -p ./ --noEmit` on the extension clean.

## Step 9 — Add tests for filename/ordinal derivation, migrate-layout --dry-run, and the moveDoc loose-fiber/slot guards; then run build-all and test-all and fix fallout.

Tests + build + live verification.

- **`tests/entities-crud.test.ts`** (registered in `scripts/test-all.sh`): docNaming writers/ordinals/recognisers (incl. dual-read legacy+new, gap-preserving nextOrdinal, done-excluded-from-plan check); renameWeave/renameThread (asserts legacy idea flattened + thread.md ULID untouched)/moveThread (+ missing-dest guard); moveDoc loose-fiber guards (refuses child-having, parent-having, occupied-slot; moves a loose idea and a chat with fresh ordinal); renameDocFile (reference slug + frontmatter lockstep, refuses non-reference). All green.
- migrate-layout test (Step 2) already in the suite.
- **Full `test-all` green; `build-all` green.**
- **Live smoke test through the reconnected MCP server:** `loom_move_doc` on the design (de_…, which has the plan as a child) correctly refused with "it has 1 child doc(s)… move the whole thread" — the new tool is wired and the guard fires end-to-end (no mutation on the refusal path).

Not covered by automated tests (needs a live VS Code Reload Window): the extension F2/menu/drag-drop UX from Step 7 — to be exercised in the live-verification session, along with the deferred drag-and-drop.
