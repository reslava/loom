---
type: chat
id: ch_01KX7RPV16X8WFEGWXCVWV2YR9
title: cli-management-command-parity Chat 001
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 12
---
# cli-management-command-parity Chat 001

## Rafa:

read idea

notes:
- MCP `loom_rename_reference_file` (filename) tool has a correct name, agree?
- Extension AI-launch buttons should say `create` instead of `weave` for create commands, agree?

Is it all grounded?

## AI:

Read the idea. Grounded on both counts — but with one correction to the idea's own premise. I checked the actual CLI and extension source, not just the idea's table.

**Note 1 — `loom_rename_reference_file` is correctly named. Agree.**

`rename` = change the *name* (the filename slug). It's consistent with its siblings `loom_rename_thread` and `loom_rename_weave`, which also rename folders/slugs. So the MCP side is right and self-consistent.

The mismatch is entirely on the **CLI**: `loom rename <doc> <new-title>` calls the app's `rename` use-case, which changes the **title** and leaves the id/filename untouched (`packages/cli/src/commands/rename.ts` → maps to MCP `loom_retitle`). So the CLI is using the verb "rename" for what MCP calls *retitle*, while MCP reserves "rename" for filename/folder ops. That's the collision.

Fix direction (per tri-surface parity — verbs must *match* across surfaces):
- CLI `retitle <doc> <new-title>` → `loom_retitle` (title change)
- reserve `rename*` on the CLI for filename/folder ops, mirroring `loom_rename_reference_file` / `loom_rename_thread` / `loom_rename_weave`

**Note 2 — buttons should say `create`, not `weave`. Agree — but the idea's reasoning is wrong and needs fixing.**

The idea says `loom.weaveIdea/weaveDesign/weavePlan` *"generate (AI) a doc, which is semantically distinct from create (empty doc)"* and frames the choice as "become `generate*` (clearer)". That premise is **not grounded**. I read all three command handlers:

- `weaveIdea.ts` → calls `loom_create_idea` (title only, no content)
- `weaveDesign.ts` → calls `loom_create_design` (title only, no content)
- `weavePlan.ts` → calls `loom_create_plan` (title + optional goal, no steps)

None of them launch an agent or call `loom_generate_*` / sampling. They create **empty docs**. So they are already semantically `create`, not `generate`. The right rename is simply `weaveIdea → createIdea`, `weaveDesign → createDesign`, `weavePlan → createPlan` — matching the CLI `loom create <type>` namespace and the `loom_create_*` tools. There is no `generate` question to decide here; the idea invented one from a false premise.

(Note `loom.weaveCreate` — the "New Weave" button — calls `loom_create_weave`. Verb is right, order is reversed vs the others; worth normalizing to `createWeave` in the same pass for consistency.)

**So, is it all grounded?** The gap table is accurate — I confirmed the CLI today has only `rename`, `start-plan`, `complete-step` and none of archive/delete/restore/rename-thread/move-thread/set-priority/set-thread-deps/promote/close-plan/quick-ship. The only ungrounded claim is the "generate (AI)" framing of the extension buttons under *Naming mismatches*, which should be rewritten to say they're empty-doc creates mis-verbed as `weave`.

Want me to patch that paragraph in the idea so it stops arguing from the false premise before we move to a design/plan?

## Rafa:

Yes, patch that paragraph in the idea and normalizing `loom.weaveCreate` to `createWeave`

### Review my ideas/concepts and correct me if I am wrong

I have too many concepts in my mind I need you to help me to settle down, refresh becuase I forgot some. Sorry for the mess, we need to sort this

For creating new loom docs entities and weaves, we have the next MCP tools groups by verb, they should be mirror in CLI, MCP, extension:
- create new empty loom docs, weaves, threads -> create (no AI). We have `loom_create_chat`, `loom_create_design`, `loom_create_idea`,`loom_create_plan`, `loom_create_reference`, `loom_create_req`, `loom_create_weave` and `loom_create_thread` 8 mcp tools commands
- promote current thread context to a new doc type -> promote. We have only 1 command for idea, design, or plan. They live in app layer.
- generate sampling fallback -> generate. We have `loom_generate_chat_reply`, `loom_generate_design`, `loom_generate_idea`, `loom_generate_plan`, `loom_generate_reference`, `loom_generate_req` 6 mcp tools that actually use AI sampling, they are not sampling fallback, I think in loom catalog, the group description is wrong: `### Generate (sampling fallback)`, should be `### Generate (AI sampling)`

Example, for chat reply we have:
`loom_generate_chat_reply` AI sampling 
`loom_append_to_chat` mcp tool
Why 2 mcp tools?

#### More concepts

Loom use AI sampling but not many AI Agents support it, what happen then?
What measn AI sampling fallback mentioned in MCP generate tools descriptions?

If user have no AI CLI Loom will try to use AI API Key, correct?

#### Loom and weave

With Loom product name, we could used `weave` from loom terminology when user ask AI to generate a new doc from thread context, but I think is not worth the rename effort, agree?

These are my observations, please correct me any wrong idea I have

## AI:

Done: patched the idea's `weave` bullet (it now says the buttons are empty-doc **creates** mislabeled `weave`, rename to `create*`, + normalize `weaveCreate → createWeave`) and fixed the success-criteria line. No false "generate (AI)" premise left in the idea.

Now let me sort the concepts. I verified each against source — corrections inline.

### The three doc-birth verbs — mostly right, one correction

You've actually got **three** ways a doc comes into being, and they *are* distinct verbs. Here's the grounded version:

| Verb | AI? | What it does | Tools |
|------|-----|--------------|-------|
| **create** | ❌ no AI | Births an **empty** doc/weave/thread (frontmatter + skeleton). | 8: `loom_create_chat/design/idea/plan/reference/req/weave/thread` ✓ your list is exact |
| **generate** | ✅ AI sampling | Births a doc **and writes its body** via inference. | 6: `loom_generate_chat_reply/design/idea/plan/reference/req` ✓ exact |
| **promote** | ⚙️ **hybrid** | Converts a doc **up the chain** to the next type (chat→idea→design→plan), carrying the parent's content forward, and **links** the new doc to the source. | 1 tool `loom_promote` → 3 app use-cases `promoteToIdea/Design/Plan` |

**Correction on `promote`** — it's not simply "no AI" and not simply "generate." I read `promoteToDesign.ts`: it takes an optional `body`. **If the agent supplies `body`** → used verbatim, no AI (this is the Claude Code path — I'd hand it the content). **If no `body`** → it calls `aiClient.complete(...)` to **summarize the parent into the new doc** (the sampling path). So promote = *create-linked-to-source + content either agent-supplied or AI-summarized*. Its defining trait isn't "AI or not" — it's **the parent→child linkage up the type chain**. That's what makes it its own verb.

### The catalog label — you're right, and I'll widen the fix

`packages/mcp/src/catalog.ts:61` literally has `generate: 'Generate (sampling fallback)'`. The **tool descriptions themselves** already say "using AI sampling" correctly. So the *group label* is the odd one out.

But "AI sampling" vs "sampling fallback" are answering two different questions:
- **What the tool does** (mechanism): AI sampling. ← this is what a catalog group label should say.
- **Its architectural role** (when it's used): the fallback path. ← true, but that's architecture, not a group description.

So agree: change the label to **`Generate (AI sampling)`**. "Fallback" is a real concept but it belongs in the *architecture* notes, not stamped on every generate tool as if it were their category. Good catch.

### Why two tools for chat reply?

Because they sit on the **two AI paths**, same split as everywhere in Loom:

- `loom_append_to_chat` — **deterministic write, no AI.** Appends a message (either role) to the chat. Used when the AI has *already produced* the reply itself — e.g. a launched Claude CLI agent (or me, right now) writes its own answer. This is what I'm using this very message.
- `loom_generate_chat_reply` — **AI sampling.** Asks the *host* to run inference (server→client `createMessage`) to produce the reply, then writes it. Used on the API-key path when no agent is already in the loop.

So it's not redundancy — it's "AI already present, just record it" vs "no agent present, go generate one." In this Claude Code session I always use `append_to_chat`; `generate_chat_reply` would `MethodNotFound` here (next point).

### AI sampling, hosts that don't support it, and the fallback — the whole picture

This is the crux, so let me lay it out end to end:

**MCP sampling** = an *optional* MCP capability where the **server calls back into the host** (`sampling/createMessage`) to run inference. The Loom server has no model of its own; when a `generate_*`/`refine_*` tool needs to *think*, it asks the host to do it.

**Not every host implements it.** What happens then depends on the host:
- **Claude Code CLI (this session):** sampling is **intentionally blocked** → `generate_*`/`refine_*` return `MethodNotFound`. Reason: Claude Code *is already the AI*. Recursive "AI asks the server to ask the AI" is nonsensical here — I just create the doc **with content** directly (`loom_create_* content=...`, or supply `body` to promote). No sampling needed.
- **VS Code extension, primary path:** also doesn't need sampling — it **launches a Claude CLI agent** (your subscription) that reads docs and writes via content tools (`loom_create_*`, `loom_update_doc`, `loom_append_to_chat`). No key, no sampling.
- **VS Code extension, fallback path:** when **no Claude CLI is found**, the extension advertises `{ sampling: {} }` and routes `createMessage` through an **API client** (`reslava-loom.ai.apiKey`, default a cheap Haiku). *This* is the only path where `generate_*` tools actually fire.

So **"sampling fallback"** in the tool descriptions means exactly this: *the API-key sampling path, used as the fallback when the primary launched-agent path isn't available.*

**"If the user has no AI CLI, Loom tries the API key" — correct. ✓** That's the fallback, verbatim. And the whole rule is **exactly one AI is required, never two**: you configure *either* the launched-CLI path *or* the API-key path. Not both.

The takeaway that resolves your worry "not many agents support sampling": **Loom's primary design deliberately does not depend on sampling.** It only matters on the extension's no-CLI fallback. A pure-agent host (Claude Code, Cursor) that lacks sampling loses nothing — the agent writes content directly, which is *better* (you see it, steer it, no second key).

### Loom & `weave` as a verb — agree, don't rename, and here's the stronger reason

Not worth the effort — and I'd go further: it's **actively wrong**, not just not-worth-it. `weave` is already the **noun** for a project folder (and the domain entity). Reusing it as a verb for "AI generates a doc from thread context" re-introduces the *exact* ambiguity we're removing from the extension buttons right now. Keep `generate` as the AI-authoring verb (clear, mirrors `loom_generate_*`); keep `weave` a noun. The brand lives in the product name, not in an overloaded verb.

---

**Net:** your mental map was ~90% right. The two things to fix are (1) `promote` is a hybrid defined by *parent-linkage up the chain*, not by AI-or-not, and (2) the catalog group label `Generate (sampling fallback)` → `Generate (AI sampling)`. Everything else — the create list, the API-key fallback, two chat tools, not renaming to `weave` — you had correct.

Want me to also fix the catalog label (`catalog.ts:61`) now? That's a `packages/**` code edit (not a loom doc), quick and safe. Or fold it into the plan for this thread.

## Rafa:

Thanks! now my concepts are refreshed, I came confusing by the catalog label.

fix the catalog label (`catalog.ts:61`) now

if we are ready for design, write it

## AI:

Fixed the catalog label — `catalog.ts:61` now reads `Generate (AI sampling)` (needs a build to show up in the live `loom://catalog`).

And we were ready, so I wrote the design: `cli/cli-management-command-parity/design.md` (id `de_01KX84P2MMQTQ32M0WYWBZP9J6`, draft). It's grounded in the source I actually read, not the idea's table.

Shape of it:
- **Two workstreams** — (A) 13 new slug/human-first `loom` commands, one per gap op, each a thin wrapper to the existing app use-case (no new core/fs logic); (B) naming reconciliation.
- **Naming** — CLI `rename` (which really retitles) → `loom retitle`; free `rename` for a `loom rename <thread|weave|reference>` namespace mirroring `loom create`. Extension `weave{Idea,Design,Plan,Create}` → `create{Idea,Design,Plan,Weave}`, files + command ids + package.json, clean cutover.

**4 decisions I need you to confirm or redirect** (recommendations in the doc):
1. **rename shape** — `loom rename <thread|weave|reference>` namespace (mirrors `create`) vs flat `rename-thread`. I recommend the namespace.
2. **delete safety** — TTY confirm + `--yes` bypass on `loom delete`; archive stays prompt-free (reversible).
3. **promote without a host AI** — CLI has no sampling, so I recommend `loom promote <doc> <type> --body-file <path>` (agent supplies the child body; promote does the linkage). Keeps way ③ terminal-complete with no second AI.
4. **quick-ship input** — `--goal` + repeatable `--step` (+ `--steps-file` escape hatch).

**One open question I want your call on before a plan:** is **promote** even in-scope here? It's the one gap op that *isn't* a NO-AI tree operation (vision's NO-AI list is "new, delete, rename, drag & drop") — it's an authoring transition. It fits the *parity* gap (button + tool, no CLI twin), but if you'd rather keep this thread purely NO-AI tree ops, promote (± quick-ship) could split to a sibling thread.

STOP — waiting for your calls on the 4 decisions + the promote-scope question before I turn this into a plan.

## Rafa:

1, 2, 3, 4 your recommendations
fold in promote

## AI:

Locked into the design: all four decisions accepted as recommended, and the open question resolved — `promote` stays in-scope as the content-supplied `loom promote <doc> <type> --body-file <path>` (no host AI, way ③ stays terminal-complete).

So the settled scope for the plan is:
- **13 new CLI commands** — archive, delete (TTY-confirm + `--yes`), restore, `rename thread|weave|reference` namespace, retitle (replaces today's `rename`), move-thread, set-priority, set-thread-deps, promote (`--body-file`), close-plan, quick-ship (`--goal` + repeatable `--step`).
- **Extension rename** — `weave{Idea,Design,Plan,Create}` → `create{Idea,Design,Plan,Weave}` (files + command ids + package.json).
- **Parity test + per-command tests + docs sweep** (way ③ audit, cli/README, extension README).

Next: I'll turn this into a plan with `loom_create_plan` (structured steps) when you say go. Want it as one plan, or split A (new commands) and B (naming reconciliation) into two plans so they can land independently?

## AI:

Two plans written, both parented to the design:

**Plan A — new CLI tree-management commands** (`plan-001`, `pl_01KX858NA9H614474WYXQNAQVJ`) — 9 steps:
1. archive + restore
2. delete (TTY-confirm + `--yes`)
3. move-thread
4. set-priority + set-thread-deps
5. close-plan
6. quick-ship (`--goal` + repeatable `--step` + `--steps-file`)
7. promote (`--body-file`, errors if omitted — no CLI sampling)
8. per-command tests + `test-all.sh` (blocked on 1–7)
9. docs sweep — way ③ audit + cli/README (blocked on 1–7)

**Plan B — verb reconciliation** (`plan-002`, `pl_01KX859B2QHNPA3BVWCWVVN096`) — 6 steps:
1. CLI `rename` → `retitle`
2. `loom rename <thread|weave|reference>` namespace (blocked on 1)
3. extension `weave*` → `create*` handlers + `extension.ts`
4. extension `package.json` manifest (blocked on 3)
5. CLI⇄MCP parity test — blocked on **B1, B2, and Plan A** (cross-plan `pl_` ref), since it asserts the full surface
6. docs sweep — cli/README + extension README + WAYS (blocked on 1–4)

Both are `draft`. Independent except the parity test (B5), which waits on A. Suggested order: land A, then B.

Note: the `catalog.ts` label fix from earlier is still an uncommitted working-tree edit — I'll fold it into the first commit when we start, or commit it standalone if you prefer.

STOP — plans are ready. Say `go` (and which plan) to start implementing, or `start A` and I'll `loom start-plan` it and begin step A1.

## Rafa:

I started plan A
do whole plan A
commit (fold in `catalog.ts` label fix)

note: i guess all 3 readmes and docs sync will be fired by CLAUDE.md doc sync contract after plan A and after plan B, correct?

## AI:

Plan A done — all 9 steps ✅, plan auto-transitioned to `done`. Done record in `done/plan-001-done.md`.

**9 new CLI commands** (thin wrappers → existing app use-cases, slug→ULID resolved at the edge):
`archive` / `restore` / `delete` (guarded: TTY-prompt, non-TTY aborts, `--yes` bypasses) · `move-thread` · `set-priority` · `set-thread-deps` · `close-plan` · `quick-ship` · `promote --body-file`.

**Two deviations from the design, both to match reality:**
- **quick-ship** — the actual `quickShip` use-case has no `goal` param (only `description` + `notes`). So I dropped the design's `--goal`; each repeatable `--step` becomes one done step (`--steps-file <json>` escape hatch kept). Recorded in the done note.
- **delete** — `readline/promises` needed the `node:` prefix for the esbuild CLI bundle (would've failed at build otherwise).

**Verification:** new `tests/cli-tree-management.test.ts` round-trips every command end-to-end through the linked `loom` binary (with fs assertions on moved/archived/deleted folders and both delete-guard branches). Wired into `test-all.sh`; **full suite green**. CLI typecheck (`tsc --noEmit`) clean.

**Docs:** way ③ availability paragraph in `WAYS-TO-USE-LOOM.md` + a "Tree management" table in `cli/README.md`. (Extension README + rename/retitle docs are Plan B.)

Committing now, folding in the `catalog.ts` label fix.

Plan B (verb reconciliation) is still `draft` and untouched — say the word when you want it.

## Rafa:

I started plan B
do whole plan B
commit

## AI:

Plan B done — all 6 steps ✅, plan auto-`done`. Done record in `done/plan-002-done.md`. The whole `cli-management-command-parity` thread is now implemented.

**The verb space is reconciled:**
- CLI: `loom rename <doc> <title>` (which really *retitled*) → **`loom retitle`**; `rename` is now a namespace — **`loom rename thread|weave|reference`** — mirroring `loom_rename_*` and the `loom create <type>` shape.
- Extension: **`weave{Idea,Design,Plan,Create}` → `create{Idea,Design,Plan,Weave}`** (handler files `git mv`'d, functions, command ids, package.json). Behavior unchanged — they still call `loom_create_*`.

**One label decision I made (whole-plan authorization):** the button *titles* went `Weave Idea/Design/Plan` → **`New Idea/Design/Plan`**, matching the existing **`New Weave`** title, rather than `Create Idea`. Reasoning: consistency with the button already in the tree, and "New X" is VS Code's house convention. The *command ids* are `create*` (mirroring the API); the *labels* are `New *`. Flagging in case you'd prefer literal `Create *` labels — trivial to switch.

**New guard:** `tests/cli-mcp-parity.test.ts` — enumerates the live tool surface (`loom catalog tools`), and fails if any `loom_*` tool is neither mapped to a CLI twin nor a documented single-audience exception. 59 tools today, all classified. This is the drift catcher: a future tool with no CLI twin and no exception fails CI.

**Regression caught + fixed:** `id-management.test.ts` still called `loom rename` → switched to `retitle`. Full suite green; CLI + extension typecheck clean.

Committing now.