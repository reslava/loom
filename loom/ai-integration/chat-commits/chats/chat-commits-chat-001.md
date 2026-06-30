---
type: chat
id: ch_01KWD6TKR2DWW9126HA3BAJ7BN
title: chat-commits Chat
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 7
---
# chat-commits Chat

## Rafa:

In a project developed with Loom when user ask you to commit in a chat doc, you do the commit and then append the reply in the chat doc, that is correct, but then your last reply make this doc unstaged & uncommited again.

I wonder if you we could add a kind of rule like this:
>Add the reply to the active chat before the pending commit when is possible
to `.loom/CLAUDE.md`

and avoid this little issue

What you think?

## AI:

Your instinct is right, and the fix is cleaner than the rule you sketched. Let me name the root cause first, then refine the rule.

**Root cause.** The chat reply *is* part of the work, but we commit before writing it. So the commit can never contain the very reply that announces it — the doc is dirty by construction. The order is wrong, not the behavior.

**The refinement.** Two things have to change together, or the rule doesn't actually close the gap:

1. **Reply first, commit last.** Append the reply to the chat, *then* `git add` (including the chat doc) and commit as the final action. Now the commit contains the reply, and the tree is clean afterward.
2. **Don't put the commit hash in the reply.** This is the catch your "when possible" was hedging around. If the reply says "committed as `abc123`", it *must* come after the commit — chicken-and-egg, and you're dirty again. So the rule has to forbid referencing the hash: the reply points at *what changed*, not at *the commit object*. The hash is always recoverable from `git log`; a clean tree is the thing worth protecting.

So I'd phrase it as one rule, not a soft "when possible":

> **Commit as the last action of a chat turn.** When a chat turn asks you to commit, append your reply to the chat *first*, then stage everything (including the chat doc) and commit. Don't reference the commit hash in the reply — describe the change, not the commit object. This leaves a clean working tree.

**The one honest limitation** — so we don't oversell it: this only makes the tree clean *at the end of that turn*. The very next chat turn re-dirties the doc, because a living conversation log is almost always ahead of the last commit. That's fine and expected; we're not trying to keep chats perpetually committed, just to stop a commit from leaving its own trigger doc dirty.

**Two open questions for you:**

- **Scope.** This is project-agnostic commit hygiene, so it belongs in the `LOOM_CLAUDE_MD` template (what `loom install` writes to `.loom/CLAUDE.md`). Do you also want it in *this* repo's root `CLAUDE.md`? If it lives in both it becomes a shared rule and needs a matching `<!-- rule:{id} -->` marker on each side (the sync test enforces that). My lean: template-only — it's generic hygiene, and this repo's own commit flow already follows it.
- **Where it sits.** I'd put it under a commit/git-hygiene note, not the chat rules — it's about *ordering an action around* the chat, not about the chat surface itself.

Want me to draft the exact template edit so you can see the wording in place before we touch the file?

## Rafa:

You said: 
>this repo's own commit flow already follows it

But I thought commit/chat issue also happen in this repo

## AI:

Fair catch — that line was wrong. The issue happens here too, identically: when you ask me to commit during a chat session, I commit, then `loom_append_to_chat` re-dirties the very chat doc that was just committed. This repo has no special immunity; I just haven't been disciplined about ordering. "Already follows it" was me assuming good behavior rather than observing it.

That changes my scope recommendation. If the problem exists in both places, the rule should live in both:

- **Root `CLAUDE.md`** (this repo — the recursive contract), and
- **`LOOM_CLAUDE_MD` template** (every downstream `loom install`).

Which makes it a **shared rule** by your own sync system — so it needs a `<!-- rule:{id} -->` marker placed identically in both files (say `rule:commit-last`), and `tests/claude-md-sync.test.ts` will then guard it from drifting. The prose can differ in voice between the two surfaces (this file talks to you; the template talks to "the user"), but the marker id and the rule's existence must match.

So the plan would be:
1. Add the rule to root `CLAUDE.md` with `<!-- rule:commit-last -->`.
2. Mirror it into the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts` with the same marker, terser voice.
3. Run `./scripts/test-all.sh` to confirm the sync test passes.

One thing to settle before I draft: do you want this as its own short rule, or folded into an existing git/commit note if one already exists in those files? Let me grep both surfaces for any current commit guidance so I'm extending rather than duplicating — then I'll show you the exact wording for both before editing. `go`?

## Rafa:

I think it is the first commit rule we include, you can verify it.
I think it is worth to fix this issue because without it loom generate a lot of no sense commits, agree?
go

## AI:

Done — and you're right that it was the first commit rule (I grepped both surfaces: the only prior "commit" mentions were the co-author-attribution code, no rule). I also agree it's worth fixing: a commit that re-dirties its own trigger doc is exactly the "nonsense commit" churn you're describing — the working tree never settles, so the next status looks dirty for no real reason.

**What I added — a shared rule `rule:commit-last` in both surfaces:**

1. **Root `CLAUDE.md`** — full version: reply lands before the commit, commit is the last action of the turn, never put the hash in the reply, and the honest note that the next turn legitimately re-dirties the doc.
2. **`LOOM_CLAUDE_MD` template** (`packages/app/src/installWorkspace.ts`) — same rule, terser/generic voice for downstream `loom install`.

**Verified:**
- `tests/claude-md-sync.test.ts` → ✅ 15 shared rule ids match across both surfaces (was 14), all 12 invariant tokens present. The marker parity is now enforced, so it can't silently drift.
- `./scripts/build-all.sh` → ✅ clean, so the template change is compiled into dist (what `loom install` actually writes).

Note I haven't committed anything yet — and that's deliberate, since *this* is now the test case for the rule. When you say commit, I'll dogfood it: this reply is already in the chat, so I'll stage everything (chat doc + both `CLAUDE.md` edits + rebuilt dist) and commit as the last action, with no hash in any reply — leaving a clean tree.

Want me to commit now? If so, a suggested message:

`docs: add commit-last rule to both CLAUDE.md surfaces`

## Rafa:

write a small, 1 step plan to appear in roadmap
commit

## AI:

Plan created, started, and marked done — it's a faithful done plan since the work is already implemented, not a pending one that would misrepresent state.

- **Plan:** `chat-commits-plan-001` — "Commit-last rule for both CLAUDE.md surfaces", 1 step, ✅ done (auto-completed on the last step).
- **Thread manifest** auto-scaffolded (`thread.md`, default priority 1000), so the `chat-commits` thread now appears on the roadmap.
- **Done doc** records the two edited files + the sync-test/build-all verification.

Committing now as the **last** action of this turn (dogfooding `rule:commit-last`): this reply is already in the chat, so I'll stage everything and commit with no hash referenced anywhere. Result lands below.