---
type: idea
id: id_01KX97GGP1DTB9QKKR2K739X2J
title: Quick-fix lane — a low-ceremony slang recipe for small tasks
status: done
created: 2026-07-11
updated: 2026-07-11
version: 4
tags: []
parent_id: null
requires_load: []
---
# Quick-fix lane — a low-ceremony slang recipe for small tasks

## What we want to build

A documented **quick-fix lane**: the minimal Loom loop for a small/simple task, where the user skips the full idea → design → req → plan ceremony and drives the whole thing from a chat with a short slang chain. Built entirely on the slang vocabulary shipped in [[loom-slang-protocol]] — no new tools.

The lane, end to end:

```
chat: "find the root cause of this UI bug…"   (user writes in a chat doc)
read fixes/fix-ui/chat-001                     (user points the agent at it)
→ agent loads context, finds the root cause, replies in the chat
"code quick, docs done, commit"                 (one comma-chained slang line)
→ code quick : implement the agreed fix → build + test + verify → quick-ship records it as a one-shot DONE plan
→ docs done  : sets the chat (and any idea/design) done; never plans; req stays locked
→ commit     : commit-last rule — reply lands, then the commit
```

## Why it matters

- **Directly attacks the "Loom feels heavy for tiny work" adoption barrier.** Today the full loop is overkill for a one-line bug fix; a developer with a five-minute task won't spin an idea/design/plan. The quick-fix lane makes Loom worth using for small work, which is most work — the strongest lever for the vision element *"Loom is for any developer… simple projects,"* and a cheap validation bet (all pieces already exist).
- **It costs nothing to support** — it is purely the slang words composed. This thread is about *documenting and settling the recipe*, not building machinery.

## The `do quick` decision — settled

**`do quick` stays a pure *recording* verb (option A).** It records **already-done** work as a one-shot DONE plan; it never writes code. The implement-then-record case is handled by two sibling words, so the meaning of `do quick` never drifts with context:

- **`code quick`** — implement an agreed **source-code** change → build + test + verify → `do quick`.
- **`write quick`** — implement an agreed **docs/prose-only** change → `do quick` (no build/test).

Together they form the **`{act} quick` family**: the trailing `quick` marks the plan-less lane; the leading verb declares the act that precedes the record. The split axis is *what verification the record is owed* — any source touch (or a **test-gated contract file**, e.g. `CLAUDE.md`) is `code quick`; prose with no test gate is `write quick`. This keeps every `quick` word deterministic: the leading verb tells the AI whether to run the build/test/verify cycle. (Rejected — option B: overloading `do quick` to sometimes write code; terser, but the word's meaning would drift with context.)

## Success criteria

- A short, documented **quick-fix lane** recipe lives where a new user will find it — the `{act} quick` family in `loom/refs/loom-slang-reference.md` **and** a section in `docs/WAYS-TO-USE-LOOM.md` (way ① Guided / small projects).
- The `do quick` semantics are unambiguous: `do quick` records only; `code quick` / `write quick` implement-then-record (source vs docs). Recorded in the reference and both `CLAUDE.md` surfaces.
- Comma-chained slang (`code quick, docs done, commit` executed in sequence) is documented as supported.

## Notes / graceful degradation

- `docs done` in this lane has no idea/design to sweep — it just sets the chat done. Correct behavior, no change needed.
- `commit` is not Loom slang; it self-names and is governed by the commit-last rule.
- Scope discipline: this is a *documentation + decision* thread, not new code. If it grows a code need, that is a signal to re-scope.