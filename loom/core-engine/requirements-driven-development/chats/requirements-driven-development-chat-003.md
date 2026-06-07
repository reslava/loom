---
type: chat
id: ch_01KTHXGSZS0AP7CVXCDZJ9SQPQ
title: requirements-driven-development Chat
status: active
created: 2026-06-07
version: 1
tags: []
parent_id: null
requires_load: []
---
# requirements-driven-development Chat

## Rafa:

### Post v1.0.0 fixed

I am developing a new app using Loom in path `J:/src/chord-flow`

Fixed to be done:

### reqs

i follow chat -> idea -> design -> reqs -> plans
plan reqs was detailed in chat when AI created them, but plans steps table, Staisfied column are empty
i think if I refine the plans now Satisfied column will be filled as we checked in this project
it looks that the issue is that create a new plan do not take into account the reqs? analyze it

### No chat reply for refs/chats

there is no `AI reply` command wired to chats under `refs`. fix it.

### .claude/settings.local.json

loom install should include:
```json
  "attribution": {
    "commit": "",
    "pr": ""
  },
```

### double-suffix

- when create a new loom doc: a title containing the type word silently doubles it, and `loom_rename` can't fix the filename. Stripping a trailing type word, or exposing a filename-rename, would smooth that. For example, a `-reference-reference.md`. Also, letting AI to know that type is not needed in the Title.

### Reply inside chat docs

i've reminded AI twice that chat-reply-inside-the-doc rule. This should be fixed in loom install claude.md. Correct? any other better fix?

### mcp tools

MCP tool schemas are deferred, so each new `loom_*` tool costs a `ToolSearch` round-trip before first use. Any way to solve this? 


## AI:

Analyzed all six. Root causes below, then I'll implement.

### 1. reqs don't reach the plan's Satisfies column

**Root cause — the plan *creation* prompt is not req-aware; only *refine* is.** The plan-step schema already carries `satisfies` and the table already has the column (`planTableUtils.ts`), and `loom_create_plan` already parses a `Satisfies` column out of a passed `content` body. The break is in the launch prompts:

- `promoteToPlanCommand` (right-click design/idea/chat → Promote to Plan) launches Claude but tells it to call `loom_create_plan` with `steps: string[]`. Plain strings have **no** satisfies field, so `weavePlan` fills `satisfies: []` for every step. The prompt never mentions `req.md`.
- `refinePlanCommand`'s prompt *does* read `req.md`, keeps the 6-column table, and fills each `Satisfies` cell — which is exactly why "refine fills it but create doesn't."

So `loom_create_plan` *can* take satisfies (via a full `content` table); the create-side launch prompt just never asks the agent to author one. **Fix:** rewrite the promote-to-plan launch prompt to mirror refine — read the design + thread `req.md`, author a full 6-column Steps table as `content` (treat ❌/⛓ as hard boundaries, cover every ✅, cite IN/C ids per step), pass it as `content` to `loom_create_plan`. No schema change.

**Bonus bug found:** the sampling-fallback `loom_generate_plan` generates steps-with-satisfies as JSON, then calls `weavePlan` **without passing them** — every fallback-generated plan is born with an empty table. I'll fix that to write the generated steps too.

### 2. No AI-reply command on `refs/` chats

**Root cause — a `when`-clause gap.** Refs chats get `contextValue = 'chat-refs'` (so they can offer *Promote to Reference* instead of promote-to-idea/design/plan). But the `loom.chatReply` menu is gated `viewItem == chat`, which excludes `chat-refs`. The command and `chatReplyCommand` itself work fine for refs chats; only the menu visibility is missing. **Fix:** change the chatReply `when` to `viewItem =~ /^chat(-refs)?$/`.

### 3. `loom install` should seed `.claude/settings.local.json`

**Root cause — not written at all.** `installWorkspace` writes `.loom/CLAUDE.md`, `.mcp.json`, `loom/ctx.md`, `.loom/settings.json`, patches root `CLAUDE.md` — but never touches `.claude/`. **Fix:** add a step that ensures `.claude/settings.local.json` carries your `attribution: { commit: "", pr: "" }` block (merge if the file already exists so existing permissions aren't clobbered; only add the key when absent).

### 4. Double type-suffix in filenames (`-reference-reference.md`)

**Root cause — title-derived slug + unconditional `-reference` suffix.** `createReference` builds `slug = kebab(title)` then writes `${slug}-reference.md`. Title "X Reference" → `x-reference` → `x-reference-reference.md`. `loom_rename` can't fix it by design (it changes only the title/H1, never the id/filename, to keep backlinks stable). Same latent trap exists for `weaveIdea` when it derives a threadId from a title containing "idea". **Fix:** add a pure `stripTrailingTypeWord(slug, type)` helper in core `idUtils`, apply it to the reference slug (and the idea threadId derivation), and add a one-line "don't put the type word in the title" note to the create-reference tool description / launch prompt. I'm fixing it at creation, not adding a filename-rename — the filename is intentionally immutable.

### 5. Reply-inside-chat rule keeps getting missed

**Honest answer: hardening `loom install` CLAUDE.md is correct but necessary-not-sufficient.** The template *already* carries a strong "Chat docs are the conversation surface (always reply inside)" rule plus the full chat-reply-context-injection section — yet the model still drifts in a plain CLI session, because CLAUDE.md is guidance the model can de-prioritize, not an enforced gate. The genuinely reliable fix is the path you're not always using: the extension's **AI Reply button**, whose *launch prompt* hard-codes `loom_append_to_chat` (launch prompts out-rank CLAUDE.md). For pure CLI sessions the only durable lever short of a hook is wording/placement. **Fix I'll apply:** promote the rule to the top of the template's session rules and tighten it. A hard guarantee would need a Stop/PostToolUse hook that detects "chat doc active + reply went to terminal," which isn't generically detectable — so I'm not over-promising one. If you want, that's a separate thread.

### 6. MCP tool schemas are deferred (ToolSearch round-trip)

**This is a Claude Code harness behavior, not a Loom bug — nothing to fix in this repo.** When a host exposes many MCP tools, Claude Code defers their schemas and surfaces only names, requiring a `ToolSearch` (or first-use fetch) before the first call. Loom can't disable that from the server side. The only Loom-side lever is **surface-area reduction** — fewer, broader tools means fewer deferrals. We're at ~45 `loom_*` tools; some are consolidatable (e.g. the per-type `create`/`refine`/`generate` families). That's a real design thread (a `loom_create(type, …)` / `loom_refine(type, …)` consolidation) but it's a meaningful refactor with its own trade-offs, not a quick fix — I'd open it separately rather than fold it into this batch. Net: no code change here; logged as a known cost.

Implementing 1–5 now (and the fallback-plan bonus bug), then build + test.

## AI:

### On `enableAllProjectMcpServers` / `enabledMcpjsonServers`

Yes — but only the **narrow** key. I added `"enabledMcpjsonServers": ["loom"]` to the install seed. It pre-approves the project-scoped loom server so Claude Code stops prompting for the one-time `/mcp` approval on first open — that approval friction is documented in our own CLAUDE.md, so removing it is a real onboarding win.

I deliberately **did not** add `"enableAllProjectMcpServers": true`. That flag auto-trusts *every* MCP server any `.mcp.json` declares — present and future — which is a security smell: a project that later adds a second, untrusted server would get it silently enabled too. `enabledMcpjsonServers: ["loom"]` grants exactly the trust we need and nothing more. `settings.local.json` is the right home (per-user, gitignored — it's where Claude Code records approvals anyway). Merge-safe: existing entries are preserved.

---

### Done — built + tested green (all 14 MCP integration tests + full suite pass)

| # | Item | What changed |
|---|------|--------------|
| 1 | reqs → plan Satisfies | `promoteToPlanCommand` launch prompt is now req-aware: reads `req.md`, authors a full 6-column Steps table as `content` with IN/C citations (mirrors refine). **Bonus:** fixed `loom_generate_plan` (sampling fallback) which was discarding all generated steps → empty plans. |
| 2 | refs chat AI-reply | `loom.chatReply` menu `when` → `viewItem =~ /^chat(-refs)?$/`; refs chats now show the AI Reply command. |
| 3 | install seeds `.claude/settings.local.json` | New install step writes `attribution: { commit:"", pr:"" }` **and** `enabledMcpjsonServers: ["loom"]`, merging into any existing file. CLI install output lists it. |
| 4 | double type-suffix | New pure `stripTrailingTypeWord(slug, type)` in core `idUtils`; applied to the reference slug and the idea threadId derivation, so "API Reference" → `api-reference.md` (not `…-reference-reference.md`). Tool description now tells the AI not to put the type word in the title. |
| 5 | reply-inside-chat rule | Added a bold "#1 rule" callout atop the AI-session-rules in **both** surfaces (installed `.loom/CLAUDE.md` template + repo-root `CLAUDE.md`). Honest caveat stands: CLAUDE.md is necessary-not-sufficient; the reliable path is the extension's AI Reply button (launch prompt out-ranks CLAUDE.md). |
| 6 | MCP deferred schemas | No code change — it's a Claude Code harness behavior, not a Loom bug. Only Loom-side lever is tool-surface consolidation (~45 tools → grouped `loom_create(type)` / `loom_refine(type)`), a real but separate refactor thread. Logged as a known cost. |

**Files touched:** `core/idUtils.ts` + `index.ts`; `mcp/tools/createReference.ts`, `mcp/tools/generate.ts`; `app/installWorkspace.ts`; `cli/commands/install.ts`; `vscode/commands/promoteToPlan.ts`, `vscode/commands/weaveIdea.ts`, `vscode/package.json`; repo-root `CLAUDE.md`.

**Note (existing chord-flow plans):** these fixes apply to *newly created* plans. Your already-created plans with empty Satisfies columns are fixed by running **Refine Plan** on each (its prompt was already req-aware) — which matches what you observed.

Next: waiting for direction — want me to commit this, or look at the tool-consolidation thread for item 6?

## Rafa:

### 6 | MCP deferred schemas 

Will be helpful to include a consolidation catalog enumeration of mcp tools grouped with small description? I know this is discoverable for AI just by inspecting mcp loom server, but we could direct AI right to the proper group...?

commit, push this



## AI:

### On a grouped tool catalog in CLAUDE.md

Honest read: **it helps targeting, but it does not remove the round-trip** — so it's a partial win, worth doing only if we're clear-eyed about which half it fixes.

What the deferral actually costs us is two distinct things:
1. **Discovery** — knowing a tool exists and which one fits. A catalog fixes this well.
2. **Schema fetch** — even knowing the exact name, the AI must still `ToolSearch select:loom_x` once to load the parameter schema before the first call. This is structural to Claude Code's deferral; a catalog can't bypass it.

So the catalog's real value is **fewer, sharper fetches and fewer wrong-tool picks**: instead of a fuzzy keyword search that may take 2–3 tries (or pick the wrong tool), the AI reads the catalog, sees the exact name, and goes straight to `ToolSearch select:loom_create_plan` — one targeted round-trip. That's a genuine improvement to first-pick accuracy and a reduction in wasted searches, but the per-first-use fetch stays.

**Trade-off:** it's another hand-maintained surface that drifts. We already carry the two-CLAUDE.md sync burden; a 45-line tool catalog adds a third thing that goes stale every time a tool is added/renamed. The mitigation for *that* is to **generate** the catalog from the tool registry (the `toolDef` objects are the source of truth) rather than hand-write it — a tiny script that emits the grouped markdown, run in build-all, so it can't drift.

**Recommendation:** worth it, but do it generated, not hand-written — and frame it honestly in the doc as "name targeting, not round-trip elimination." This is really the *same* underlying lever as item 6's consolidation (fewer/grouped tools), just the documentation half instead of the API half. I'd fold both into one small thread: "MCP tool surface — consolidate + auto-generated catalog." Want me to open it?

Committing + pushing the current batch now.