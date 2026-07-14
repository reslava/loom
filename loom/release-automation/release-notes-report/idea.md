---
type: idea
id: id_01KXETZC3SX632SXB8E9VM7862
title: Release-notes report — do-release drafts its changelog from the graph
status: done
created: 2026-07-13
version: 1
tags: []
parent_id: null
requires_load: []
---
# Release-notes report — do-release drafts its changelog from the graph

## What we want to build

Wire the existing **`release-notes` report kind** into the **`do-release`** flow so a release's changelog is **drafted from the Loom doc graph** — done docs, `actual_release`, roadmap history — instead of hand-synthesized from `git log`. `do-release` invokes the reports engine (`loom report release-notes --since <last-tag>`, or the `report` prompt) to produce a structured Added / Changed / Fixed draft, then hands it to the **human-review gate that already exists** in the runbook. The report *drafts*; the human still *approves* what ships.

Origin: `chat-007.md` in `ai-integration/doc-graph-reports` — the "the release notes' top line is the feature that can now write the release notes" recursion. This is the snake biting its own tail, on purpose: Loom's most-used internal workflow (releasing) becomes a consumer of the doc-graph reports feature it just shipped.

## Why it matters

- **Removes a real manual synthesis step.** Today `do-release` step 2 reads `git log <lastTag>..HEAD` with full commit bodies and the agent hand-sorts commits into Added / Changed / Fixed. That is exactly the synthesis Loom's reports exist to automate — and the graph carries richer material (done docs with rationale) than one-line commit subjects.
- **Honest dogfooding of reports.** If the `release-notes` kind is good enough to draft Loom's own release notes, that is strong validation the kind was well-scoped. If it isn't, we find out on the workflow we run most.
- **Vision fit.** Serves *"the AI becomes as stateful as it can be — via durable docs it rereads"* and removes a manual step no codebase-only tool touches (release notes framed by *why*, from the decision graph).

## Design stance (to settle in design — not decided here)

1. **Source of truth: git log vs done docs vs hybrid.** The current runbook drafts from **commits**; the `release-notes` kind reads **done docs + `actual_release`**. These diverge — there's a commit per change but a done doc per *plan*, and not every shipped change has a done doc (quick fixes, chore/docs commits) nor does every done doc map 1:1 to a user-facing note. Decide between: (a) switch to graph-sourced, (b) keep git log as the spine and use the report as enrichment/framing, or (c) reconcile both (git log for completeness, graph for the *why*).
2. **The `actual_release` chicken-and-egg.** `record-release` stamps `actual_release` **during** `do-release`, *after* the changelog is drafted — so at draft time this release's plans are **not yet stamped**. The report must therefore select by a **date window / "done since the last tag"**, never by the not-yet-written `actual_release`. This is the sharpest concrete gotcha and likely drives the selection design.
3. **Where it plugs in — the gate is unchanged.** The report runs *before* the existing human-review STOP: `do-release` generates the draft, shows it, waits for `go`. The report replaces the **drafting**, never the **approval**. Bump/tag/push are untouched.
4. **Invocation shape.** Does the `do-release` skill shell out to the CLI (`loom report release-notes --run`), or assemble the brief inline and synthesize in-session? (In-session is cheaper — the agent is already running — and keeps the draft in the review turn.)

## Success criteria

- `do-release` produces its Added / Changed / Fixed draft by calling the reports engine, not by hand-reading `git log`.
- The human-review STOP in the runbook is unchanged — the draft is reviewed and editable before bump/tag.
- Reuses the existing `release-notes` kind (hardened if needed) — **no new report kind** — proving the kind was well-scoped.
- The root-CHANGELOG section it produces is still published verbatim as the GitHub release body (format compatibility preserved).

## Open questions (deferred, not blocking the idea)

- The git-log-spine vs graph-sourced vs hybrid decision (§1) — the core call.
- Whether the `--since <last-tag>` selection filters on the right date field given the pre-stamp problem (§2).
- CLI `--run` vs inline brief (§4), and whether the do-release *skill file* changes or a new `loom` command wraps it.
- Does this belong in `release-automation` (runbook change) or as a `doc-graph-reports` follow-up (reports-engine change)? Homed here for now because the user-visible change is in the release flow.
