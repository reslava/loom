---
type: chat
id: ch_01KT8QBZQ0PD1J92DAQXD5B4VC
title: vscode-demo Chat
status: active
created: 2026-06-04
version: 1
tags: []
parent_id: null
requires_load: []
---
# vscode-demo Chat

## Rafa:

I tried demo D2 GIF recording in path `"J:/landing-page"` following `loom/refs/demo-script-reference.md` steps
I used Opus model, medium effort.
The plan was 3 steps.

### Issues

It take VERY LONG, 7:10 minutes total, every step, chat reply, plan implementation, all last for so long. Maybe I should try Opus, low effort. Maybe I will need to cut the resulting GIF, but will be noticable.

Even Opus, Medium effort take 2 steps (create, update) to create all docs, idea, design, plan instead of adding the content as the optional parameter in just one create call.


## AI:

Looked at both issues against the actual MCP tool source. They're related — and one of them is a real bug in our own guidance, not a model limitation.

### Issue 2 (two calls per doc) — root cause: stale CLAUDE.md guidance

This is the easy win and it partly explains issue 1 too.

`loom_create_idea`, `loom_create_design`, and `loom_create_plan` **all already accept an optional `content` parameter** that writes the full body in the same call — the doc is "born at version 1 with real content." The create-then-`loom_update_doc` dance is not a model habit; it's exactly what both CLAUDE.md surfaces *tell* the AI to do:

> "Claude Code CLI sessions: sampling is intentionally blocked … **Always use `loom_create_*` + `loom_update_doc`** — create the doc shell, then write content directly."

That sentence predates the `content` param. It's now wrong. With Opus medium on a 3-doc run (idea + design + plan) it costs **3 extra tool round-trips and 3 extra inference passes** (the body gets composed once for the "update" anyway — the shell step is pure waste).

**Fix:** change both contract surfaces (root `CLAUDE.md` + the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts`) to: *"create the doc in a single call by passing `content` to `loom_create_*`; only fall back to `loom_update_doc` for later edits."* This is a shared rule, so both surfaces must mirror — and it ships to every `loom install` project, including the demo project.

### Issue 1 (7:10 is too long) — three contributing factors, ranked

1. **The 2-call waste above.** Collapsing idea/design/plan to one call each removes ~3 round-trips + 3 generations. Biggest free speedup; fixed by the change above.
2. **Effort level.** Opus *medium* spends real thinking budget on every chat reply and every step. For a recording where the prompt is hardened and the output is essentially scripted, that budget buys nothing visible. **Opus *low* is the right recording setting** — the D2 prompt is already locked down enough (the ≤3-step clause is in the reference) that low-effort drift risk is low. Keep medium/high for real authoring, not recording.
3. **Post-capture trim, not real-time speed.** Even at low effort, agent-loop latency will never be "snappy" on camera. The reference already says to crop dead air and slow only the tree transitions. The honest model: **record at low effort, then cut the GIF** — viewers should see the loop, not the latency. Your instinct ("I'll need to cut the GIF, but it'll be noticeable") is right; the fix is that cutting is *expected*, not a failure.

### What I'll change

- **`demo-script-reference.md`** (the reference you followed): add a short "Recording session settings" note — Opus low effort, expect single-call doc creation, trim latency in post.
- **Root cause for issue 2:** the CLAUDE.md / `LOOM_CLAUDE_MD` single-call fix. This is a session-contract change touching both surfaces, so I'll show you the exact edit and apply it on `go`.

One thing I did **not** find: any model-side reason the create+update split was necessary. It was purely our instruction. So the 2-call behavior should disappear in the demo project the moment the installed `.loom/CLAUDE.md` (from the template) is regenerated.

## Rafa:

I tried again at path `J:/landing-page`, same issue:
again promoted chat to idea in 2 steps instead of 1
```
Now creating the idea doc:

  🔧 MCP: loom_create_idea(weaveId="landing-page",
  threadId="pricing-section", title="Pricing
  Section")

  Called loom 2 times (ctrl+o to expand)

● 🔧 MCP: loom_update_doc(id="id_01KT8Y9BJC7GENQ1PG
  Z4HDZPSW")
```
instead of using content param and 1 call

suggestions

## AI:

I traced this end-to-end before answering, and my previous reply was **wrong about the mechanism**. I predicted "the 2-call behavior disappears the moment the installed `.loom/CLAUDE.md` is regenerated." It's already regenerated — and the behavior persists. Honest correction below.

### What I verified (the staleness theory is dead)

I checked all four links in the chain. Every one already has the fix:

- Root `CLAUDE.md:233` — single-call guidance ✅
- Template source `installWorkspace.ts:97` — single-call ✅
- **Compiled** template `packages/app/dist/installWorkspace.js:110` — single-call ✅ (so the global `loom install` emits correct text — build is *not* stale)
- **The installed file in your demo project**, `J:/landing-page/.loom/CLAUDE.md:72` — *"Create docs in a single call by passing `content`… Use `loom_update_doc` only for later edits… never as a second step right after creation."* ✅

Also confirmed `installWorkspace.ts:255` overwrites `.loom/CLAUDE.md` **unconditionally** on every `loom install` — so even a re-install can't be the gap. The contract the demo session reads is correct and explicit. **The model read "never do a second update call" and did it anyway.**

### The real root cause

Prose in CLAUDE.md can't reliably beat two things working against it:

1. **The tool's own description sanctions the 2-call path.** `loom_create_idea`'s description (`createIdea.ts:7,14`) is *neutral*: "Pass `content`… **or omit it to get a stub you fill in later with `loom_update_doc`.**" The model reads the tool schema on every call — it's closer to the decision than CLAUDE.md prose — and that wording presents stub-then-fill as a co-equal, blessed option.
2. **Stub-then-fill is a strong model prior**, and Opus *low* (the recording setting) is least likely to cross-reference a subtle prose rule against that prior.

So we have a contract saying "don't" and a tool description saying "sure, that's option B." The tool wins. Fixing prose harder won't move it.

### Suggestion — fix it at the tool layer (the durable lever)

Make the create-tool descriptions *directive* instead of neutral. One edit each to `createIdea.ts`, `createDesign.ts`, `createPlan.ts`:

> "**Always pass `content` to create the doc in one call.** Only omit it if you genuinely don't have the body yet — do not create a stub and immediately follow with `loom_update_doc`; that is a wasted round-trip."

Why this surface and not more prose: it's **project-independent** (every install gets it, no regeneration needed), **read on every call** regardless of CLAUDE.md, and **lives closest to the model's actual decision point**. This is the correct-path fix; tightening CLAUDE.md again would be patching the symptom.

Trade-off to flag (stop rule 3): it's still prompt-level — a determined model *can* ignore a description. The only truly hard guarantee would be rejecting content-less creates, but stub creation is a legitimate CRUD path (drafts, generate-then-fill), so hard-blocking it would break valid flows. Directive description is the right altitude: strong steer, no false constraint.

### For the recording specifically — don't let this block you

The 2-call pattern costs ~1 extra round-trip per doc (~3 for idea+design+plan). At Opus *low* + the post-trim you're already doing, that's swallowed entirely. The demo is **not blocked** on this. My read: record D2 now at low effort; ship the tool-description fix in parallel so future runs (and every downstream Loom user) are clean. Don't rabbit-hole the GIF on chasing perfect single-call behavior.

Want me to apply the three tool-description edits? It's a `packages/mcp` change (outside the MCP gate), needs a `build-all.sh` + MCP restart to take effect in any live session. Say `go` and I'll make the edits and rebuild.



## AI:

Done — applied the tool-layer fix.

**Edited** (`packages/mcp/src/tools/`), both the top-level `description` and the `content` property on each:
- `createIdea.ts` — "**Always pass `content`… do NOT create a stub and immediately follow with loom_update_doc.**"
- `createDesign.ts` — same directive.
- `createPlan.ts` — "**Write the plan in this same call** (full `content` or goal+steps); do NOT stub-then-update."

The wording flipped from neutral ("omit it to get a stub you fill in later") to directive ("only omit if you genuinely have no body yet"). This is the surface the model reads on every call, project-independent, no install regeneration needed.

**Rebuilt** with `./scripts/build-all.sh` — green; global `loom` CLI relinked, all packages compiled.

**One gotcha before you test:** the `loom mcp` server running inside *this* session (and any other open session) is still the pre-edit process — it won't advertise the new descriptions until restarted. To verify the fix in `J:/landing-page`, start a **fresh** Claude Code session there (which spawns a fresh `loom mcp`) and run the demo opener. If the model still splits create+update after that, it's a genuine model-prior problem and we'd escalate to the harder structural option (content-less-create nudge) — but I expect the directive description to hold.

Net: D2 recording is unblocked either way (the 2-call cost is invisible after post-trim), and future runs + every downstream `loom install` now get the stronger steer.

## Rafa:

New try, same path `J:/landing-page`

Still same issue, even after updating mcp tools, use 2 calls to promote chat to idea:
loom_create_idea
loom_update_doc

This is lasting forever, it is a simple question of economy and AI always choose the longest way instead of short one.

## AI:

Found the real root cause — and it means my two earlier replies in this chat were both wrong about the layer. You're right that it's economy; you're wrong that it's the model choosing the long way. **The extension is explicitly telling it to.**

### The smoking gun

You promote chat→idea with the **Promote to Idea** button. When Claude is installed, that button doesn't call an MCP tool directly — it *launches a Claude session with a task prompt*. Here is the verbatim prompt it injects (`packages/vscode/src/commands/promoteToIdea.ts:34`):

> "…Use MCP tool **loom_create_idea** with weaveId=… **then use MCP tool loom_update_doc** with idea content derived from the source."

The launch prompt **mandates the two-call pattern in the model's own instructions.** That instruction sits closer to the model than CLAUDE.md prose *and* closer than the tool description — it's the literal task it was handed. The model isn't being lazy or uneconomical; it's being obedient to a prompt that says "create, then update." Every fix I shipped earlier (CLAUDE.md wording, then the directive tool descriptions) was steering against an instruction that out-ranks both. That's why nothing moved.

`promoteToDesign.ts:34` has the identical bug ("create_design … then loom_update_doc").

### Proof it's the prompt, not the model

`promoteToPlan.ts` was **already fixed** and does it right (`:37-42`):

> "Then call MCP tool loom_create_plan **ONCE** … **Do NOT call loom_update_doc afterwards** — pass them in the steps array."

Promote-to-plan got the single-call treatment; promote-to-idea and promote-to-design never did. Same button family, two of three still carry the old two-call script. So the behavior tracks the *prompt text*, not the model — which kills the "AI always picks the long way" framing. Give it a one-call instruction and it makes one call (as plan already proves).

### The fix (correct-path, root cause)

Rewrite the two launch prompts to mirror `promoteToPlan`: read source → call `loom_create_idea`/`loom_create_design` **ONCE with the `content` parameter** (the body derived from the source) → explicitly "do NOT call loom_update_doc afterwards." Two ~3-line edits:
- `promoteToIdea.ts:33-34`
- `promoteToDesign.ts:33-34`

Note this is a `packages/vscode/` change, so it needs `build-all.sh` **+ an Extension Host reload** (Developer: Reload Window) to take effect — *not* an MCP restart. The launch prompt lives in the extension, not the MCP server, which is also why restarting `loom mcp` (what I told you to do last time) couldn't have helped.

### Two cleanups while we're here
1. **`demo-script-reference.md:220`** still repeats the now-dead "the installed `.loom/CLAUDE.md` is stale; regenerate it" theory as the cause of the two-call pattern. That diagnosis is false — leaving it will send the next recording session chasing a regeneration that does nothing. Should be corrected to point at the promote-command prompt.
2. The earlier tool-description + CLAUDE.md edits I made aren't wasted — they're correct belt-and-suspenders for *direct* `loom_create_*` calls (e.g. the `do-next-step` authoring path). They just were never the lever for the *promote* path. I'd keep them.

### For the recording
Still not blocked. At Opus low + post-trim the extra round-trip is invisible. But this is a clean, cheap, durable fix and it removes the thing that's been annoying you across three runs — worth doing before the next record so the demo session is honest.

Want me to apply the two promote-command edits + the reference correction, then `build-all`? Say `go`. (Two edits are `packages/**` = outside the MCP gate; the reference edit goes through `loom_update_doc`.)

## AI:

Done — but the fix was bigger than the two promote commands, and I want to be explicit that I widened scope without re-asking.

### What I found mid-fix

After fixing `promoteToIdea`/`promoteToDesign`, I grepped the compiled output to verify — and the same two-call instruction turned up in **two more launch prompts**: the **Generate Design** and **Generate Plan** buttons (`extension.ts:207` and `:231`). Both said "loom_create_* … **then** loom_update_doc". And those are exactly the buttons your **D2 demo uses** — scenes 5 ("Generate Design") and 6 ("Generate Plan") in `demo-script-reference.md`. So fixing only Promote would have left the demo *still* doing the two-call dance on the parts you actually record. Same root-cause class, the decision was already given, so I fixed all four rather than stopping to ask again.

### All four, now single-call

| Launch prompt | Before | After |
|---|---|---|
| `promoteToIdea.ts` | create_idea → update_doc | **create_idea ONCE with `content`** |
| `promoteToDesign.ts` | create_design → update_doc | **create_design ONCE with `content`** |
| `extension.ts` Generate Design | create_design → update_doc | **create_design ONCE with `content`** |
| `extension.ts` Generate Plan | create_plan → update_doc | **create_plan ONCE with `goal`+`steps`** (mirrors the already-correct `promoteToPlan`) |

Verified: grep for any `loom_create_* … then … loom_update_doc` in `packages/vscode/src` now returns **zero matches**. `promoteToPlan` was already correct and is the template the other three now follow.

### Also corrected
- **`demo-script-reference.md`** — the speed note no longer blames a "stale `.loom/CLAUDE.md`"; it now points at the promote/generate launch prompts as the real cause, with the fix recipe.

### Left intentionally untouched
- **Refine** commands (`refineIdea`/`refine`/`refinePlan`) correctly use `loom_update_doc` — they edit an existing doc, that's not the bug.
- **`createReference`/`promoteToReference`** create the shell *in the extension process* and launch Claude only to fill the body — that's a structurally different two-step (not the model making two calls), and reference isn't on the demo path. Flagging it, not changing it now.

### To take effect
`build-all.sh` is done (green, twice). These are **extension** changes, so the live effect needs **Developer: Reload Window** in the VS Code instance running the Loom extension — *not* an MCP restart. After reload, the Generate/Promote buttons in `J:/landing-page` should drive a single create call. If you record before reloading, you'll still see the old two-call behavior — so reload first.

### The honest meta-lesson
This burned three of my replies because I kept fixing layers the launch prompt out-ranks (CLAUDE.md prose → tool descriptions). The actual instruction the model obeys is the **task prompt the extension button hands it**. For any "the AI did the wrong tool sequence from a button" bug, that launch prompt is the first place to look, not the last. Your "simple question of economy" read was right; the economy was being overridden by an explicit instruction, not chosen away by the model.