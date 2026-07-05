---
type: chat
id: ch_01KWRCAM9W0Q27NDKA9M4G83GQ
title: telemetry setup and release Chat
status: done
created: 2026-07-05
updated: 2026-07-05
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 11
---
# telemetry setup and release Chat

## Rafa:

I create an account in PostHog, free tier, only default project allowed
Here is key:
Project token: `phc_t66fVKCVWmM7fZ586atyAPVi2TzWRava87LmPqSJP2WH`
Project ID: `216219`
Region: `EU Cloud`

Update `esbuild.js` and do necesary stuff to get telemetry working
Should we do a little test before release?

we are shipping validation/telemetry and validation/user-feedback
do-release 1.15.1 or 1.16.0?

## AI:

Good news: the plumbing is already right, and the one real gap is **not** in `esbuild.js`.

**esbuild** — `packages/cli/esbuild.js` already has the `define` that inlines `process.env.LOOM_POSTHOG_KEY` into the shipped bundle. `packages/vscode/esbuild.js` correctly does **not** need it: the extension emits nothing itself — it only spawns `loom mcp` with `LOOM_SURFACE=extension` + `LOOM_TELEMETRY=0/1` (`telemetryConsent.getTelemetryEnv`). The CLI bundle is the *sole* emitter for all three surfaces (agent, cli, extension). So no esbuild edit is needed.

**The actual gap — the release build never sets the key.** In `release.yml`, the build step is `bash scripts/build-all.sh` with no `LOOM_POSTHOG_KEY` in its env, so the shipped npm tarball bakes `''` ⇒ structurally Noop ⇒ nothing ever sends, even for opt-in users. That's the one thing to fix for go-live:

```yaml
- name: Build all packages (canonical build)
  env:
    LOOM_POSTHOG_KEY: ${{ secrets.LOOM_POSTHOG_KEY }}
  run: bash scripts/build-all.sh
```
plus a repo secret `LOOM_POSTHOG_KEY = phc_t66…P2WH`. The token is a PostHog **public, write-only** project key (safe to ship in a client bundle — that's PostHog's model), so the secret is hygiene/optics, not strictly required. Heads-up: you pasted it into this chat, so it'll land in git — harmless given it's write-only, but flagging the new-in-git artifact per convention.

**Test before release — yes, and it's cheap.** Full end-to-end smoke, no release needed:
```
LOOM_POSTHOG_KEY=phc_t66…P2WH ./scripts/build-all.sh
LOOM_TELEMETRY=1 loom status
```
then watch PostHog EU → Activity for a `command_invoked` event with `surface: cli`. That exercises the whole path — key baked → consent gate → fetch → EU ingest — before ~4.3K installs ever see it. Exactly the kind of validation worth doing here.

**1.15.1 vs 1.16.0 → 1.16.0.** Current is 1.15.0, and you're shipping two new *user-facing features* (telemetry + user-feedback). New features = minor bump. 1.15.1 would advertise "bugfix only" and misrepresent the release.

On `go` I'll add the `LOOM_POSTHOG_KEY` env to the release build step, then run the local smoke test to confirm an event lands in PostHog EU — and once that's green, `/do-release 1.16.0`.

## AI:

Wired the key and ran the smoke test. Status:

**1. Release build injects the key.** Added `env: LOOM_POSTHOG_KEY: ${{ secrets.LOOM_POSTHOG_KEY }}` to the `build-all.sh` step in `.github/workflows/release.yml`, with a comment explaining the Noop-if-empty safety and the public/write-only nature of the token. Unset secret still ships a safe inert build.

**2. Local build with the key → verified baked.** `LOOM_POSTHOG_KEY=… ./scripts/build-all.sh` succeeded, and the token string is present exactly once in `packages/cli/dist/index.js` — confirmed inlined by the esbuild `define`, not just read from env.

**3. Fired a real event.** `LOOM_TELEMETRY=1 loom status` → the commander `preAction` hook calls `trackCommandInvoked` (`command_invoked`, `surface: cli`). I traced the flush path to be sound for a one-shot CLI: `program.parse` is synchronous, `status` doesn't hard-exit, so on drain the `beforeExit` handler (`flushOnExit`) runs `flush()` → `POST eu.i.posthog.com/batch/` with a 3s timeout. So the event was sent.

**What I can't do from here:** the `phc_` token is **write-only**, so I can't read events back to prove ingest. That last confirmation is yours:
- **PostHog EU → Activity / Events** — look for `command_invoked` with `surface: cli` in the last few minutes. If it's there, the whole path is green end-to-end.

**Two things need you before we ship:**
1. **Create the repo secret** `LOOM_POSTHOG_KEY = phc_t66…P2WH` (GitHub → Settings → Secrets and variables → Actions). Without it, the released bundle bakes `''` and stays inert.
2. **Confirm the dashboard event** above.

Note on robustness (not a blocker): the one-shot `cli` surface flush leans on `beforeExit`. The two surfaces that actually carry volume — `agent` (the long-lived `loom mcp` server) and `extension` (which routes through that same spawned server) — flush on an interval + SIGTERM, so they're solid. If nothing shows for the `cli` test, start `loom mcp` briefly and check for `workspace_activated` / `session_started` instead.

`release.yml` is edited but **uncommitted** — I'll leave it so you can eyeball it. Next, once you've confirmed the secret is set and the event landed: `go` and I'll commit the workflow change, then `/do-release 1.16.0`.

## AI:

🎉 That's the whole path proven green — `command_invoked` ingested by PostHog EU, live. And note *what* the identity is: `cfb9cb81-c5df-49a7-a8d5-c7d89a0823a0` is the random `install_id` UUID from the user-global store — no username, path, repo, or title anywhere on the event. Exactly the content-free anonymous identity the design promised; the privacy guarantee holds in practice, not just on paper.

So: key baked ✅, consent gate ✅, transport → EU ingest ✅, content-free identity ✅.

**One prerequisite left before shipping — the repo secret.** The local build proved the mechanism, but the *released* npm bundle is built by CI, which reads `secrets.LOOM_POSTHOG_KEY`. Until that secret exists, every published build bakes `''` and stays inert regardless of opt-in.

- GitHub → repo **Settings → Secrets and variables → Actions → New repository secret**
- Name: `LOOM_POSTHOG_KEY`  ·  Value: `phc_t66fVKCVWmM7fZ586atyAPVi2TzWRava87LmPqSJP2WH`

Once that secret is set, say `go` and I'll: commit the `release.yml` change on its own (a `ci:` commit, kept out of the version-bump commit), then `/do-release 1.16.0` to ship telemetry + user-feedback together.

## AI:

Secret confirmed — go. Committing the `release.yml` change as a standalone `ci:` commit (kept out of the version bump), then handing off to `/do-release 1.16.0` to ship telemetry + user-feedback together. The release skill owns the changelog entries, the lockstep version bump across all 7 package.jsons, build+test, the tag, and the publish-workflow monitoring.

Telemetry goes live the moment CI builds with the secret set — the released bundle will bake the key instead of `''`, so opt-in users start sending the content-free loop events we just proved end-to-end.

## AI:

Release-notes review gate for **1.16.0** (minor — two new features, clean bump from 1.15.0). The root section is published verbatim as the GitHub release body, so it gets one read before anything ships.

**Root `CHANGELOG.md` → `[Unreleased]` (rolls into `[1.16.0]`):**

### Added
- **In-tool user feedback — turn silent installs into signal.** A one-click **Send Feedback** button in the VS Code extension and a new `loom feedback` command open a *prefilled* GitHub issue carrying only your Loom version, OS, and a non-PII usage snapshot (document / plan counts) that you review and edit before it's ever sent. No backend, no silent send, no PII. The destination repo isn't hardcoded — it's resolved from your git remote (or a `reslava-loom.feedback.repo` override), so the same command works in any repository where Loom is installed.
- **Opt-in, content-free usage telemetry.** Loom can now report a small, fixed set of workflow events — activation, session start, doc generated / refined, plan started, step completed, plan done, errors, and command invoked — so it's possible to see whether the core loop is actually used and where people stall. It is **off by default** and sends nothing until you explicitly opt in (`reslava-loom.telemetry.enabled` in the extension; `LOOM_TELEMETRY=1` for the CLI / agent). Events are anonymous and content-free *by construction*: a random install id only — never document content, titles, paths, or weave/thread names. A one-time disclosure and a documented kill switch ship with it, and the README lists exactly what is and isn't collected.

**`packages/vscode/CHANGELOG.md` → new `[1.16.0] - 2026-07-05`:** Send Feedback (Added), opt-in telemetry setting + disclosure (Added), lockstep note.

Dropped from notes: docs / chore / roadmap commits (chat logs, `READNE.md` fix, roadmap reflow) — no user-facing change.

On `go`: `bump-version.sh 1.16.0` → `build-all && test-all` → `loom record-release 1.16.0` → commit `release: v1.16.0` → annotated tag → `push --follow-tags` → watch guard → build-test → publish(npm·vsce·ovsx) → release.

## Rafa:

I have doubts. I don't know if you understood me well when I say I would like to use feedback for my other projects,

You said:
>The destination repo isn't hardcoded — it's resolved from your git remote (or a reslava-loom.feedback.repo override), so the same command works in any repository where Loom is installed.

The feedback issue should be always created in this prject Loom repo issues
https://github.com/reslava/loom/issues
for all projects that use Loom, for example, my other project I dev with you Chord Flow
and for all end user projects that instal Loom

What I meant was reusing some code/idea in other projects of mine that do not use Loom, like https://github.com/reslava/nuget-package-reslava-result

I am worried, clarify me what is actual behaviour

## AI:

You caught a real design flaw, and my earlier changelog line was the misleading framing that hid it. Let me be precise about what the code **actually** does today.

**Actual resolution (`packages/fs/src/feedbackRepo.ts` → `resolveFeedbackRepo`):**
```
override (--repo / reslava-loom.feedback.repo)  →  `git remote get-url origin`  →  null
```
There is **no `reslava/loom` default**. The target is whatever the *current project's* git origin is. So:

| Where `loom feedback` runs | Where the issue opens today |
|---|---|
| this repo (`reslava/loom`) | `reslava/loom/issues` ✅ — but *only* because origin happens to be reslava/loom |
| chord-flow | `reslava/chord-flow/issues` ❌ |
| an end user's repo `acme/app` | `acme/app/issues` ❌❌ — and `loom install` even scaffolds a `feedback.yml` form *into their repo* so it prefills there |
| no git remote / no override | errors: "Could not resolve a target repo" |

So the feature as built **scatters feedback into each installing project's own repo** — you'd receive essentially none of it. That defeats the entire premise of the idea doc ("turn ~4.3K blind installs into signal"). This is exactly what you meant it should *not* do.

**Your intent, restated:** every Loom install — chord-flow, end-user `acme/app`, all of them — files into the one central sink `github.com/reslava/loom/issues`. And "reuse in other projects" meant reusing the *code/pattern* in your **non-Loom** projects (e.g. `nuget-package-reslava-result`), where that project would point the mechanism at its own repo. That's the **override's** job — not git-origin auto-detection.

**Clean fix (root cause, not a patch):**
1. Bake a constant default `DEFAULT_FEEDBACK_REPO = 'reslava/loom'` in core. Default routing → the central sink, always.
2. **Remove the git-origin resolution and the null/error path** — that branch *is* the bug; it silently redirects feedback to the wrong repo.
3. Keep `--repo` / `reslava-loom.feedback.repo` as the override, now correctly scoped to the reuse case (a fork or your non-Loom project sets its own sink).
4. **Drop the `loom install` `feedback.yml` scaffold into user repos** — the form only needs to exist in the sink (`reslava/loom`), where it already lives. Scaffolding it into every install was only meaningful under per-repo routing.
5. Rewrite the changelog Added entry — the "resolved from your git remote / works in any repo" line is now wrong; it should say feedback always reaches the Loom project.

**I'm halting the release.** No bump has run; the changelog drafts are still uncommitted. We fix the routing first, re-verify (run `loom feedback` from a non-reslava/loom dir and confirm the URL points at `reslava/loom`), then ship. This is a good catch that would otherwise have shipped a feature that quietly collected nothing.

Want me to make this a small plan under the feedback thread, or just fix it directly since it's a tight, well-scoped change?

## Rafa:

fix it
verify there is no same repo issue in telemetry
then continue release

## AI:

Fixed, verified, and telemetry checked. Details:

**Feedback routing — fixed at the root.** Replaced the git-origin resolution with a central sink:
- `packages/core/feedback.ts` — new `DEFAULT_FEEDBACK_REPO = 'reslava/loom'` + a pure `resolveFeedbackRepo(override?) → override ?? sink`. `FeedbackContext.repo`/`url` are now always non-null.
- **Deleted `packages/fs/feedbackRepo.ts`** (the `git remote get-url origin` logic + `parseGitHubRepo`) — that branch *was* the bug. Resolution is now pure, so it's called directly in `getFeedbackContext`, not injected.
- Dropped the null/error paths in the CLI + extension (a repo always resolves now).
- **Removed the `loom install` `feedback.yml` scaffold** into user repos — the form only needs to live in the sink (this repo), where it already does. Every install writing a dead form into `.github/ISSUE_TEMPLATE/` was only meaningful under per-repo routing.
- Updated the `--repo` help, the `reslava-loom.feedback.repo` description, both READMEs, the extension guide, and the changelog to the correct framing: *feedback reaches the Loom project; the override is for reuse in a fork / non-Loom tool.*
- Rewrote `tests/user-feedback.test.ts` — the key assertion is now "no override → `reslava/loom`, regardless of git remote."

**Live proof** (the exact case you were worried about): from `J:/src/chord-flow` (git origin `reslava/chord-flow`), `loom feedback --print` now resolves to:
```
Repo:  reslava/loom
https://github.com/reslava/loom/issues/new?template=feedback.yml&environment=...
```
Before the fix that URL pointed at `reslava/chord-flow`. And `--repo reslava/chord-flow` still redirects correctly (reuse branch intact). Full `test-all` green.

**Telemetry — checked for the same class of bug: none.** Telemetry is centrally routed *and* content-free by construction:
- Endpoint is a fixed constant (`eu.i.posthog.com`), project key is the baked constant — neither depends on the current repo.
- `install_id` is a random UUID in a **user-global** store (`%APPDATA%`/`~/.config`), not per-repo — that's the correct central-aggregation identity, the very thing feedback was missing.
- Common props are `surface`, `loom_version`, `os`, `is_ci` only — no repo name, path, slug, or title anywhere. The 9 events carry enums/counts/bools.

So telemetry already does what feedback now does: every install reports to one place, carrying no project identity.

Continuing the release now — the feedback changelog line reads: *"Feedback always reaches the Loom project regardless of which project you're in … `reslava-loom.feedback.repo` / `--repo` can redirect it elsewhere."* Proceeding through bump 1.16.0 → build/test → record-release → commit → tag → push.

## AI:

That's correct and by design — there's nothing to see yet because **feedback never auto-creates an issue**. `loom feedback` (and the extension's Send Feedback button) only *open a prefilled "New issue" form* in your browser; the issue exists only after **you** review it and click **"Submit new issue"**. Nothing is filed in the background — that's the whole "no backend, no silent send" guarantee.

And my verification runs used `--print`, which just prints the URL text and opens nothing at all — so they definitely created no issue. What they proved is only that the URL now targets `reslava/loom` instead of the current repo.

Don't confuse this with the telemetry check earlier: telemetry *did* land in PostHog because, once opted in, it sends automatically. Feedback is the opposite — explicit, human-submitted, one click you control.

If you want to see one actually land in the issues list, either:
- run `loom feedback` (no `--print`) — it opens the prefilled draft in your browser; click Submit; or
- open the printed URL yourself and submit it.

I can't submit it for you — it needs your GitHub session and your click, which is exactly the point.

I've **paused the release** here (no bump/tag yet) since you're mid-verification. Want to file one real test issue first to see the round trip, or should I go ahead and continue the release?

## AI:

Continuing the release. Committing the feedback fix on its own (`fix(feedback):`), then the bump → build/test → record-release → `release: v1.16.0` → annotated tag → push, and I'll watch the publish workflow through to npm + Marketplace + Open VSX.