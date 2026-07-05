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
last_ai_block: 4
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