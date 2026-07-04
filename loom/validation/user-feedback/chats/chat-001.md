---
type: chat
id: ch_01KWQ7H78RCDZN51YRF9VZJKZJ
title: user-feedback Chat
status: done
created: 2026-07-04
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 7
---
# user-feedback Chat

## Rafa:

read idea
next thread will be validation/telemetry

if these 2 validation threads are effective, probably I will implement them in my other 2 repos:
https://github.com/reslava/chord-flow
https://github.com/reslava/nuget-package-reslava-result
that I also develop with you
so maybe we can resuse some parts

## Open questions

- Channel: GitHub issue template
- Placement: command palette and a status-bar item
- CLI: include `loom feedback`

is it all grounded? 
write design + req if you consider we need them, if a plan is enough write the plan
suggestion to improve the effectiveness of the idea?

## AI:

Read the idea. Short version: it's grounded, your three open-question answers are the right calls, and I'd write a **short design + a plan** — but skip `req`. One improvement is worth a decision before I generate anything, so I'm stopping here for your `go`.

### Is it grounded?

Yes. All three answers hold:

- **Channel — GitHub issue template.** Lowest friction, no backend, and it reaches you because you own the repo. A prefilled issue-form URL (`.../issues/new?template=feedback.yml&...`) carries version/OS as query params. Keep it.
- **Placement — command palette + status-bar item.** Good. The status-bar item is always-visible but zero-nag; the palette command is the discoverable entry. No toast needed for v1.
- **CLI — include `loom feedback`.** Yes, and specifically *because* of your reuse point below: CLI/agent users never open the extension, and your own dogfooding in chord-flow/nuget is often terminal-first. It's ~15 lines (open the browser to the same prefilled URL). Cheap, include it.

### The reuse angle is the real design decision

You want to drop this into chord-flow and nuget-package-reslava-result later. That only works if **the target repo is not hardcoded to `reslava/loom`.** So the reusable core is:

- A **`feedback.repo` resolution** step: default to auto-detect from the workspace's git `origin` remote, with a `reslava-loom.feedback.repo` config override. In the Loom repo it resolves to `reslava/loom`; in chord-flow it resolves to `reslava/chord-flow` automatically — same command, zero per-repo code. That single decision is what makes it "reuse some parts" rather than "reimplement per repo."
- The **issue template** (`.github/ISSUE_TEMPLATE/feedback.yml`) is per-repo content, but `loom install` can scaffold it — so reuse is still a one-command install elsewhere.

### One improvement (the high-leverage one)

The idea says "carry only Loom version + OS." I'd let the prefilled body **also carry a voluntary, non-PII usage snapshot** derived from `loom://state?shape=summary`: weave count, thread count, done-plan count, current_release. Nothing identifying, user sees and edits it before sending.

Why it matters: version+OS tells you *someone installed*. "I have 3 weaves and 12 done plans" tells you *someone actually completed the loop* — which is the north-star question this whole thread exists to answer. It also naturally bridges to the sibling `telemetry` thread (same summary, but user-initiated instead of passive). This is the single change that most raises the signal-per-message, and it's still fully opt-in and visible.

I'd **defer** the "win-moment inline prompt" to phase 2 — it's the fuzziest part (nag risk) and not needed to start collecting signal.

### Doc recommendation: design + plan, no req

- **Skip req.** The idea already has a "Not this" scope guard + explicit success criteria — that's what a req would capture. For a thread this small, a separate locked req is ceremony.
- **Short design** — worth it, to record the two decisions that aren't obvious: (1) target-repo resolution (git-remote autodetect + config override) and (2) the prefilled snapshot contents. These are the reuse hinge and the signal hinge.
- **Then a plan** — extension command + status-bar item, `loom feedback` CLI, the issue-form template, and `loom install` scaffolding of the template.

### Decisions I need before I generate

1. **Usage snapshot in the prefill — in or out for v1?** (My rec: in — it's the whole point.)
2. **Target-repo resolution — autodetect-from-git-remote + config override, or just a plain config value?** (My rec: autodetect + override; it's what makes it reusable with no per-repo code.)
3. Confirm **design + plan, no req** is the right doc level for you.

Give me `go` (and the two answers) and I'll generate the design first, then the plan.

## Rafa:

Agree your recs
go

## AI:

Written both — `design.md` and `plans/plan-001.md` (both draft). No req, as agreed.

**Design** records the two non-obvious calls: git-remote-autodetect + config override for the target repo (the reuse hinge), and the counts-only usage snapshot in the prefill (the signal hinge). Everything else — core URL builder, fs resolver, app use-case, CLI, extension — ships inside Loom and is repo-agnostic; only the `.github` issue-form template is per-repo, and `loom install` scaffolds it. That's what makes chord-flow/nuget a one-command install, not a code copy.

**Plan (8 steps, bottom-up along the dependency rule):**
1. `core` — `buildFeedbackUrl` + types (pure)
2. `fs` — `resolveFeedbackRepo` (config override → git origin → null)
3. `app` — `getFeedbackContext` (repo + version + os + snapshot + url)
4. `mcp` — `loom://feedback-context` resource
5. `cli` — `loom feedback`
6. `install` — scaffold `.github/ISSUE_TEMPLATE/feedback.yml`
7. `vscode` — command + status-bar item + `feedback.repo` setting
8. `tests` — URL encoding, repo resolution cases, snapshot shape → wire into `test-all`

Steps 2→1, 3→2, 4/5/8→3, 7→4, 6→1. Review the design/plan when you get a chance; say `go` (or *Start Plan*) and I'll begin at step 1. One open flag: **the `environment` field prefill for GitHub issue *forms* uses `?<field_id>=<value>`** — I've assumed that in the design; I'll confirm the exact encoding empirically at step 6 when scaffolding the template.

## Rafa:

I gathered info about github issue forms, you can read here:
`docs/internal/github-issue-forms.md`

I already marked idea, design done
I started plan
do whole plan

## AI:

Whole plan done — all 8 steps ✅, `plan-001` auto-closed to **done**. Build clean, full `test-all` green (incl. the new test + core/vscode import guards + install-workspace), and I drove the real CLI end-to-end.

**What shipped (bottom-up along `core → fs → app → mcp/cli/vscode`):**
- **core** `feedback.ts` — pure `buildFeedbackUrl` + `FeedbackSnapshot`/`FeedbackContext` (simplified to `{ repo, snapshot, url }` — version/OS live in the snapshot, no duplication).
- **fs** `feedbackRepo.ts` — `resolveFeedbackRepo` (override → git `origin` → null) + `parseGitHubRepo` (https/ssh/scp forms). No hardcoded fallback.
- **app** `getFeedbackContext.ts` — assembles the counts-only snapshot from `LoomState` (`currentRelease` reuses `buildRoadmap`), builds the URL.
- **mcp** `loom://feedback-context` resource (accepts `?repo=` for the setting override).
- **cli** `loom feedback` (`--repo`, `--print`; dependency-free browser open).
- **install** scaffolds `.github/ISSUE_TEMPLATE/feedback.yml` once (never clobbered).
- **vscode** `loom.sendFeedback` command + always-visible `$(feedback) Feedback` status-bar item + `reslava-loom.feedback.repo` setting.
- **tests** `tests/user-feedback.test.ts` (incl. a non-PII key-allowlist assertion) wired into `test-all`.

**Live verification:** `loom feedback --print` → resolved `reslava/loom` from the git remote with a real snapshot (11 weaves, 109 threads, 99 done plans, v1.15.0) and a correctly-encoded prefill URL. `--repo reslava/chord-flow` confirmed the override — same command, different target, **zero per-repo code**: that's the reuse story you wanted for chord-flow/nuget, working.

**Two honest caveats:**
1. The **snapshot is a full-`getState` build** (~2 MB on this repo). For the CLI it's fine; if it ever feels slow on a huge repo we can switch to `shape=summary` counts. Not an issue today.
2. I verified the extension's path via the CLI (identical `getFeedbackContext` code) + unit tests, **not** via a live `loom://feedback-context` read — this session's MCP server predates the build, so the new resource only goes live after an MCP/Reload. Worth a quick manual click-test in the extension after you reload.

Nothing is committed — tree is dirty with the new files + docs. Say the word and I'll commit (I'd group it as one feature commit for the validation/user-feedback thread). Deferred by design: the phase-2 win-moment prompt.

## AI:

Committing now as one feature commit for the `validation/user-feedback` thread: the five-package implementation (core URL builder, fs repo resolver, app use-case, MCP resource, CLI command, install scaffold, extension command/status-bar/setting), the new test wired into `test-all`, and this thread's idea/design/plan/done/chat docs. Leaving `validation/telemetry/idea.md` out — that's the separate next thread, not this scope.