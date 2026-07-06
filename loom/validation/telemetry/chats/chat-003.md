---
type: chat
id: ch_01KWVYKRHFC2447BJJ1H18CNE0
title: telemetry check and fix
status: done
created: 2026-07-06
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 22
---
# telemetry check and fix

## Rafa:

when we shipped this it was working and events showed in PostHog
but I continued working in Chord Flow with telemetry On and no more events has arrived PostHog since 1 day ago
Reslava-loom › Telemetry: Enabled in vscode settings
check env variable LOOM_TELEMETRY, i think is empty
is LOOM_POSTHOG_KEY being used in new local loom builds? or just with github actions?

check why is not working now, at least my own loom usage should showed up

give me a simple way to:
- check this for my own 
- send a simple event to PostHog

via bash commands or better option you recommend

## AI:

Confirmed the root cause against your **live** global binary — not a guess. Two independent gates must both pass for an event to send (`resolveConsent` in `packages/telemetry/src/consent.ts` → `enabled === true && !!apiKey`). Your consent gate is fine; the **key gate is failing**.

## Root cause: your local build clobbered the keyed release binary

The PostHog key is baked into the CLI bundle **only at release time** by GitHub Actions. In `.github/workflows/release.yml` the build step sets `env: LOOM_POSTHOG_KEY: ${{ secrets.LOOM_POSTHOG_KEY }}` before `build-all.sh`. That value flows into `packages/cli/esbuild.js`, which inlines it:

```js
define: { 'process.env.LOOM_POSTHOG_KEY': JSON.stringify(process.env.LOOM_POSTHOG_KEY || '') }
```

**`scripts/build-all.sh` never sets that env var.** So every local `build-all.sh`:
1. runs `node esbuild.js` with `LOOM_POSTHOG_KEY` unset → the define collapses to `""`, so `var POSTHOG_KEY = ""` in the bundle;
2. then line 45 runs **`npm link --force`** — which overwrites your *global* `loom` (the released, keyed one) with this fresh key-less one.

I read the actual live bundle Chord Flow spawns:

```
C:\Users\Rafa\AppData\Roaming\npm\node_modules\@reslava\loom\dist\index.js
  L30369: var POSTHOG_KEY = "";
  L30376: apiKey: POSTHOG_KEY || void 0,
  occurrences of "phc_" in the whole bundle: 0
```

So `apiKey` is `undefined` → `createTelemetry` returns `NoopTelemetry` → **nothing sends, silently**, no matter that telemetry is enabled. It "worked when we shipped" because you were running the released npm/vsix build (keyed). It stopped ~1 day ago because that's when you last ran `build-all.sh` here in the loom repo — `npm link --force` swapped the global `loom` for a key-less dev build. Chord Flow's extension spawns that global `loom mcp`, so it went dark too.

## Your three questions, directly

1. **Is `LOOM_TELEMETRY` empty?** — Not the problem on your path. You don't set it as a shell var; the extension injects `LOOM_TELEMETRY=1` into the spawned `loom mcp` when `reslava-loom.telemetry.enabled` is true (`packages/vscode/src/telemetryConsent.ts` → `getTelemetryEnv`). You've confirmed the setting is on, so the **consent gate passes**. (A bare terminal `loom` with the var unset *would* be Noop — but that's not what Chord Flow uses.)
2. **Is `LOOM_POSTHOG_KEY` used in local builds, or only GitHub Actions?** — **Only GitHub Actions.** `build-all.sh` never sets it. Local builds always bake `""` → always Noop. This is the bug.
3. **Why not working now** — a local `build-all.sh` re-linked your global `loom` to a key-less bundle. Both gates need to pass; the key gate is silently failing.

## Simple way to check your own usage (no build)

One line tells you whether your global `loom` can send at all:

```powershell
Select-String -Path "$(npm prefix -g)\node_modules\@reslava\loom\dist\index.js" -Pattern 'var POSTHOG_KEY'
```

- `var POSTHOG_KEY = "phc_...";` → keyed, can send.
- `var POSTHOG_KEY = "";` → **Noop**, will never send (your current state).

## Simple way to send a test event to PostHog (no build, pure HTTP)

The transport is just a `fetch` POST to `https://eu.i.posthog.com/batch/` (see `packages/telemetry/src/posthog.ts`). You can hit it directly. Put your project key in the env first so it never lands in the repo or this chat (it's your `LOOM_POSTHOG_KEY` GitHub secret / PostHog → Project Settings → Project API Key, the `phc_...` write key):

```powershell
$env:LOOM_POSTHOG_KEY = "phc_your_key_here"
$body = @{
  api_key = $env:LOOM_POSTHOG_KEY
  batch = @(@{
    event = "loom_telemetry_test"
    properties = @{ distinct_id = "rafa-manual-test"; source = "manual-curl" }
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
  })
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri "https://eu.i.posthog.com/batch/" -ContentType "application/json" -Body $body
```

bash-tool equivalent:

```bash
curl -sS https://eu.i.posthog.com/batch/ -H 'Content-Type: application/json' \
  -d "{\"api_key\":\"$LOOM_POSTHOG_KEY\",\"batch\":[{\"event\":\"loom_telemetry_test\",\"properties\":{\"distinct_id\":\"rafa-manual-test\",\"source\":\"manual-curl\"},\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}"
```

A `{"status":1}` (or `1`) back means PostHog accepted it — look for `loom_telemetry_test` under distinct_id `rafa-manual-test` in Activity (ingestion can lag a minute or two). If that arrives, your PostHog project + key are healthy and the **only** issue is the key-less global binary.

## Design decision to flag before I change anything

The clean fix to the bug itself is small and I'm confident: **make `build-all.sh` pass `LOOM_POSTHOG_KEY` through to esbuild** (it already flows if the env var is set — the define reads `process.env.LOOM_POSTHOG_KEY`). But *whether* your everyday local build should carry the **production** key is a real decision, because it changes what your dev activity does to prod data:

- **A — build-all bakes the prod key when present in your env.** One line; your own loom/Chord-Flow usage sends real events again immediately. **Cost:** all your local dev + test churn now pollutes the prod PostHog project (you'd rely on the `is_ci`/surface filters, which don't separate "Rafa developing Loom" from "real user").
- **B — separate dev PostHog project for local builds.** `build-all.sh` bakes a *dev* key (or reads `LOOM_POSTHOG_KEY_DEV`). Prod stays clean; you still get end-to-end validation. **Cost:** a second PostHog project + one more secret to manage.
- **C — leave build-all key-less; validate only via the HTTP test above + trust the release path.** Zero prod pollution, zero code change. **Cost:** you can never dogfa-test the *real* baked-in telemetry from your own primary install — exactly the gap that just bit you for a day silently.

There's also a **latent third problem** worth naming regardless of A/B/C: this failure was **completely silent**. Nothing anywhere says "telemetry is enabled but running Noop because no key was baked in." A one-line stderr notice when `LOOM_TELEMETRY` is truthy but `apiKey` is empty would have turned a day of lost data into an obvious warning. I'd suggest adding that no matter which option you pick.

My recommendation: **B for the build + the silent-Noop warning**, so your own install validates the real path without contaminating prod. But this is your data-hygiene call — tell me which and I'll implement it (and if you want, I'll open a plan for it in this thread).

**Next:** run the two checks above to confirm the live state, then tell me A / B / C (+ whether to add the silent-Noop warning) and I'll implement.

## Rafa:

### Fix

Do this: add the silent-Noop warning

I would like B but PostHog free tire now admit only 1 project, so If I want to see my own loom use telemetry, we only have option A.
What means `is_ci`/surface filters?
My proposal:
- i can create a PostHog filter with my person random ID when I want to exclude myself form telemetry data. We could use a special person ID for my own projects, like `Loom-tests`
- i can also set telemetry off when I dont want to send my own events

What do you think?


### Side loom question

in terminal CLI you said:
```
Everything's confirmed. Let me load the thread's context docs (first reply in this thread this session), then write the diagnosis into the chat.

  Searched for 1 pattern, read 2 files

📡 MCP: loom://context/ch_01KWVYKRHFC2447BJJ1H18CNE0?mode=chat
📄 idea.md — loaded for context
📄 design.md — loaded for context
📄 plan-001.md — done (no active plan)
```

so you found the root cause before load the thread context and anyway you loaded it before reply
- why you did not load thread context at the beginning? maybe could be helpful at that moment
- why you load thread context after bug root cause has been already found? due to CLAUDE contract? anyway if you resolved the problem you don't need the extra context

maybe we can improve loom workflow with this behaviour

## AI:

### Fix

Agreed on **A** (the 1-project limit forces it) and on the silent-Noop warning. Your id-filter instinct is exactly right — let me sharpen it and answer the `is_ci`/`surface` question, because it's the crux of *why* you need it.

**What `is_ci` / `surface` actually are (and why neither identifies you):**
- `surface` = the entry point, one of `extension | cli | agent` (`packages/telemetry/src/props.ts` → `buildCommonProps`). It tells you *which path* fired an event, not *who*. Your Chord-Flow usage tags `extension`/`agent` — identical to any real user.
- `is_ci` = a boolean from `detectCI` — true only when a known CI env flag is set (`CI`, `GITHUB_ACTIONS`, …). Your normal local dev is **not** CI, so `is_ci` is `false` for you, same as a real user.

So with what's sent today you **cannot** separate "Rafa developing" from "a real user." Your instinct — give yourself a stable personal id and filter on it — is the correct and only clean mechanism. Here's the reality of the current id:

Your `distinct_id` **is** the `install_id`: a random UUID minted once by `getOrCreateInstallId` and stored at `%APPDATA%\loom\telemetry.json`. Random ⇒ you can't recognize yourself in PostHog to filter. To fix that, pin it to a known value like `loom-dev`. Two ways:

- **Zero-code (works today):** edit `%APPDATA%\loom\telemetry.json` → `{"installId":"loom-dev"}`. Per-machine, manual, but instant. `getOrCreateInstallId` only regenerates when the value is missing/invalid, so a hand-set value sticks.
- **Clean (small code):** add a `LOOM_INSTALL_ID` env override in `getOrCreateInstallId` — if set, use it verbatim and skip the file; thread `env` into the call and have the extension's `getTelemetryEnv` pass it through. Durable, works across machines/CI, self-documenting, and composes with A: you set `LOOM_POSTHOG_KEY` + `LOOM_INSTALL_ID` **once** as persistent user env vars and never think about it again. Extra cost: ~3 tiny edits (identity.ts, telemetryConfig.ts thread-through, telemetryConsent.ts).

I recommend the **env-override**. It's the correct-path version of your idea and it's a legitimately useful feature for *any* self-hosting user who wants to exclude themselves — not a Rafa-only hack.

**On exclude vs. keep — one push-back worth stating plainly:** don't hard-exclude yourself. Right now your Chord-Flow dogfooding is your **only** real end-to-end signal — zero other users. So *tag* it with the stable id and build a PostHog **cohort** (`distinct_id = loom-dev`) that you toggle: exclude it from "real adoption" numbers, but **keep** it for "does the loop actually work / where does it stall" validation. That's strictly more information than turning telemetry off, and it's set-and-forget. Keep the manual off-switch for when you genuinely want silence, but don't make it the primary mechanism — it's easy to forget in both directions (forget to turn off = pollute; forget to turn back on = lose data).

**Operational note on A:** every `build-all.sh` will silently go key-less again unless `LOOM_POSTHOG_KEY` is in the env at build time (esbuild already reads it — **no build-all code change needed for A**, you just need the var set). Set it as a **persistent user env var**, not a per-shell one. And the silent-Noop warning is your safety net for the day you forget.

**Where the warning lives:** at the host composition root — `buildServerTelemetry` / `buildCliTelemetry` in `packages/mcp/src/telemetryConfig.ts` — emit one stderr line when `consentFromEnv(env)` is true **but** the baked key is empty: *"⚠ Loom telemetry is ON but this build has no PostHog key baked in — events will not send (rebuild with LOOM_POSTHOG_KEY set)."* Deliberately **not** in `packages/telemetry` — that package is silent by design (never touches stderr); the host owns user-facing messaging.

**Proposed change set (small, one commit):**
1. Silent-Noop stderr warning in `buildServerTelemetry` + `buildCliTelemetry`.
2. `LOOM_INSTALL_ID` env override in `getOrCreateInstallId` + pass-through in the extension's `getTelemetryEnv`.
3. No code change for A — I'll just give you the exact persistent-env-var commands. (Optional nicety: have `build-all.sh` print `🔑 PostHog key: present/absent` each build so key-less builds are obvious.)

One thing to confirm before I write code: **id via env-override (#2) or the zero-code file edit?** I lean env-override. Say the word and I'll implement 1+2 (+ the optional build-all echo) as one commit, then hand you the setup commands and a test run.

### Side loom question (honest)

Good catch — and worth unpacking, because you've spotted a real seam in the workflow rule.

**Why I didn't load thread context at the start:** your first turn was a *pointed* "read this chat." I did the session-start reads (ctx / vision / workflow) and then went straight at the question. The question was *"why did telemetry stop sending?"* — a live-systems question whose answer lives in **code + the running binary**, not in the thread's idea/design. Those docs describe *what telemetry should be*, not *why it broke*. So skipping them up front was the right instinct, not a miss: they'd have cost tokens and pointed nowhere near the bug (which was a build-script env var + `npm link --force`).

**Why I loaded them before replying anyway:** two reasons — one legitimate, one ceremony, and I'll own the split. Legitimate: replying *into* a thread chat, I wanted to frame the answer in the thread's own language (the two-gate consent model, the `is_ci`/`surface` design intent, the "dogfooding" framing) and make sure I wasn't contradicting a locked decision in the design doc. Ceremony: the CLAUDE chat-reply rule says *"first reply in a thread → load thread context,"* so I'd have loaded them regardless of need. Honest read: here they added **framing**, not **root-cause** — I'd already found the bug.

**The seam you found:** the rule triggers on *"first reply in this thread,"* not on *"does this reply actually need the design?"* For a debugging/systems question the design docs are framing, not answer-bearing. The rule optimizes for the **common** case (continuing a design conversation, where the docs *are* load-bearing) and it guards a real failure — replying into a thread while ignorant of its locked decisions. That determinism is a feature: "let the AI decide when to load" quietly reintroduces "the AI forgot the context" bugs.

**Concrete improvement worth considering:** move from *load-by-trigger* to *load-by-need with a safety floor*. Let the reply **declare its mode** — e.g. "answering from code; thread-design not load-bearing" — and defer the framing read, **but** keep a hard rule that any *design proposal* must load the design first (this already exists in spirit as the vision-check gate). Net: drop the ceremony on pure debugging/systems answers, keep the determinism exactly where it matters (design). That's a rule refinement, not a code change — it'd live in the chat-reply context-injection section of the contract. If you like it, it's its own tiny thread (a CLAUDE.md + `LOOM_CLAUDE_MD` template edit, machine-synced).

**Next:** confirm id via env-override vs. file edit, and I'll implement the change set (warning + `LOOM_INSTALL_ID`) in one commit; separately, say if you want me to open a thread for the load-by-need workflow refinement.

## Rafa:

id via env-override 
spin up a thread, idea for the load-by-need workflow refinement

## AI:

Done — both tasks. Build + full suite green (18/18 test groups, incl. a new `LOOM_INSTALL_ID` case).

### Code (the change set)

Landed exactly the agreed scope — `packages/**` only, nothing in `loom/**`:

1. **`LOOM_INSTALL_ID` env override** — `packages/telemetry/src/identity.ts`. `getOrCreateInstallId` now takes `env` and, if `LOOM_INSTALL_ID` is set (non-blank), returns it **verbatim** and leaves the persisted store untouched. Blank/whitespace falls through to the normal random UUID. Wired `config.env` through in `posthog.ts` so the client honours it.
   - **No vscode change needed:** the extension spawns `loom mcp` with `{ ...process.env, ... }` (`mcp-client.ts:60`), so a persistent user env var flows into the server automatically.
2. **Silent-Noop warning** — `packages/mcp/src/telemetryConfig.ts`. `buildServerTelemetry` + `buildCliTelemetry` now emit one stderr line when `LOOM_TELEMETRY` is truthy **but** the baked key is empty: *"⚠ Loom telemetry is ON but this build has no PostHog key baked in — events will NOT send…"*. Kept at the host layer; `packages/telemetry` stays silent by design.
3. **Test** — `tests/telemetry.test.ts` gained a `LOOM_INSTALL_ID override` block (verbatim id + store-untouched + blank-falls-through).

### The doc (task 2)

New thread **`ai-integration/context-load-by-need`** (`th_01KWW4QXB7MR5ESMXKTTAWNBVV`, priority 90) with idea **"Load thread context by need, not by trigger, on chat reply"** (`id_01KWW4S1BHFEBWFH84KVYAYKD9`, draft). It captures the seam you spotted: shift the chat-reply rule from *load-by-trigger* to *load-by-need with a design-proposal floor*, using this very chat as the worked example. Placed it in `ai-integration` next to `context-injection` / `context-pipeline` / `session-start`.

### One thing you must do for A to actually take effect

⚠️ Heads-up: the `build-all.sh` I just ran **re-linked a key-less global `loom` again** (I don't have the key in my env) — so right now your global binary is still Noop. To turn A on, set both as **persistent user env vars** (once), then rebuild from a fresh shell so esbuild bakes them:

```powershell
[Environment]::SetEnvironmentVariable('LOOM_POSTHOG_KEY', 'phc_your_key_here', 'User')
[Environment]::SetEnvironmentVariable('LOOM_INSTALL_ID', 'loom-dev', 'User')
# open a NEW PowerShell (persistent vars only load in fresh shells), then:
./scripts/build-all.sh
# verify the key baked in:
Select-String -Path "$(npm prefix -g)\node_modules\@reslava\loom\dist\index.js" -Pattern 'var POSTHOG_KEY'
```

That should now print `var POSTHOG_KEY = "phc_...";`. From then on your loom/Chord-Flow events send, all tagged `distinct_id = loom-dev` — build a PostHog cohort on that to exclude yourself from adoption numbers while keeping the data for loop validation. And reload the Chord-Flow VS Code window so its extension respawns `loom mcp` off the freshly keyed binary.

Two optional follow-ups I did **not** do (didn't want to widen scope without a nod):
- Have `build-all.sh` print `🔑 PostHog key: present/absent` on every build — cheap, and it makes key-less builds obvious at a glance (directly serves the "never silently key-less again" goal).
- Commit. Tree is currently dirty with: the two telemetry/mcp code files + test, and the new thread/idea docs. Nothing is committed yet.

**Next:** run the setup above and confirm the check prints a real key; tell me if you want the `build-all.sh` key echo and/or a commit (and how to split it — code vs the new idea thread).

## Rafa:

Do this: `build-all.sh` print `🔑 PostHog key: present/absent` on every build

### Issues

I ran this in a powrshell terminal:
[Environment]::SetEnvironmentVariable('LOOM_POSTHOG_KEY', 'phc_t66fVK...SJP2WH', 'User')
[Environment]::SetEnvironmentVariable('LOOM_INSTALL_ID', 'loom-dev', 'User')
is correct? do i need to chage 'User' also?

then 
I opened a NEW PowerShell :
but this `./scripts/build-all.sh` bash script and do not run in powershell

i build in a bash terminal, but
I verify the key baked in Powershell:
Select-String -Path "$(npm prefix -g)\node_modules\@reslava\loom\dist\index.js" -Pattern 'var POSTHOG_KEY'

and is empty
do not commit yet

### How to verify shipped Loom telemetry is working?

CLI surface: npm install -g @reslava/loom. How enable telemetry for CLI?
Extension: install last VSIX from Marketplace and activate telemetry and use loom. Correct?

## AI:

Done — `build-all.sh` now prints `🔑 PostHog key: present/absent` right after the esbuild step (verified: it prints "absent" in my key-less env). That line is your permanent early-warning: if a build says "absent," the env var didn't reach it.

### Why your bake came out empty (env-var inheritance gotcha)

Your commands are **correct** — keep `'User'` (that's the persistence scope: persist for your Windows user; don't change it). `'Machine'` would need admin and isn't needed; `'Process'` wouldn't persist at all. So the vars *are* set correctly in the registry.

The problem is **when** processes read them. A process inherits its environment from its **parent at launch time**. `SetEnvironmentVariable(..., 'User')` writes to the registry, but any already-running app — VS Code, Windows Terminal — captured its environment block when *it* started, before the var existed. Opening a *new tab* in that already-running app gives you a shell that inherits the app's **stale** env, not the updated registry. That's why your build bash still had an empty `LOOM_POSTHOG_KEY` and esbuild baked `""`.

Prove it in one line — in the **same bash terminal you build from**:
```bash
echo "$LOOM_POSTHOG_KEY"
```
Empty ⇒ that shell can't bake the key (mine was empty too, above). Two fixes:

**Fastest, guaranteed — export inline in the build shell:**
```bash
export LOOM_POSTHOG_KEY='phc_...your_full_key...'
export LOOM_INSTALL_ID='loom-dev'
./scripts/build-all.sh          # now prints 🔑 PostHog key: present
Select-String -Path "$(npm prefix -g)\node_modules\@reslava\loom\dist\index.js" -Pattern 'var POSTHOG_KEY'   # in PowerShell → phc_...
```
This sidesteps the registry/parent-process timing entirely.

**Persistent — but you must FULLY restart the parent app:** quit VS Code (or Windows Terminal) **completely** and relaunch it — not just a new tab. Then every child terminal it spawns inherits the new User vars, and `./scripts/build-all.sh` bakes the key with no inline export. The persistent User var matters for one more reason: it's also how `LOOM_INSTALL_ID` reaches the extension-spawned `loom mcp` **at runtime** (the extension passes `...process.env`), so for the *extension* path you need the User var + a full VS Code restart regardless.

TL;DR: inline `export` for a quick keyed build now; persistent User var + full VS Code restart for the extension to send tagged events during normal use.

### How to verify shipped Loom telemetry

Key fact: the **published** artifacts (npm + Marketplace VSIX) were built by `release.yml` with the `LOOM_POSTHOG_KEY` secret, so they're **keyed**. Your *local* build is the only key-less one. Two ways to verify:

**Extension (recommended — matches real usage):** install the latest from the Marketplace (or the release `.vsix`), toggle **Telemetry: On** in the status bar, then actually use Loom — generate/refine a doc, do a step, run commands. Those fire through the spawned `loom mcp`, which is keyed in the shipped build. Events land in PostHog (allow a minute for ingest). If you set `LOOM_INSTALL_ID=loom-dev` persistently first, they're tagged `loom-dev`. **This is the correct end-to-end check.**

**CLI/agent:** `npm install -g @reslava/loom` pulls the keyed release build — **note this overwrites your dev `npm link`**, so to get back to development you just re-run `./scripts/build-all.sh` (it re-links). Then enable with `LOOM_TELEMETRY=1` (env var; the CLI shows a one-time notice). The server emits `workspace_activated` + `session_started` **when an MCP host connects to it** — i.e. when Claude Code (or the extension) drives `loom mcp`. Running `loom mcp` bare just waits for a client, so the realistic CLI/agent check is "point Claude Code at it and do something," which is the same event path as the extension. For a pure "does PostHog receive" smoke test with zero install churn, the direct `curl`/`Invoke-RestMethod` from earlier still stands.

Verify any binary is keyed with the same check:
```powershell
Select-String -Path "$(npm prefix -g)\node_modules\@reslava\loom\dist\index.js" -Pattern 'var POSTHOG_KEY'
```
`phc_...` = keyed (shipped), `""` = key-less (your local dev link).

Not committing — tree stays dirty as-is (telemetry/mcp code + test, `build-all.sh` echo, and the new `context-load-by-need` idea thread).

**Next:** do the inline-export build (or full VS Code restart), confirm the check prints `phc_...`, then use the extension with telemetry On and watch for `loom-dev` events in PostHog. Tell me when you want the commit and how to split it.

## Rafa:

Check prints phc_...
Build showed: 🔑 PostHog key: present — telemetry can send
But i create a design via extension and no event reach PostHog
note: I think creating chat doc not fire an event and I would like include them

## AI:

Good — keyed build confirmed. The missing event is **not** a build problem now; it's an architecture gap I can prove from the code. There are **two layers**, and both bite the design-generate case.

## Why "generate design via extension" sent nothing

**Layer 1 — the doc is written by a *different* MCP server than the one you consented.** When Claude CLI is installed (your case), the extension's "generate/promote design" doesn't create the doc itself — `promoteToDesignCommand` calls `launchClaude()` (`packages/vscode/src/commands/promoteToDesign.ts:34`), which opens a **VS Code terminal** and runs `claude "$(cat prompt)"`. That launched Claude agent creates the design by calling `loom_create_design` through **its own** `loom mcp` — the one Claude Code spawns from `.mcp.json` — **not** the extension's spawned server.

Now the consent path: `LOOM_TELEMETRY=1` is injected **only** into the extension's own server (`mcp-client.ts:60` → `getTelemetryEnv()`). `launchClaude` creates its terminal with **no telemetry env** (`claudeTerminal.ts:33` — plain `createTerminal({ name, cwd })`). So Claude Code's `loom mcp` inherits only your ambient environment — where you set `LOOM_POSTHOG_KEY` and `LOOM_INSTALL_ID` **but not `LOOM_TELEMETRY`**. Result on the agent's server: keyed binary ✅, but `consentFromEnv` = **false** → `NoopTelemetry` → `loom_create_design` fires `command_invoked` + `doc_generated` into a **no-op**. Nothing sent.

**Layer 2 — stale extension server.** Your *extension's own* `loom mcp` (which does have `LOOM_TELEMETRY=1`) was spawned before your keyed rebuild, so until you **Reload Window** it's still the old key-less binary — its `session_started`/`workspace_activated` also go nowhere. (This is the "MCP server stale after build" trap.)

**Quick isolation test:** Reload the VS Code window, then check PostHog for `session_started` / `workspace_activated`. If those appear but `doc_generated` still doesn't → that's Layer 1 (the agent server) confirmed.

## Make *your* usage send now

1. Add the consent var persistently (you only set key + id so far):
   ```powershell
   [Environment]::SetEnvironmentVariable('LOOM_TELEMETRY', '1', 'User')
   ```
2. **Fully quit and relaunch VS Code** (not just Reload Window — a full restart so both the extension's server *and* any Claude terminals inherit the new ambient `LOOM_TELEMETRY`, and the extension respawns off the keyed binary).
3. Generate a design again → you should now get `command_invoked` + `doc_generated{design}`, tagged `distinct_id = loom-dev`.

## The real design gap (needs your call — this affects shipped behaviour)

Step 1 above is a workaround *for you*. A normal user who just flips the extension's **"Telemetry: On"** toggle gets a **false sense of consent**: the toggle governs the extension's own server, but the **primary AI path — every generate/refine/do-step, the highest-value loop events — runs on the launched Claude agent's server, which the toggle never reaches.** So shipped telemetry is largely **blind to the primary AI path** unless the user independently exports `LOOM_TELEMETRY=1`. That's both a data gap and a consent-integrity issue (we'd be *under*-collecting, which is the safe direction, but the toggle is misleading).

**Proposed fix (A):** have `launchClaude` create its terminal with `env: { ...getTelemetryEnv() }` — so the extension's consent + surface tag flow into the launched agent's `loom mcp`. Then the UI toggle actually governs the work the UI triggers. `createTerminal` supports an `env` option, so it's a small, contained change in `claudeTerminal.ts` (+ pass `getTelemetryEnv()` in). One wrinkle to decide: tag those events `surface: extension` (the button the user pressed) vs `agent` (the process doing the work) — I lean `extension`, since consent and intent both came from the extension.

I recommend A. It's the correct fix — it closes the gap for every user, not just you. **Stopping here for your go before I touch extension code**, since it changes shipped telemetry behaviour.

## Chat events (your note)

Two facts: chat creation **already** emits `command_invoked{command:"loom_create_chat"}` today (every tool does, via the dispatcher seam) — but only on a **consented** server, so you didn't see it for the same Layer-1 reason. What it does *not* have is a **first-class** event.

Since chat is the **entry of the loop** (`chat → generate → …`), a dedicated event answers a question the current taxonomy can't: *"is the thinking surface actually used?"* Proposal: add **`chat_created`** to the taxonomy, mapped from `loom_create_chat` only — **not** `loom_append_to_chat` (replies are high-volume and would swamp the signal; creation is the meaningful unit). Content-free, one enum-less event. This is a taxonomy addition (the design fixed a "small set"), so I want your nod before adding it, and it should update the telemetry design doc's event table in the same change.

**Next — two decisions for you:**
1. Implement fix **A** (propagate extension consent into the launched Claude agent)? (recommended)
2. Add **`chat_created`** as a first-class event (on create only)?
Say go on either/both and I'll implement + rebuild + test; then we can decide the commit split. Meanwhile, do the 3-step "make your usage send now" and tell me if `doc_generated` shows up.

## Rafa:

these events showed up from my extension test:
event command_invoked, command loom_create_design
event doc_generated, type design
event command_invoked, command loom_create_chat

1. Do fix A
2. Add chat_created on create only

Why are we having this issues with extension, cli surfaces? We talked about using app layer meeting point to fire events

## AI:

Both done — build green, full suite 18/18.

- **Fix A** — `claudeTerminal.ts`: the launched Claude terminal is now created with `env: getTelemetryEnv()`, so the extension's consent + `surface: extension` flow into the agent's `loom mcp`. One change at the single `launchClaude` choke point covers every AI button (generate/refine/promote/do-step).
- **`chat_created`** — new taxonomy helper (`app/.../events.ts`), mapped from `loom_create_chat` only in the dispatcher (not `loom_append_to_chat`). Test asserts create→`chat_created` and append→`command_invoked`-only. Design doc event table updated to row 10 + the funnel now reads `chat_created → doc_generated → …`.
- **Bonus finding:** the pre-existing "install id persisted" test broke during this build — because your persistent `LOOM_INSTALL_ID=loom-dev` **leaked into my build shell** (the build even printed `🔑 PostHog key: present` — your key reached my env too). The test read the runner's `process.env`, so the override correctly skipped the store and the assert failed. Fixed it to be **hermetic** (explicit empty env) — telemetry tests must never depend on the runner's `LOOM_*`. Real latent bug your setup surfaced.

### Why the surfaces are an issue when "app is the single meeting point"

Great question — and the short answer is: **a single meeting point in the *code* is not a single meeting point at *runtime*.**

The design said all surfaces converge on one choke point, and that's true *topologically* — every surface calls the same use-cases (and we actually put the emit one level out, at the MCP `CallTool` dispatcher seam, decision B: even more central for tool calls — one wrapper instead of instrumenting each use-case). That part works exactly as intended.

The catch is what "convergence" means at runtime. `app` (and the MCP server) is a **library instantiated per-process**, not one shared running service. When you use Loom via the extension's AI buttons, there are **two `loom mcp` processes alive at once**:
- the **extension's** server (spawned by `mcp-client.ts`, used for tree/reads), and
- the **agent's** server (spawned by Claude Code from `.mcp.json` when `launchClaude` fires) — this is the one that actually *creates the docs*.

Each process builds its **own** telemetry client from **its own** environment and resolves consent independently. So the "single choke point" fires in *whichever process handled the call* — and the doc-creating calls happen in the *agent's* process. Two things then had to be true in *that* process:
- **Key** — ✅ automatic: it's baked into the binary, so every process that runs `loom` has it.
- **Consent** — ❌ was the gap: it travels by **env var**, which is per-process and must be *propagated* to each. The extension seeded consent into its *own* server's env only, never the agent's. That's the whole bug. Fix A propagates it.

So it was never a flaw in the choke-point idea — it's that **consent/identity is process-scoped, and there are multiple processes.** The code funnel is one line; the runtime has N servers.

### The cleaner end-state (deliberately deferred — telling you, not silently patching)

The truly DRY fix would remove env-plumbing entirely: resolve consent from a **shared source every loom process reads** — a persisted consent flag in the user-global config dir, exactly like `install_id` already lives there. Then the extension toggle (or a `loom telemetry on` command) writes one file, and *any* `loom mcp` — the extension's, the agent's, or one spawned by Cursor/Continue/any MCP host — reads the same consent with **zero env propagation**. That also matches the vision ("any MCP-capable agent").

I did **not** build that, on purpose: it's more machinery for a product with ~zero users, and Fix A already closes the *observed* gap DRY-ly at the one `launchClaude` choke point. The shared-consent-file only earns its keep once non-extension hosts (Cursor et al.) are real. I recorded this trade-off and the "code-choke-point ≠ runtime-meeting-point" lesson in the telemetry **design doc** (new "Cross-process consent" note) so it isn't lost. If you'd rather do it right now, I'll spin a thread for it — but my read is it's premature.

### State of the tree (not committed)

Uncommitted changes now span: `packages/telemetry` (install-id override), `packages/mcp` (keyless warning + chat dispatch), `packages/app` (chat_created), `packages/vscode` (Fix A), `tests/telemetry.test.ts`, `scripts/build-all.sh` (key echo), the telemetry `design.md`, and the new `ai-integration/context-load-by-need` idea thread.

**Next:** re-verify on your side — full VS Code restart so the extension picks up Fix A, then generate a doc *and* create a chat via the extension; you should now see `chat_created` and the generate events tagged `surface: extension`, `distinct_id: loom-dev`, **without** needing the ambient `LOOM_TELEMETRY` var (Fix A carries it). When that checks out, tell me to commit and how you want it split — I'd suggest: (1) the telemetry-fix bundle [telemetry+mcp+app+vscode+test+build-all+design.md] as one `fix(telemetry)`, and (2) the `context-load-by-need` idea thread as a separate `docs:` commit.

## Rafa:

- Thanks for architecture explanation, very interesting, I didn't realize that `app` (and the MCP server) is a library instantiated per-process, not one shared running service, too much details in my head hahahha

- (3) Spin up thread, idead for remove env-plumbing entirely: resolve consent from a shared source every loom process reads, not for doing it, just to be tracked

- do loom_quick_ship
- commit (1)
- commit (2)
- commit (3)
- I think we need do-release 1.18.0, agree?

## AI:

Haha — yeah, that per-process detail is exactly the kind of thing that's invisible until it bites. Glad it clicked.

Done:

- **Tracking thread (3)** — `ai-integration/telemetry-shared-consent` + idea "Resolve telemetry consent from a shared source (remove per-process env-plumbing)". Marked **tracking-only, not scheduled** — do it when a non-extension host (Cursor/Continue) is real; until then the `launchClaude` fix is right-sized. It records the env-wins precedence question and that the env-injection becomes removable once the shared source exists.
- **quick-ship** — `plan-002` recorded in `validation/telemetry` as a 6-step DONE plan (install-id override · keyless warning · launchClaude consent fix · chat_created · build-all key echo · hermetic tests), so this lands in roadmap history and can carry `actual_release` at release time.

Committing now in the three splits you asked for:
1. `fix(telemetry): …` — all the code (telemetry/mcp/app/vscode) + test + build-all + the telemetry `design.md` + this chat + `plan-002`/done.
2. `docs: …` — the `context-load-by-need` idea thread.
3. `docs: …` — the `telemetry-shared-consent` tracking thread.

### do-release 1.18.0 — agree

Yes, and for a concrete reason, not just "there are changes": **none of this reaches real users until it's shipped.** The whole failure mode is that only `release.yml` bakes the PostHog key and ships consent-correct binaries — your local build helped you, but downstream users are still on 1.17.0, where the extension toggle silently fails to instrument the primary AI path. 1.18.0 is what actually closes the consent gap and turns on `chat_created` for the install base. It's a clean, self-contained bump (fix + one additive event), so low risk.

I'll **stop short of releasing** — publishing to npm + Marketplace is outward-facing and one-way, so that's your trigger: run `/do-release 1.18.0` when you're ready (it pins the release context and drives changelog → bump → tag → publish → monitor), or tell me to drive it and I will. Recommend doing it right after these three commits land.

**Next:** landing the three commits now; then it's your call to fire `/do-release 1.18.0`.