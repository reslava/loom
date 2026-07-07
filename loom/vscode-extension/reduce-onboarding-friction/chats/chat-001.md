---
type: chat
id: ch_01KWWHZ0R4H9XDKENMNNEHS8FD
title: reduce-friction-cli-autoinstall Chat 001
status: done
created: 2026-07-06
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 44
---
# reduce-friction-cli-autoinstall Chat 001

## Rafa:

I has been checking loom statistics and...

### The "Two-Step" Installation Barrier 

Our extension requires a global CLI tool to function. The marketplace page clearly states:

"1. Install the CLI (required — the extension talks to it): npm install -g @reslava/loom" 

Why this kills conversion, marketplace has 426 downloads in Last 30 Days but only 2 installs:

Default User Behavior: Most VS Code users expect a "Click Install" → "It works" flow.
The Friction: A user sees your extension, clicks "Install" in VS Code, and then tries to use it. It likely fails or shows an error because the CLI isn't installed.
The Drop-off: Instead of troubleshooting npm, reading docs, or installing a global package, the user uninstalls the extension and moves on.
Result: extension get the "View", but they fail the "Install" (or uninstall immediately after realizing it doesn't work standalone).

### Fix the Installation Flow: Auto-Install

The extension detect the missing CLI and offer to install it automatically via a popup? (e.g., "CLI missing. Click here to install @reslava/loom globally?")
1. npm install -g @reslava/loom
2. loom install (this is already implemented)

We must ensure, 1 click, full install pipeline, working. Analize whole install pipeline to detect possible frictions points.

## AI:

**Vision check:** this serves the vision's promise that "Drop `loom install` into any repository and the full workflow is available immediately" — the manual step it removes is a user hand-installing a global npm package and wiring MCP config before the extension does anything useful.

I traced the whole pipeline through the code, not the README. The headline: it isn't a *two*-step barrier, it's **four gates**, and only one of them is mentioned on the marketplace page.

## The pipeline as it actually is

A new user's real chain to a *working* Loom:

1. **Node/npm present** — never checked anywhere.
2. **`@reslava/loom` global CLI** — `npm install -g`; extension probes it with `execSync('loom --version')` (`extension.ts:469`).
3. **`loom install`** in the repo — writes `.loom/`, `.mcp.json`, `CLAUDE.md` (`cli/install.ts` → `installWorkspace.ts`).
4. **Claude Code CLI** — a *separate* install (`where claude`, `claudeTerminal.ts:13`), required the instant they click Generate / Refine / DoStep.

The marketplace page only names gate 2. Gates 1, 3, 4 are invisible until they fail.

## What already exists (Rafa's popup is half-built)

There's already a partial auto-install: `showSetupNotification` (`extension.ts:367`) notifies "Loom CLI not found → Open Terminal → `npm install -g @reslava/loom`", and `runLoomInstall` (`extension.ts:482`) runs `loom install`. So the pieces exist — but they're wired in a way that guarantees the drop-off.

## Friction points

- **FP1 — the notifier abandons the user halfway.** `showSetupNotification` sets `setupNotificationShown = true` *before* acting (`extension.ts:407`) and its branches are a mutually-exclusive if/else-if. A fresh user therefore gets **exactly one** notification — "install the CLI" — and after npm finishes, the follow-on "Initialize Loom" / "Set up MCP" prompts **never fire** for that workspace. The onboarding popup runs once and quits mid-pipeline. This alone explains a lot of 426→2.

- **FP2 — a *successful* CLI install still reads as failure (the silent killer).** The extension host captured its PATH at VS Code launch. `execSync('loom --version')` runs in that stale env, so after `npm install -g` succeeds, `isLoomCliAvailable()` keeps returning false until VS Code is **fully restarted** (Reload Window is not enough for PATH). The user did exactly the right thing and Loom still says "not found" → uninstall. **No popup fixes this** — it's inherent to probing a just-installed global on PATH.

- **FP3 — fire-and-forget terminals, no success/error detection.** Both `npm install` and `loom install` are `terminal.sendText(...)` (`extension.ts:292`, `:485`). No exit code, no completion ping, no surfaced error. If `loom install` fails (not a git repo, EACCES), the user sees red text and the extension just stays dark.

- **FP4 — no Node/npm check.** No Node → `npm install -g` fails cryptically and the extension offers no guidance. Plenty of VS Code users (non-JS) have no Node.

- **FP5 — the Claude Code CLI cliff.** Even a perfectly installed CLI + workspace yields an *empty tree*, and the first Generate click throws "Claude Code CLI not found" (`claudeTerminal.ts:66`). A "1-click full install" that omits gate 4 just relocates the failure one click later.

## On the popup proposal

Chaining `npm install -g` → `loom install` in one click is worth doing, and fixing FP1 (make the notifier walk the *whole* chain, re-checking after each step) is clearly right. But I want to name the root cause before building polish on the npm popup: **the popup automates a gate that arguably shouldn't exist, and because of FP2 it can't reliably verify its own success in the same session.**

## Design decision — automate gate 2, or delete it?

The extension is already a Node process shipping compiled JS. Two moves remove the global-CLI requirement instead of scripting around it:

- **Bundle `app`+`mcp`+`cli` into the VSIX** and spawn the server as `node <extensionPath>/dist/mcp.js` instead of a global `loom` (`mcp-client.ts:57` currently hardcodes `command: 'loom'`). The tree + buttons then work with **zero** npm install.
- **Write `.mcp.json` with `command: "npx", args: ["-y","@reslava/loom","mcp"]`** so the *Claude Code* agent's own MCP also needs no global install.

Trade-off: bundling grows the VSIX and you carry a spawn-path fallback; `npx -y` adds a one-time cold start on the first agent call. But it collapses "4 gates" to "install extension + (for AI) install Claude Code," and it **kills FP2 outright** — there's no PATH probe left to fail.

My honest read: the popup is a patch on a pipeline whose real problems are (a) a global-CLI gate at all and (b) a one-shot notifier that quits halfway. I'd fix FP1 regardless, and seriously weigh bundling before investing in the npm popup.

**Two questions before I go further:**
1. Root-cause route (bundle the CLI into the VSIX / `npx` in `.mcp.json`) vs. fix-and-chain the popup? Not mutually exclusive, but they target different root causes and I'd sequence them differently.
2. Fold the **Claude Code CLI** requirement (gate 4) into the same onboarding flow, or keep AI-setup as a separate later prompt?

Not writing any docs or code yet — this is the pipeline map you asked for.

## Rafa:

I like your proposals on Gate 2:
1. Bundle `app`+`mcp`+`cli` into the VSIX
2. Write `.mcp.json` with `command: "npx", args: ["-y","@reslava/loom","mcp"]`

If we implement them, do we still need fix-and-chain the popup?

About:
4. **Claude Code CLI
In the beginning we designed loom AI independent, but currently it is fully focuses in Claude subscription, what do you think?

Give me your full steps recommendation and its consequences.

## AI:

## 1. With Gate 2 dissolved, do we still need the popup?

**The npm-install popup — no, it disappears.** There's nothing left to `npm install`, so the fragile terminal-auto-installer you originally proposed is gone. But onboarding doesn't vanish — it **shrinks and becomes reliable**, because bundling changes what the remaining steps *are*:

- **Gate 2 (global CLI): gone** — the extension spawns its own bundled `node dist/mcp.js`.
- **Gate 3 (`loom install`): no longer a terminal command.** With `app` bundled, the extension can call `installWorkspace()` **in-process** — a real function call with a return value and try/catch, not `terminal.sendText('loom install')`. That kills **FP3** (fire-and-forget, no error detection) outright.
- **FP2 (PATH staleness): gone** — there's no `loom --version` probe left to fail.
- **FP1 (one-shot notifier): still must be fixed** — but it's now trivial. It becomes a single in-process prompt: *"Initialize Loom in this workspace? [Initialize]"* → calls `installWorkspace()` → tree lights up. No PATH, no terminal, no chain to walk.

So the answer: **you keep a one-click "Initialize this workspace" affordance, but it's in-process and reliable, not the terminal npm popup.** Bundling doesn't just automate the old popup — it deletes the reasons the popup was fragile.

## 2. AI independence vs. Claude subscription

Here's the honest picture, because the framing "we drifted from independent to Claude-only" isn't quite what the code says:

**Loom is agent-agnostic at the MCP layer — and that's genuinely true.** Any MCP host (Cursor, Continue, Claude Code) drives Loom through `loom_*` tools. A Cursor user gets the full workflow with zero Claude Code. That story is real; keep it in the pitch.

**The VS Code extension's AI *buttons* are Claude-Code-shaped — and that's fine.** `launchClaude()` gives the thing the vision actually wants: an agent you **watch and steer** in a terminal, using your **existing subscription, no API key**. The sampling + API-key fallback (`makeAIClient`, `reslava-loom.ai.apiKey`) still exists and works with any provider — but it's the weaker path, a captive text-completion call that the vision itself disparages ("not via a captive text-completion call").

So we're not "Claude-only." We're **MCP-agnostic underneath, with a Claude-Code convenience layer on the extension's buttons, plus a kept-by-design API-key fallback.** That's a coherent story — the problem is only that we don't *say* it, so gate 4 ambushes users.

**My recommendation:** stop presenting the extension as provider-neutral. Make Claude Code the *recommended* AI for the extension, turn the "not found" dead-end into an install funnel, keep the API-key fallback discoverable in settings, and keep MCP-agnosticism as the top-line pitch. **Do not** invest in making the sampling path first-class — it fights the vision and it's building a second polished path for users who don't exist yet. Given Loom is still an unvalidated bet, one honest happy path beats two half-committed ones.

## 3. Full step recommendation + consequences

Ordered so each phase ships value independently and the risky one is isolated:

**Phase 0 — Fix FP1 now (no bundling needed).** Rework `showSetupNotification` to re-check and re-prompt per step instead of setting `shownKey` once and going silent. *Consequence:* today's users who already installed the global CLI stop getting stranded mid-setup — a fix that helps the *current* 426→2 funnel immediately, in the current architecture, zero risk. (Pairs naturally with the idempotent-`loom install` bug in the sibling `loom-install-claude-written` thread.)

**Phase 1 — Bundle `app`+`mcp`+`cli` into the VSIX; spawn own server + `installWorkspace()` in-process.** *Consequences:* Gate 2 gone; FP2 + FP3 gone; the tree works the instant the extension installs. **Cost:** VSIX grows; the telemetry PostHog key must be baked into the *VSIX* build too (today only the CLI esbuild bakes it — the extension currently rides the global CLI's key); and the one real technical risk is **how to spawn Node** — `process.execPath` with `ELECTRON_RUN_AS_NODE=1` (ships with VS Code, no user Node needed) vs. relying on system `node`. That spawn decision is the thing to prototype first.

**Phase 2 — `.mcp.json` → `npx -y @reslava/loom@<pinned-version> mcp`.** Pin to the extension's exact version at install time. *Consequences:* the Claude Code agent needs no global install; still needs Node, but that's coupled to having Claude Code anyway; pinning avoids lockstep version skew between the bundled server and the agent's server; cost is a one-time `npx` cold start on first agent call.

**Phase 3 — Reframe AI onboarding around Claude Code.** Detect it; if absent, funnel to the install page (already half-done in `claudeTerminal.ts:66`) instead of dead-ending; keep the API-key fallback in settings. *Consequence:* gate 4 becomes guided, not a surprise on first Generate click.

**Phase 4 — Honest marketplace README (non-code).** Lead with "install extension → tree works immediately," state Claude Code as the recommended AI, drop the "step 1: npm install -g" framing. *Consequence:* correct expectations *before* install → fewer rage-uninstalls, which is where most of the 426 are lost.

**Net:** four gates → "install the extension" (tree/CRUD works) + "install Claude Code for AI" (one guided funnel). The global `loom` npm package still ships unchanged for CLI users and the `npx` path — we're removing it as a *hard prerequisite*, not deleting it.

**Design decision on the table (this is a STOP):** the big commitment is Phase 1's bundling + the Node-spawn strategy — it touches the build, telemetry-key baking, and versioning. Phase 0 is safe to do immediately regardless of how you decide on 1–4.

Want me to turn this into the thread's `idea.md` (framing the friction + the 4-gates→2 goal), and sequence Phase 0 as its own quick fix? I'll wait before creating any docs.

## Rafa:

I like and agree all.

But I think we don't need Phase 0, correct? we can do just Phases 1-4

### documentation 

We need to improve documentation, extension README and VSCode Walkthrough: Loom AI

- Clarify the Value: Update the short description to be more specific than "AI-assisted workflow." Maybe: "AI workflow engine: Turns project docs into a structured graph."
- Target the Right Audience
Keywords: Ensure keywords in package.json include specific terms like mcp, ai-agent, claude-code, workflow-automation rather than just ai or loom.
Link: Make the "Getting Started" link prominent. Users who are actually interested in this complex tool need to see the docs before they install to verify it's what they want.
- Get Initial Reviews
Maybe we could ask users from the Open VSX registry / GitHub to leave a review on the Visual Studio Marketplace specifically. 

We need to study how to get attention from users...

### TODO

All grounded for an idea for Phases 1-4 + docs + walkthrough?
If so, write ideas
Also, tell me any other idea you have to reduce friction

## AI:

Agreed on dropping Phase 0. If we commit to Phase 1, its onboarding rewrite *replaces* the exact code FP1 lives in (`showSetupNotification`), so patching it first would be throwaway work on soon-to-be-deleted code. I folded the FP1 *lesson* — "re-check per step, never fire-once-then-go-silent" — into Phase 1's in-process init instead. So: **Phases 1–4, no standalone Phase 0.**

**Idea written** → `idea.md`. I kept it as **one idea** rather than splitting the docs/walkthrough into a separate thread, because both prongs share a single success metric (install conversion) — the engineering-vs-docs split naturally happens at *design/plan* time, not idea time. The idea has two prongs:
- **Prong A — dissolve the pipeline:** bundle server into VSIX (zero-install tree), in-process `installWorkspace()`, pinned `npx` in `.mcp.json`, Claude Code onboarding funnel.
- **Prong B — sharpen discoverability:** your value-prop rewrite, the `mcp`/`ai-agent`/`claude-code`/`workflow-automation` keywords, prominent Getting Started link, walkthrough rewrite, empty-state welcome, reviews.

It also encodes the positioning truth (MCP-agnostic underneath + Claude-Code convenience layer) and the explicit NON-goals (don't promote the API-key path, don't delete the global CLI).

### Other friction ideas (I put the top 4 in the idea's "Further ideas"; my reasoning here)

1. **Instrument the conversion funnel first.** This is the highest-leverage one and it's cheap. Right now 426→2 is a *guess* — we're theorizing about where users drop. Emit telemetry events for activation → workspace-init → first-weave → first-AI-action and you'll *see* the cliff instead of inferring it. For an unvalidated bet, measuring the funnel beats polishing a step that might not be the leak. (Caveat: telemetry is off-by-default, so early data is thin — but the instrumentation is still the right foundation.)
2. **Empty-state `viewsWelcome`.** Even after a perfect install, a brand-new repo shows an *empty tree* — a dead panel reads as "broken." A welcome view with "Create your first chat" / "Initialize" buttons converts confusion into a first action. Cheap, pure-VS-Code, no engine work.
3. **Hero GIF in the README.** Marketplace conversion is visual before it's textual. A ~15s GIF of chat → generate idea → dostep communicates the whole loop faster than any prose value-prop. This might out-perform every keyword/description tweak combined.
4. **Seed a tiny example weave on init** so the tree is never empty — the user sees the *shape* (weave→thread→idea→plan→steps) immediately instead of staring at nothing.
5. **AI status in the status bar** (Claude Code ✓/✗) so Gate 4 is visible *upfront* rather than ambushing them on the first Generate click.

One honest meta-point tied to where Loom sits: **#3 (GIF) and #1 (funnel telemetry) are the cheapest, and they attack the part of the funnel where most of the 426 are actually lost — *before and right after* install.** The bundling work (Prong A) is correct and worth doing, but it fixes the experience of users who already got far enough to hit the gates. If almost nobody gets that far, do the GIF + funnel instrumentation first and let the data tell you whether the bundling is urgent. I'd sequence: **GIF + value-prop/keywords + funnel telemetry → then bundling → then the rest.**

**Next:** the idea's ready for you to review. When you're happy with it, say `go` and I'll generate the design — where the two prongs *do* split (Prong A's bundling/spawn-strategy is a real architecture decision; Prong B is mostly content). Want me to also flag whether the docs/walkthrough should break out into its own thread at design time.

STOP — waiting for `go`.

## Rafa:

### About your ther friction ideas

1. **Instrument the conversion funnel first.** This is already done, but telemetry is off-by-default, so we have no data at all for now.
2. **Empty-state `viewsWelcome`.** I like it, fold in
3. **Hero GIF in the README.** We already has a GIF in all READMEs
4. **Seed a tiny example weave on init** I like it, fold in
5. **AI status in the status bar** (Claude Code ✓/✗) I like it, fold in. Just 1 thing, we alread have 2 loom status bar buttons: feedback, telemetry. We could add Claude Code to status bar or to VSIX sidebar status.

go write design

## AI:

Folded your calls in and wrote `design.md`. Also corrected the idea: GIF + funnel telemetry marked as **already shipped** (funnel off-by-default → no data yet, so the drop-off is still a guess — opt-in rate is the real blocker, not instrumentation); example-seed + AI-status promoted to committed scope.

The design splits into **two plans in this thread** (Plan A engineering, Plan B content) — one idea, one metric, different done-criteria. All the architecture risk sits in Plan A, in one place.

**The load-bearing decision is the Node spawn (A2):** the bundled server is JS and something has to run it. I recommend **Electron's own Node** (`process.execPath` + `ELECTRON_RUN_AS_NODE=1`) — it ships inside VS Code, so there's *zero* external Node dependency and no PATH-staleness. The one risk is verifying `ELECTRON_RUN_AS_NODE` plays nicely with the MCP SDK's stdio transport (stderr piping + framing), so I flagged it as **prototype-before-committing-the-rest-of-Plan-A**.

Two consequences worth your attention:
- **Telemetry key baking moves.** Today only the CLI esbuild bakes the PostHog key and the extension rides it via the global `loom mcp`. A bundled server means the **VSIX build** must bake the same key or extension telemetry goes dark — that's a release-pipeline change, not just code.
- **On your status-bar question (#5):** I lean toward a **third status-bar item** (next to Feedback + Telemetry) over a sidebar row — visible without opening the panel, consistent with the two you already have. Open to the sidebar if you'd rather not add a fourth bar item.

**Four open decisions before I generate plans** (design has the full context):
1. **Node spawn** — Electron Node (recommended) vs system Node.
2. **AI status placement** — status-bar item (my lean) vs sidebar row.
3. **Example seed** — opt-in "Start with an example" button (recommended) vs auto-seed on every `loom install` (which pollutes real repos).
4. **Sequencing** — Plan B content quick-wins first (keywords/value-prop/getting-started/walkthrough/empty-state — cheap listing lift), then Plan A bundling, then polish. Agree?

One more: scope has grown from "auto-install CLI" to pipeline-plus-positioning. I'd write a short **req** to lock Included/Excluded/Constraints before planning — cheap insurance against the two plans drifting. Want that?

Review the design and answer the four decisions (plus req yes/no). Then I'll generate the plan(s).

STOP — waiting for your calls.

## Rafa:

1. Electron Node: 
- we will highlght also extra bonus works offline
- I like prototype this before committing the rest of Plan A

2. status-bar item
3. opt-in seed
4. sequencing: B is cheap, but are we going to do 1 or 2 releases? 
   for my A is the high value, 1 click install, but is hard and even need a prototype
   I am not sure, but I lean A, B with documentation over finished code and 1 release. What do you think?
   
yes req

Rename this thread properly

## AI:

Locked in: Electron Node (+ **offline** as an explicit selling point), prototype-as-gate, status-bar item, opt-in seed. All captured in the req.

**On #4 (1 vs 2 releases) — I agree with your lean, and there's a correctness reason it's the *right* call, not just the simpler one:**

B's headline promises ("install the extension, the tree just works", "1-click, zero install") are **only true once A ships**. If we released B first, the marketplace would advertise a flow that doesn't exist yet — a promise/deliver gap, which is *worse* than today: a user who was told "1-click" and then hits the old gates rage-uninstalls harder than one who expected friction. So B's positioning is downstream of A by necessity. → **One release.** A is the substance; B is the truthful description of A, written last.

The one nuance I'd hold: the **prototype (IN3) is a gate on the whole thing**. If Electron Node + the MCP stdio transport doesn't work and we fall back to system Node, then A no longer delivers true zero-install — and B's wording has to change with it. So Plan B's final copy waits until A's approach is *proven*, not just planned. That's the sequencing inside the single release: **prototype → Plan A → Plan B copy against shipped behavior → release.**

(There's a tiny A-independent subset — keywords, Getting Started link — that's safe to ship anytime and doesn't overpromise. Not worth a separate release; it just rides the single one. Flagging only so you know we're not blocking the *safe* listing tweaks on A, they're just bundled in.)

**Done this turn:**
- **req written** → `req.md` (`rq_01KWWQVE2G2JFRZ9521RJY3M57`), **draft**. 12 Included / 5 Excluded / 5 Constraints — encodes every decision above, including one-release + "B truthful to shipped behavior" (`IN12`/`C1`) and the Electron-Node/offline/no-user-Node constraints.
- **Thread renamed** `reduce-friction-cli-autoinstall` → **`reduce-onboarding-friction`** (the old name was inaccurate — we're *deleting* the CLI gate, not auto-installing it, and scope now spans discoverability too). ULID and all docs/backlinks intact.

**Next:** review the **req** — when it reads right, say `finalize req` and I'll lock it, then generate the two plans (Plan A gated on the prototype, Plan B). I won't finalize or plan until you've read the req.

STOP — waiting on your req review.

## Rafa:

I reviewed and locked req 
I marked idea, design done
Write Plans A, B

## AI:

Both plans written.

**`plan-001.md` — Plan A: Dissolve the setup pipeline** (`pl_01KWWRGAMRRWKBH2A03Z7Q3H0X`), 9 steps:
1. Spawn prototype (gate) → 2. Bundle MCP server into VSIX → 3. Bake telemetry key into VSIX build → 4. Spawn bundled server from mcp-client → 5. In-process workspace init → 6. Onboarding re-checks per step (FP1) → 7. Pinned npx in .mcp.json → 8. Claude Code detect + install funnel → 9. AI status-bar item. Everything past step 1 is `blockedBy` the prototype-chain, so the gate actually holds.

**`plan-002.md` — Plan B: Sharpen discoverability** (`pl_01KWWRH4811GS66D4RY1GYDH4T`), 5 steps: keywords+Getting-Started link (A-independent, unblocked) → then value-prop/positioning, walkthrough, empty-state, and opt-in example seed — all four **cross-plan-blocked on Plan A** so the copy stays truthful to shipped behavior (C1). Every step cites its IN/EX/C handles.

**One finding worth your attention (a real API gap, not just my mistake):** `loom_create_plan` generates step ids as **kebab slugs** from the title (`spawn-prototype-gate`, …), not `s1`/`s2`. When I authored intra-plan `blockedBy` as `["s1"]`/`["s2"]` in the create call, the tool **stored them verbatim as dangling references with no error** — the dependency edges (including the gate) were silently broken. I caught it on read-back and repaired all 9 edges via `loom_update_step`. Cross-plan `pl_` refs worked fine in-create. There's already a `plan-blockedby-id-normalization` thread, but it evidently doesn't cover *this* case — create_plan should either accept sibling refs by index/id or **reject unknown blockedBy handles** instead of persisting garbage. Flagging as dogfood signal; want me to file it as an idea/chat in that thread?

**Next:** start Plan A (`loom_start_plan`) and begin **step 1 — the Electron-Node spawn prototype**, since the whole plan (and Plan B's positioning) is gated on it. That's the highest-information first move: if it fails we fall back to system Node (EX4) and revisit positioning before building anything else.

STOP — say `go` to start Plan A and run the prototype (or tell me to file the create_plan finding first).

## Rafa:

### create_plan finding

this thread `core-engine/create-plan-blockedby-numeric-ordinals` maybe is also related
spin up a new chat in `plan-blockedby-id-normalization` thread with the gap, it is second time this happened (note: that thread already have an idea)

### TODO

Do plan A step 1

## AI:

Both done.

**1. Gap filed** — new chat `chat-002.md` in `core-engine/plan-blockedby-id-normalization`. The recurrence root cause: the `create-plan-blockedby-numeric-ordinals` fix made `resolveBlockedByIds` throw on wrong *types* and resolve ordinals, but a well-formed string like `"s1"` that matches no step id falls into the "assume it's already a slug" pass-through, which **never validates against the plan's real step ids** — so unknown slugs persist as silent dangling edges. Fix direction: validate every resolved slug against the plan's step ids + referenced plan ids and throw on unknown. I also flagged the create-time UX gap (can't know sibling slugs yet → suggest accepting sibling refs by 1-based index).

**2. Plan A step 1 ✅ — the gate PASSED.** Prototyped the Electron-Node spawn end-to-end:
- `Code.exe` under `ELECTRON_RUN_AS_NODE=1` runs as pure Node 24.15.0 (Electron 42.2.0), stderr intact — **zero user Node required, works offline** (the bonus you wanted).
- Drove the real shipped CLI (`cli/dist/index.js mcp`) as the server via the same `StdioClientTransport` the extension uses: connect 467 ms, `loom://catalog` 6324 B, 57 tools, a real `loom_find_doc` round-trip. stdio JSON-RPC framing intact.
- **Bonus finding for step 4:** in the extension the host *is* Electron, so `process.execPath` already points at the Electron binary — step 4 just spawns `process.execPath` + `ELECTRON_RUN_AS_NODE=1` + `args:[dist/loom-mcp.js]`; no need to locate `Code.exe`, and the rest of the `StdioClientTransport` options carry over unchanged.

Full write-up in `plan-001-done.md`. The spike harness was throwaway (session scratchpad, uncommitted); no production code changed this step.

**Next step — Plan A step 2:** add an esbuild step producing `packages/vscode/dist/loom-mcp.js` (bundling mcp + app + core + fs + telemetry) and wire it into the vscode build/package scripts. Files: `packages/vscode/package.json`, `packages/vscode/esbuild.js`, `scripts/build-all.sh`. This is now unblocked (gate cleared).

STOP — waiting for `go` to do step 2.

## Rafa:

Good news!

After Step2, by building bundle mcp server + app + core + fs + telemetry 
Users installing extension won't need to install CLI, but CLI commands will still avaliables in terminal, correc?

Users that prefer CLI over extension still need to istall npm -g... + Claude CLI, but this way without the extension loom docs graph has not so much sense, what do you think?

reply and stop before step 2

## AI:

Important correction on Q1, because the distinction drives the whole positioning:

**Bundling into the VSIX does NOT put a `loom` command in the terminal.** The bundled `dist/loom-mcp.js` lives *inside* the extension and is spawned *by* the extension — it never touches the user's PATH. So after installing only the extension:
- ✅ Tree, buttons, in-process workspace init, all doc ops (via the bundled MCP server) — work with zero npm.
- ❌ Typing `loom status` / `loom install` / `loom next` in a terminal — **still not available**; that requires `npm install -g @reslava/loom`.

They're **separate delivery surfaces that happen to share the same code**. The good news is that an extension user rarely *needs* the terminal `loom`: install is in-process (step 5), and every doc operation goes through the extension's MCP server. So "no terminal CLI" isn't a gap for them.

**Three distinct surfaces / audiences — worth being explicit about:**

| Surface | Who | Needs global `npm -g`? | Needs Node? |
|---|---|---|---|
| **Extension** (tree + buttons + bundled server) | VS Code human | No | No (Electron Node) |
| **Claude Code agent** (`.mcp.json` → `npx -y @reslava/loom mcp`, step 7) | the AI writing docs | No (npx fetches on demand) | Yes — but it has it (Claude Code is Node) |
| **Terminal `loom`** (global CLI) | CLI/CI/scripting, non-VS-Code MCP hosts | Yes | Yes |

Note the agent's server (npx) is a *third* process — not the extension's bundled one and not a global install. So the extension user's AI path also needs no `npm -g`.

**On Q2 — does the CLI-only path (no extension) still make sense?** Yes, but its real audience isn't "humans who prefer typing over clicking." It's **agents in non-VS-Code hosts** — Cursor, Continue, Claude Code running in a bare terminal. Those drive Loom entirely through the MCP server (the CLI package *is* that server), and the human just reads the markdown. For them the docs graph makes complete sense — the agent navigates it via `loom://` resources; the visual tree is a VS Code *luxury*, not the substance of Loom.

So my read: the standalone CLI is **load-bearing for the agent-agnostic vision** (it's what lets Cursor/Continue/terminal-Claude use Loom at all, via npx or global), not a second-class human UX we need to enrich. Keep it a thin MCP-server carrier + a few status/next/catalog commands; **don't** invest in a rich human CLI TUI to compensate for "no visual graph" — that's the extension's job, and duplicating it in the terminal would be building the wrong thing.

One consequence to keep honest in Plan B's copy: we should say "install the extension — no CLI needed" for the VS Code path, and separately "for Cursor / other agents: `npx @reslava/loom` or `npm i -g`" — not conflate them into one instruction. That's exactly the kind of gate-clarity the marketplace listing gets wrong today.

STOP — not starting step 2. Say `go` when you want it.

## Rafa:

Yes, now the vision is clear and for human documents, main readme, cli readme, extension readme all of them should point just to INSTALL EXTENSION, 1 click.
In CLI readme, we could include and clarify the real usage and clients of CLI, but pointing to users to install EXTENSION.
Is this correct? Am I wrong somehow?

## AI:

You're ~90% right — the instinct to make the 1-click extension the hero everywhere is correct. One real correction, because it's exactly the audience the vision names:

**Don't make "install the extension" the *only* call-to-action, or you drop the non-VS-Code agent users.** The extension is VS Code-only. Users on **Continue, JetBrains, terminal-only Claude Code, or CI** can't use it — and the vision explicitly says "Works with Claude Code, Cursor, or any MCP-capable agent." For them the CLI/MCP path *is* the product, not a fallback. So per-README:

- **Extension README** (marketplace) → 100% "Install extension, 1 click." Its reader is already in VS Code. ✅ exactly right.
- **Main README** (repo front door) → **lead** with the extension as the hero 1-click path, but keep a clearly visible secondary section: *"Using another agent — Cursor / Continue / terminal Claude Code / CI? → the CLI/MCP path (`npx @reslava/loom` or `npm i -g`)."* Leading with the extension is right; *erasing* the agent path would contradict the vision and lose the "someone else's codebase, any MCP agent" users that are the real validation target.
- **CLI README** (npm listing) → the person reading this **came to npm on purpose** — they're a CLI/agent user. So: clarify the CLI's real usage and who it's for (the MCP server for non-VS-Code hosts + CI + scripting), and cross-link the extension as *"if you're in VS Code, this is easier."* But don't tell them "install the extension instead" — that's not why they're here, and it'd read as a bait-and-switch.

So the rule isn't "all roads → extension." It's: **extension is the recommended default and the hero everywhere it applies; the CLI/MCP path stays a first-class, clearly-signposted alternative for agents the extension can't serve.**

Two footnotes:
- **Cursor** is the fuzzy case — it can install VS Code extensions (via Open VSX), so a Cursor user *could* use the extension tree, but the extension's AI buttons launch *Claude Code*, not Cursor's agent. So for Cursor the "drive Loom via Cursor's own agent + loom MCP" path is often the better fit. Worth a one-line mention, not a whole section.
- **Truthfulness gate (C1):** the "1-click, no CLI needed" copy is only *true* after Plan A ships. Until then the extension still needs the global CLI. So this README rewrite is Plan B step 2/3 and stays blocked on Plan A — we don't publish the 1-click promise early.

Net: your plan is right with one edit — keep the agent/CLI path visible in the main + CLI READMEs instead of funneling literally everyone to the extension.

STOP — waiting for direction (say `go` for step 2 when ready).

## Rafa:

Nice, now the vision is fully clear. When we finish Plan A if all went good, we will update READMEs, following lines 374-381.
Also update `loom/refs/architecture-reference.md` and include new `audience diagrams architecture` or create a new doc for each of them and link them.
This has been for sure other loom adoption high friction point, too many surfaces, users wonder how install, which one I need, how I use all of them, this need to be clear, simple and focuses for each audience / surface.

READMEs and docs should reflect these 3 distinct surfaces / audiences

Do A step 2

## AI:

**Step 2 ✅ — MCP server bundled into the VSIX and verified end-to-end.**

- New entry `packages/vscode/src/loom-mcp-entry.ts` (the `loom mcp` boot minus commander); `esbuild.js` now emits both `dist/extension.js` and `dist/loom-mcp.js`, inlining the MCP SDK (the VSIX ships `--no-dependencies`, so nothing external can be relied on — the CLI's ajv concern didn't bite). Wired into `build-all.sh`.
- **Caught a shipping bug:** `.vscodeignore` had `dist/**` + `!dist/extension.js`, which would have **excluded `loom-mcp.js` from the VSIX** — the bundle would've been built but never shipped. Added `!dist/loom-mcp.js`; confirmed with `vsce ls` that both files are now in the package.
- **Verified:** built the 2.8 MB `loom-mcp.js`, spawned it on Electron (`Code.exe` + `ELECTRON_RUN_AS_NODE=1`) via `StdioClientTransport` — connect 411 ms, 57 tools, `loom_find_doc` round-trip returned content. Typecheck clean.

**Captured your 3-surface docs scope** as **Plan B step 6** (`architecture-reference.md` audience/surface diagram + per-surface docs, and making main/CLI/extension READMEs reflect the three distinct audiences), blocked on Plan A so it stays truthful. I cited existing handles (IN10 + C1) rather than invent a new `IN` — because formally adding `IN13`/`IN14` means `loom_amend_req`, which **re-opens the locked req to draft and marks the design + both plans stale**. That's a real cascade mid-Plan-A, so I didn't trigger it unilaterally. If you want the tighter traceability, say so and I'll amend the req (accepting the re-finalize + staleness flags); otherwise the Plan B step covers the work.

**Next — Plan A step 3:** bake the telemetry PostHog key into the VSIX build (esbuild `define` + `release.yml` secret, mirroring the CLI), and verify off-by-default consent still gates emission. Files: `packages/vscode/esbuild.js`, `.github/workflows/release.yml`. Blocked-by cleared (step 2 done).

STOP — say `go` for step 3 (or tell me to amend the req first).

## Rafa:

ammend req
do 3,4,5

## AI:

**Req amended → v2 and re-locked.** Added `IN13` (three surfaces made explicit/distinct across the READMEs) and `IN14` (`architecture-reference.md` audience diagram). Plan B step 6 now cites IN13/IN14. Side effect as flagged: the design + both plans now show stale-vs-req-v2 — expected (scope grew), benign, clears on a refine whenever you want; the plan *content* already covers the new scope.

**Step 3 ✅ — telemetry key bake.** esbuild `define` added (mirrors CLI); and critically, `release.yml`'s **"Package VS Code extension"** step got `env: LOOM_POSTHOG_KEY` — because `vsce package` re-runs `esbuild --production` and would otherwise overwrite the baked bundle with a key-less one. Verified: sentinel key bakes into `loom-mcp.js` only; `consent.ts` still gates on `enabled && apiKey` with `LOOM_TELEMETRY` unset = off, so off-by-default holds (C5). Rebuilt clean.

**Step 4 ✅ — client spawns the bundled server on Electron-Node.** `mcp-client.ts` now uses `command: process.execPath`, `args:[dist/loom-mcp.js]`, `ELECTRON_RUN_AS_NODE=1`. The extension's dependency on a global `loom` for its own server is gone. Typecheck clean; spawn shape identical to the step-2 verified harness.

---

**STOP at step 5 — architecture decision (this is why I paused inside the 3–5 range).**

Step 5 is written as *"in-process `installWorkspace()` **imported from the bundled app**."* That would make `packages/vscode` import `packages/app` directly — which **violates `C3`** (the `vscode → mcp → app` layer rule I just re-affirmed in the req). I confirmed the extension has **zero** app imports today, so this would be the first breach, and it's exactly the gate the architecture is built to protect.

The clean fix is to keep the layer boundary:

- **Option A (recommended): expose install as an MCP tool.** Add `loom_install` to `packages/mcp` (it already bundles `app`, so it just calls `installWorkspace` on `LOOM_ROOT`), and have the extension call `getMCP(root).callTool('loom_install', …)`. Preserves `vscode → mcp → app`, gives real errors/return value in-process (no terminal), and satisfies `IN4` without touching `C3`. Cost: one new MCP tool (small, read-through to an existing app use-case).
- **Option B: documented carve-out** — let the extension import `installWorkspace` directly, justified as a pre-MCP bootstrap (like the existing `fs` activation carve-out). Simpler, but it widens the app-import surface and dents the exact boundary we're hardening — and it's unnecessary, because the bundled MCP server is available even before `.loom` exists.

I recommend **A**. It also cleanly carries step 7 (installWorkspace writes the pinned-npx `.mcp.json`) — that logic lives in the app use-case the new tool wraps.

Which way do you want step 5? (Steps 6–9 are unaffected by this choice.)

STOP — waiting on the install-layering decision before doing step 5.

## Rafa:

A

## AI:

**Step 5 ✅ — Option A (MCP tool), layer boundary intact.**

- New `loom_install` MCP tool (`packages/mcp/src/tools/install.ts`) wrapping the `installWorkspace` app use-case on `LOOM_ROOT`; registered under a new `workspace` group so `loom://catalog` auto-lists it.
- `extension.ts`: `runLoomInstall` is now an in-process `getMCP(root).callTool('loom_install', {})` with progress + real error surfacing + refresh; deleted the `loom install` terminal shell-out. The extension still imports **no** `app` — C3 preserved.
- **Verified against a throwaway temp dir** (never the repo): `loom_install` created `.loom/`, `.mcp.json`, `CLAUDE.md`, `CLAUDE-LOCAL.md`, `loom/` (result all-true); catalog contains the tool; `build-all` + both typechecks clean.

**Recap of this turn:** req → v2 (IN13/IN14) re-locked; steps **3, 4, 5 all ✅**. Plan A is now 5/9. The extension is self-sufficient: bundled server on Electron-Node, key baked at release, workspace init in-process — **no global `loom`, no user Node, no terminal**.

All changes are in the working tree, uncommitted.

**Next — Plan A step 6:** rewrite `showSetupNotification` so it re-checks and re-prompts per remaining step instead of firing once and going silent (the folded FP1 fix). With install now in-process and the CLI gate gone, this step also gets to *simplify* — the old "Loom CLI not found → npm install" branch is largely obsolete. Files: `packages/vscode/src/extension.ts`.

STOP — say `go` for step 6.

## Rafa:

Do 6-9

## AI:

**Plan A complete — 9/9, plan auto-transitioned to `done`. Full suite green (18/18).**

Steps 6–9 this pass:
- **6 ✅ FP1 fix.** `showSetupNotification` no longer sets a permanent "shown once" flag — dismissal is keyed to the current gap signature, so the same gap won't nag but a *changed* remaining gap re-prompts. Dropped the obsolete CLI-not-found/npm branch; one in-process **Initialize** prompt, driven by `syncSetupContext`.
- **7 ✅ pinned npx.** `.mcp.json` now `command:"npx", args:["-y","@reslava/loom@1.18.0","mcp"]` — version from the app's lockstep `package.json` (verified against a temp dir).
- **8 ✅ AI funnel.** New `funnelAiSetup()` (Install Claude Code / Set API Key); `launchClaude` and the design/plan commands now funnel when neither Claude nor a key is present instead of dead-ending or silently failing. API-key fallback stays discoverable (EX1).
- **9 ✅ AI status bar.** Third item (Claude Code ✓ / API-key / setup) → `loom.setupAi`; also fixed `loom.aiConfigured` to mean "Claude or key," not the loom CLI.

**Where Plan A lands the whole thesis:** installing the extension now gives a working tree + in-process workspace init on VS Code's own Electron-Node — **no global `loom`, no user Node, no terminal** — with the telemetry key baked at release, the agent wired via pinned npx, and a guided (not dead-end) AI path. Four gates → one.

**One follow-up I deliberately deferred** (noted in done-7): the `LOOM_CLAUDE_MD` template's *documentation* example still shows `.mcp.json` with `command:"loom"`. Both work, and touching it risks churning the `claude-md-sync` invariants — so it belongs in the Plan B docs pass, not here.

All changes are uncommitted in the working tree. **Plan A + Plan B are meant to ship in one release (IN12)**, so nothing needs releasing yet.

**Next:** Plan B (now unblocked). It starts with the A-independent listing tweaks (keywords + Getting Started link), then the copy/walkthrough/empty-state/example-seed written against Plan A's now-real behavior, then the 3-surface architecture-reference. Or, if you'd rather, I can commit Plan A first.

STOP — tell me: commit Plan A, or start Plan B?

## Rafa:

commit plan A
i started plan B

we should highlight new improvements in a way that:
- previous users who already tried and quit, now should feel that it will be so easy, fast, without friction problems, 1 click
- new users audiences have a clear get started and vision

if you consider all grounded, do whole plan B
stop if any doubt or refinement raise, or an improvement you discover we could include

## AI:

Committing Plan A now (code + this thread's docs + the blockedBy gap chat; leaving the unrelated `loom-install-claude-written` thread out).

Before I run the whole of Plan B, two things surface — one is exactly the kind of improvement you asked me to stop for.

**💡 Improvement I discovered (not in Plan B): a "What's New" notification for returning users.** Your goal #1 is winning back people who tried Loom and quit over the install friction. Plan B's marketplace copy only reaches them *if they revisit the marketplace* — but a quitter who still has the extension installed never sees it. The one proactive channel to them is a **one-time in-editor toast on upgrade**: *"Loom is now 1-click — no CLI, no setup. [Show me]"*, shown once when the installed version crosses into this release. That's the single highest-leverage lever for goal #1, and it's absent from the plan. I'd add it as a Plan B step (extension.ts: compare stored last-seen version vs current in `globalState`, show once). **Want it folded in?**

**🔧 One layering note for step 5 (example seed):** the plan says "seed via the in-process app," but the extension can't import `app` (C3) — same constraint as install. So I'll do it the same clean way: a new `loom_seed_example` MCP tool wrapping a small `seedExample` app use-case, called from the empty-state button. Consistent with `loom_install`. Flagging so it's not a surprise; I'll proceed this way unless you object.

**On the user-facing copy** (value-prop, READMEs, walkthrough): I'll write it to your two audiences — returners feel "easy/fast/1-click, the friction is gone," new users get a clear get-started + the vision. It's published content, but nothing ships until the release, so you'll see it all in the diff first.

If you're good with the two above, I'll do the **whole Plan B** (folding in What's-New if you say yes) in the next pass.

STOP — waiting on: (1) fold in the What's-New notification? (2) OK on `loom_seed_example` as an MCP tool?

## Rafa:

I like (1), fold in
(2) OK. We always respect layering architecture rules and stop to design when it is impossible.
go

## AI:

Yes — you're right, there's an existing walkthrough. It's defined inline in `package.json` as `loom.getStarted` (not separate files, which is what my "no walkthroughs dir" note meant). Its **first step is the now-obsolete `npm install -g` ("Install Loom CLI")**, and it ends on "Create your first weave" rather than a real first loop. So step 3 **rewrites** it, not creates it: drop the Install-CLI step, make Initialize one click (in-process), keep AI-setup optional, and end on an actual *chat → generate idea* so the walkthrough demonstrates the shipped zero-install flow. I'm not recreating anything — good catch, keeping it in mind. Proceeding with Plan B.

## AI:

Will do — step 3 will move the walkthrough content **out of `package.json` into its own `packages/vscode/walkthroughs/` directory**, one markdown file per step, referenced from each step via `media.markdown`. `package.json` keeps only the step scaffolding (id / title / short description / completion event); the prose lives in the `.md` files. Cleaner and easier to edit than the inline strings. Continuing.

## AI:

**Plan B complete — 7/7 ✅ (plan auto-`done`). Both plans done; the whole thread is implemented.**

- **1 · Keywords + link** — `keywords` (mcp, ai-agent, claude-code, workflow-automation, …) in package.json; prominent Getting Started link.
- **2 · Value prop + zero-install** — new marketplace description ("AI workflow engine … 1-click, no CLI, no setup"); all three READMEs rewritten (install = 1 click, `.mcp.json` → pinned npx, requirements no longer list a global CLI).
- **3 · Walkthrough** — moved out of package.json into `packages/vscode/walkthroughs/*.md` (your call), dropped the obsolete Install-CLI step, ends on "Run the loop." VSIX ships all four files.
- **4 · Empty-state** — welcome panels now offer 1-click Initialize / walkthrough, and New Weave / **Start with an example**.
- **5 · Example seed** — `loom_seed_example` MCP tool composing the app create use-cases (weave→thread→idea→plan); verified end-to-end. (Layer-respected: lives in the MCP tool composing app, not an app import — noted the file-list deviation in the done doc.)
- **6 · 3-surface docs** — a "Delivery surfaces & audiences" diagram + table in `architecture-reference.md`, and a matching "Three ways to run Loom" table in all three READMEs.
- **7 · What's New toast** — fires once, only for **upgraders** (fresh installs get the walkthrough), pointing quitters at the now-1-click flow.

Build + typecheck + **full suite (18/18) green**; package.json valid; VSIX ships the walkthrough dir + `loom-mcp.js`.

**Where we are:** four gates → one, and the listing/first-run/returning-user story all tell that truthfully. Plan A + Plan B ship together in **one release** (IN12) — nothing is published yet.

Committing Plan B now. **Next: review the diff, then release** when you're happy — that's `/do-release` (I can't trigger it). Want me to do anything else first (e.g. the deferred `LOOM_CLAUDE_MD` `.mcp.json` example nit), or is this release-ready?

STOP after the commit — waiting on your review / release call.

## Rafa:

remind me the deferred `LOOM_CLAUDE_MD` `.mcp.json` example nit and any other pending task

review & update 
loom/refs/getting-started-reference.md
docs/AI_INTEGRATION.md
docs/ARCHITECTURE.md
docs/CLI_USER_GUIDE.md
docs/EXTENSION_USER_GUIDE.md
docs/USER_GUIDE.md

many of them are really stale now and still show:

```bash
npm install -g @reslava/loom
```

for install

## AI:

### Pending items

**The deferred nit** — the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts:93` (the `.loom/CLAUDE.md` every downstream `loom install` writes) shows an `.mcp.json` example with `"command": "loom"`, but install now writes `npx`. Should show the pinned-npx form so downstream docs match what's actually written.

**Everything else stale (a grep across docs + refs):**
- **`npm install -g` as THE install:** `docs/EXTENSION_USER_GUIDE.md` (:21–24, "Install the CLI — the extension talks to it") and `loom/refs/getting-started-reference.md` (:24) — both now wrong; the extension is 1-click. (`docs/CLI_USER_GUIDE.md` keeps it — that's the CLI surface, legitimately.)
- **`.mcp.json` examples showing `"command": "loom"`:** `loom/refs/architecture-reference.md:145`, `loom/refs/mcp-reference.md:187`, `loom/refs/cli-commands-reference.md:50`, `loom/refs/CLAUDE-template-reference.md:40`, `docs/CLI_USER_GUIDE.md:64` → pinned npx.
- **`loom/refs/vscode-commands-reference.md:163`** describes the *old* walkthrough steps ("install the CLI, run loom install, configure AI provider, create weave") — no longer the steps.
- **Vestigial code:** the `loom.install.openCliTerminal` command (opens a terminal to `npm install -g`) is now unused by onboarding — candidate to remove.

**One deliberate keep:** the **root** `CLAUDE.md`'s `.mcp.json` example stays `"command": "loom"` — *this* repo runs the globally-linked CLI in dev (build-all `npm link`), so it's correct here. The prose is allowed to differ from the template (the claude-md-sync test locks rule-ids + invariant tokens, not the example), and downstream correctly gets npx via the template.

Now doing the sweep you asked for (the 6 docs + the refs + the template nit). Will commit it separately.

## AI:

Sweep done — stale install instructions updated across docs + refs + the template nit.

**Rewrote to 1-click / no-CLI:**
- `docs/EXTENSION_USER_GUIDE.md` §1 Install — was "1. Install the CLI (the extension talks to it)"; now install the extension → click Initialize, no CLI/Node/terminal.
- `loom/refs/getting-started-reference.md` §1–2 — same, plus a "not using VS Code?" pointer to the CLI guide + the three-surfaces section.

**`.mcp.json` examples → pinned `npx` (the deferred nit + siblings):**
- `packages/app/src/installWorkspace.ts` (the `LOOM_CLAUDE_MD` template every `loom install` writes) ✅ the nit.
- `loom/refs/mcp-reference.md`, `loom/refs/CLAUDE-template-reference.md`, `loom/refs/architecture-reference.md`, `loom/refs/cli-commands-reference.md`, `docs/CLI_USER_GUIDE.md`.
- `loom/refs/vscode-commands-reference.md` — the walkthrough-steps description now matches the new steps (Initialize → AI → weave/example → run the loop).
- `docs/CLI_USER_GUIDE.md` — added a "In VS Code? use the extension" callout at the top; kept `npm install -g` below it (that IS the CLI surface).

**The three concept docs you listed — `USER_GUIDE.md`, `AI_INTEGRATION.md`, `ARCHITECTURE.md` — had no stale install/mcp snippets.** They reference the CLI/extension only conceptually and accurately (e.g. AI_INTEGRATION's two AI paths), so I left them.

**Deliberate keeps:** the **root `CLAUDE.md`** `.mcp.json` example stays `"command":"loom"` — this repo runs the globally-linked CLI in dev — and `docs/internal/*` + `loom/refs/.archive/*` (backups/frozen) untouched.

**Verified:** build green; full suite **18/18** including the **claude-md-sync** test (the template change is prose inside the existing `rule:claude-code-config` marker, so rule-set + invariants still match); re-grep clean.

One loose end still open (code, not docs): the `loom.install.openCliTerminal` command (opens a terminal to `npm install -g`) is now unused by onboarding — want me to remove it, or leave it as a manual escape hatch?

Committing this sweep now.

## Rafa:

These 2 `docs/EXTENSION_USER_GUIDE.md`, `loom/refs/getting-started-reference.md` was very important to be updated

about the vestigial `loom.install.openCliTerminal` command, has any sense to keep it, could be any reason to use it?

## AI:

Answered by the code: **no reason to keep it.** `loom.install.openCliTerminal` was referenced only at its own registration — nothing invoked it once the walkthrough's Install-CLI step was removed, it's not in the Command Palette, and it installs a global CLI the extension no longer needs. While checking, I found `loom.install.openAiSettings` had gone dead the same way (the walkthrough's AI step now points at `loom.setupAi`, and `funnelAiSetup` opens settings directly).

**Removed both.** Kept `loom.install.runInstall` (still used by the empty-state and the walkthrough's Initialize step). Build + typecheck green; no source references remain.

(Minor leftover, not touched: the `loom.cliDetected` context key is still computed in `syncSetupContext` and is now largely unused — harmless, and I'd rather not widen this cleanup further without your nod.)

Committing.