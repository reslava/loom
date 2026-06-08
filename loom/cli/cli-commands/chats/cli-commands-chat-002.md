---
type: chat
id: ch_01KTKDS0D2E4RRT3W0A8VN24S3
title: cli-commands Chat
status: active
created: 2026-06-08
version: 1
tags: []
parent_id: null
requires_load: []
---
# cli-commands Chat

## Rafa:

### Fixes

I continue with app dev in path: `J:/src/chord-flow` using Loom, discovered more issues

1. Even with clausule in CLAUDE.md to use and load `loom://catalog` first instead of do mcp tool search AI skipped it.
We need to ensure AI will load `loom://catalog` first

2. When create a new chat in extension did not used config in `.loom/settings.json`:
```json
{
  "user.name": "Rafa:",
  "ai.model": "AI:"
}
```


## AI:

Both fixed.

### Fix 2 — new chat ignored `.loom/settings.json` (root cause found)

Not an extension bug — a **path bug in the shared resolver**. `packages/app/src/utils/chatNames.ts` read settings from:

```ts
path.join(loomRoot, 'settings.json')      // ← wrong
```

but `loom install` writes them to `.loom/settings.json` (`installWorkspace.ts:307`), and `loomRoot` is the project root. So the file was **never** found — `getUserName`/`getAiName` always fell through to `User:`/`AI:`. This hit *every* consumer (new chat, chat reply, doStep, weaveDesign, appendToChat), not just new-chat.

Fix (one line, root cause):

```ts
path.join(loomRoot, '.loom', 'settings.json')
```

Verified with a temp fixture: `getUserName` now returns `Rafa:` from `.loom/settings.json` (was `User:`). Build + full suite green (16/16 MCP integration, multi-loom, commands).

> ⚠️ The **running** MCP server in your live session still has the old `app/dist` in memory — reload the extension window (and restart this MCP session) before re-testing new-chat, or it'll look unfixed.

### Fix 1 — AI skipped `loom://catalog`

You're right that the clause existed and got skipped. The honest diagnosis: the rule was **conditional and reactive** — "before `ToolSearch`-ing, read the catalog" — so it only fired at the exact moment the model decided to search, which is the moment it skips. Prose can't *guarantee* adherence (only a hook could, and that's Claude-Code-only), but we can remove the failure window.

Per your call, I hardened **both** CLAUDE.md surfaces:

- **Root `CLAUDE.md`** (recursive contract) and **the `LOOM_CLAUDE_MD` template in `installWorkspace.ts`** (what `loom install` writes to every downstream `.loom/CLAUDE.md`, e.g. chord-flow).
- Change: `loom://catalog` is now a **mandatory, unconditional session-start step** (alongside ctx / vision+workflow / active-state / do-next-step), so the tool index is in context *up front, every session* — there's no longer a "first `ToolSearch` runs blind" moment. The old reactive rule was rewritten to "the catalog is already loaded at session start; consult it, and a blind `ToolSearch` for a `loom_*` tool is a rule violation."
- New session-start visibility line: `🗂️ loom-catalog loaded — tool index ready`.

This is the portable fix (works for any agent honoring the contract, not just Claude Code). If you later want a *hard* guarantee for Claude Code specifically, the deterministic option is a `loom-mcp-gate`-style PreToolUse hook that denies a `loom_*` `ToolSearch` until the catalog was read — more machinery, CC-only. Say the word and I'll spec it.

Both CLAUDE.md surfaces are in sync per the two-surface rule.

## AI:

### Catalog-gate hook — my call: not worth it now

You asked me to build it only if I judge it worth the cost. I don't, for one decisive reason plus a few supporting ones:

**1. It wouldn't reach the place the bug came from.** `loom install` seeds **no hooks** — the `loom-mcp-gate` hook lives only in this repo's hand-maintained `.claude/` (it isn't even registered in the active `settings.local.json`; it's wired globally). So a catalog-gate hook would protect *my* recursive sessions only, **not chord-flow** — and chord-flow is exactly where you saw the skip. To actually fix the reported case I'd first have to build hook-seeding into `loom install`: write the script, merge it into `.claude/settings.json`, and ship a cross-platform pair (the gate is PowerShell-only — mac/linux users need a `.sh`). That's a feature, not a 1.2.1 patch.

**2. Real, fragile machinery for a deterministic guarantee.** It can't be stateless: it needs a per-session marker (keyed by the hook's `session_id`) written when `loom://catalog` is read and checked when `ToolSearch` runs — two coordinated hooks. And `ToolSearch` serves *all* deferred tools, so the gate must heuristically parse the query for `loom`/`mcp__loom`; keyword searches that return loom tools without saying "loom" slip through, and over-broad matching false-positives on legit non-loom searches. You can't blanket-deny either, because after reading the catalog you still need `ToolSearch` to fetch the schema.

**3. The portable fix we just shipped attacks the actual root cause.** The skip happened because the rule was *reactive* — "before ToolSearch, read the catalog" fired at the one moment the model skips. Making the catalog an **unconditional session-start load** removes that window for *every* agent (Cursor included), not just Claude Code. A hook would be CC-only belt-and-suspenders on top of that.

**Recommendation:** ship the portable fix (1.2.1), watch whether chord-flow still skips. If it recurs, the right next move isn't a repo-local hook — it's `loom install` seeding a cross-platform hook bundle (gate + catalog-gate together), as its own thread. Design is sketched above if we get there.

Shipping both fixes now as **1.2.1**.