---
type: chat
id: ch_01KXAJTVQQQ365TZBGCW9HA9VF
title: doc-graph reports — plan-001 project-overview Chat 001
status: done
created: 2026-07-12
updated: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 26
---
# doc-graph reports — plan-001 project-overview Chat 001

## Rafa:

By taking advantage of Loom-self nature a doc graph containing all project history (past and future) I am think of adding an feature that prompt AI to generate reports form that doc instead of just using codebase. This allow extract meta info that do not live in code, like why were decisions taken.

### Deep levels (What docs / info use)

This feature have different ways and deep levels:
1. Use roadmap (plans from history and ideas from roadmap)
2. Use docs only. Here we have levels by using only:
   1. chats
   2. ideas
   3. chats + ideas
   4. plans
   5. plans + done
   6. ideas + plans + done
   7. chats + ideas + plans + done
   8. etc

### Filters

1. By weaves(s)
2. By weave/thread(s)
3. By dates (from - to)

The feture tool point what docs and loom features use to extract info for the analisys, but this will consume many tokens because reading so many docs, we we allow deep levels and filters. 

### Draft example

This is an example of prompt template that allow filter parameters

```markdown
## Analyse-report

Analyse this project and extract all kind of useful info:
- what this project is about? goal?
- architecture, layers, technologies?
- main decisions taken related to version 
- inconsistency, weakness, conflict points
- suggestions to improve features, security
Structure the report in markdown format, visual appealing and easy readable.

## Deep level

Via using roadmap history (already done sorted by date) and roadmap pending threads sorted by priority.

## Filter

Use info only from weave(s) {weave(s)}, threads {thread(s)} 
And from date {date-from} to date {date-to}
```

We could design a more complex template that generate different kind of reports (security, architecture, API, UX) and deep level by params

## TODO

Let me know what do you think of this idea, do you like it?
Maybe we could find other possibilities for injecting Loom infor into AI and extrac/do different features

Where/how we could implement this? via mcp prompts launched from CLI or extensio with the kind of report, deep level and filters?

## AI:

Yes — I like this a lot, and I think it's more strategically important than it first looks. Let me say why, then push on the parts I think are designed wrong, then answer the "where/how."

## Vision check first

This maps directly to the north star: *"the AI becomes as stateful as it can be — not via memory inside the model, but via durable docs."* A report feature is the **payoff** of Loom's entire bet. Every other tool so far *builds* the doc graph; this is the first one that *cashes it in*. The manual step it removes is real and expensive: today, to answer "why did we choose ULIDs over slugs" or "what's the security posture of everything we shipped in v1.16," you (or an agent) manually archaeology through chats/designs/dones and synthesize by hand. This makes the graph *queryable as decision-memory* — which is exactly the thing a codebase-only AI structurally cannot do. So: strong yes on the concept.

There's also a validation angle I don't want to skip (given where Loom sits): this is the most **demo-able** feature on the board. "Point Loom at your project's history, get a decisions-and-weaknesses report" is a screenshot/GIF that sells the doc-graph premise in one image. That matters more right now than most internal polish.

## Where I'd push back

**1. The orthogonal "deep level" matrix is the wrong knob.** The numbered list (chats / ideas / chats+ideas / plans / plans+done / … / etc) is a combinatorial config surface nobody will reason about. No user will meaningfully choose "level 6 = ideas+plans+done" vs "level 7 = +chats." That's asking the human to hand-tune the token/quality tradeoff on every run.

The fix: **the report *kind* should imply the doc-set.** A report intent inherently knows what it needs —
- *"Why did we decide X" / decisions report* → chats + designs (that's where rationale lives)
- *Architecture report* → designs + refs
- *What-shipped / release report* → done + roadmap (`actual_release` already carries this!)
- *Consistency/weakness audit* → designs **vs** done (surface where implementation drifted from design)

So the primary parameter is **report kind**, and deep-level becomes an *optional override* for power users, not the front-door knob. This also solves your token worry structurally: each kind reads the *minimum* doc-set it needs, not "everything."

**2. Name the relationship to `ctx`, or we build two summarizers.** Loom already has a summarization primitive: ctx docs ("AI-optimised context summary, auto-loaded by scope"). A report is *close* to "a richer, on-demand, filtered ctx with an analytical lens." The distinction is worth stating clearly so they don't collide: **ctx is scope-state the AI reads to *operate*; a report is a narrative artifact a *human* reads to *understand*.** Different audience, different lifecycle. But the *doc-selection machinery* underneath should be **shared** with ctx, `loom://roadmap`, and the context pipeline — not a third parallel path.

## Where/how to implement — the architecture I'd argue for

Your instinct (MCP prompt) is right, but only for *half* of it. Split it cleanly along Loom's existing seam:

- **Deterministic doc-selection lives in the server** — a filtered assembly ("give me the bodies of docs matching {weaves, threads, types, date-from/to}"). This is a generalization of what the context pipeline + `buildRoadmap` already do. Filters, dedup, ordering, token budgeting = server's job, and it's *testable*.
- **Synthesis lives in the agent, via an MCP prompt** — the prompt gathers that filtered doc-set and hands the host agent "here are the docs, produce a {kind} report." This is the same split as `do_step` and the same reason sampling is blocked in Claude Code: **the agent IS the AI; the server assembles context, the agent reasons.** A report is inference-heavy, so it must run in the real agent loop where the tokens and tools are — not a captive `sampling/createMessage`.

So: **one filtered-context resource/tool (deterministic) + one `report` prompt (analytical, parameterized by kind + filters).** Launchable from CLI (`loom report architecture --weave ai-integration --since 2026-06-01`) and mirrored as an extension action (tri-surface parity). Output defaults to the terminal, with an **option to persist as a doc** — because "v1.16 architecture report" is itself durable decision-memory and arguably belongs *back in the graph* (new doc type, or a reference). That persist-or-ephemeral question is a genuine fork — I'd want your call on it.

## Adjacent "inject Loom into AI" possibilities you asked about

A few that are cheaper than the full report matrix and fall out of the same machinery:
- **Release notes / changelog from done docs between two releases** — `actual_release` is already on plans, so this is nearly free and concrete.
- **Decision-provenance lookup** — "why do we do X?" → trace to the chat/design turn where it was decided. A targeted query, not a full report.
- **Onboarding brief** — "get an agent up to speed on weave Y" as a generated doc.
- **Design-vs-done drift audit** — the uniquely-Loom version of your "inconsistency / conflict points" bullet.

## My recommendation on sequencing

Given validation matters: **ship the cheapest slice first** — a single `report` prompt over the roadmap (which already exists as `loom://roadmap`), one report kind ("project overview"), no filters yet. See if it lands / demos well, *then* build out the kinds + filters. Don't build the full deep-level×filter×kind cube in the dark.

Two things I'd want you to decide before I'd design further (both are real forks, not rhetorical):
1. **Report kind as the primary knob** (my rec) vs. your explicit deep-level selection — or both, kind-first with level as override?
2. **Persist reports as Loom docs** (back into the graph, versioned) vs. **ephemeral** terminal output vs. offer-to-save?

What's your read?

## Rafa

### Slang

about 
read on a chat doc with a pending `## {User}:` turn should flow straight into reply
code quick 

### Agree all

About your sections:
- `## Where I'd push back` I fully agree agree 1 and 2
- `## Where/how to implement` fully agree, the report should be saved by default in Loom tree `Refs` or maybe new tree node `Reports` with a name similar to: `{Title} ({date}) - {kind} report.md` 
reports could be launched by CLI `loom report` or extension
- `## Adjacent "inject Loom into AI" possibilities you asked about`
I like all your proposed reports
- `## My recommendation on sequencing`
Agree. Lets start with a single `report` prompt over the roadmap "project overview", no filters yet. See if it lands / demos well, then build out the kinds + filters. 
1. Report kind as the primary knob
2. Persist reports as Loom docs (back into the graph, versioned)

If is it all grounded, write idea

## AI:

Grounded — idea written. `idea.md` now anchors this thread with everything we settled:

- **Report kind = primary knob** (implies the doc-set), with a starter kind→doc-set map; the orthogonal deep-level matrix demoted to an optional override.
- **Architecture** = deterministic filtered doc-selection in the server + a `report` MCP prompt for synthesis in the agent (same seam as `do_step`; sampling-blocked path stays out of it).
- **Reports persist as versioned Loom docs** under a new **`Reports`** tree node, `{Title} ({date}) - {kind} report.md`.
- **Tri-surface**: `loom report <kind>` + extension action.
- **ctx boundary** named (operate vs. understand; shared selection machinery).
- **First slice**: single `report` prompt over `loom://roadmap`, "project overview", no filters — validate, then expand.
- Adjacent features (release notes, decision-provenance, onboarding brief, drift audit) captured for later.
- Three open questions parked (report doc-type/frontmatter, filter grammar, whether the deep-level override survives at all).

Next natural step when you want it: **`generate design`** on this thread to turn the architecture stance into the concrete resource/tool + prompt design. Separately, the `read`→`reply` slang fusion you asked for is shipped (recorded in the `loom-slang-protocol` thread).

## Rafa:

### Open questions 

- Exact frontmatter/type for a persisted report: I think we could start by using current `reference` type refreshable/versioned like other docs. Agree or you suggest other approach?
- Filter grammar for the CLI (`--weave`, `--thread`, `--since`, `--until`). We can start only with CLI, agree?
- Dropped entirely deep-level in favor of kind-implied doc-sets.

If we converged, generate design, if not tell me

## AI:

Converged on two, one pushback — so not generating design *quite* yet.

**Q2 (CLI-only first) — agree.** Consistent with the cheapest-slice principle. Tri-surface parity is "consider and mirror," not "mirror on day one" — the capability lands on CLI first, the extension action follows once the shape is proven. Good.

**Q3 (drop deep-level entirely) — agree, and it's *cleaner* than my earlier "keep as override."** Kind-implied doc-sets are the right default; an override nobody reaches is just surface to maintain. Dropping it means one knob (kind) — better.

**Q1 (reuse `reference` type) — here I'd push back, because it collides in two concrete ways:**

1. **It pollutes the `requires_load` picker.** The `loom://refs` resource ("Reference docs under `loom/refs/` — *backs the requires_load picker*") auto-lists every reference. Reports-as-references means every dated report shows up as loadable context to cite in future docs — but a report is an **output a human reads**, not a fact source you load into new work. After a few weeks you'd have 30 "…report.md" entries flooding the picker.
2. **It contradicts the `Reports` tree node we already locked.** Reference docs live in `loom/refs/` and render under refs. We already decided reports get their **own `Reports` node** with `{Title} ({date}) - {kind} report.md`. A `reference`-typed doc can't live there without special-casing — which *is* the collision, renamed.

Your underlying instinct — *don't invent heavy machinery for slice 1* — is right. But the fix isn't `reference`; it's a **thin new `report` doc type**: its own frontmatter (`kind`, `generated_at`, scope/filters, source refs), lives under `Reports`, **excluded from the refs picker / not auto-loadable**, snapshot-versioned. It's a bit more work (touches the doc-type enum in core, the serializer, tree rendering) but it's the root-cause-correct path and it *matches the Reports-node decision instead of fighting it*. Reusing `reference` is exactly the kind of semantic debt that bites later — a report answering to `load: by-request` is a lie about what it is.

So the real fork for you:
- **(A) thin `report` type** — correct, self-consistent with the `Reports` node, slightly more code. *(my rec)*
- **(B) reuse `reference`** — faster to first pixel, but pollutes the picker and contradicts the Reports node; we'd likely rip it out later.

Pick A or B and I'll `generate design` immediately. Everything else (kind→doc-set map, server-selection + agent-synthesis split, roadmap-only first slice) is settled.

## Rafa

A

## AI:

Design generated — `design.md` (linked to the idea). It locks the A path and turns the stance into a concrete build:

- **Architecture**: CLI/extension → `report` prompt → **server** `selectReportDocs` (deterministic, testable) → **agent** synthesis in the real loop → `loom_create_report` write tool. Never sampling.
- **New `report` type**: `rp_` ULID, minimal snapshot frontmatter (`kind`, `generated_at`, `scope`, `sources`), **excluded from `loom://refs` / the requires_load picker**, born `active` (no draft lifecycle). Regeneration = a new dated snapshot, not a mutating refine.
- **Kind registry** (`slug, docTypes, scopeHint, promptFraming`) with the six-kind map; adding a kind = a registry entry, not a new code path.
- **CLI**: `loom report <kind> [--weave --thread --since --until --title]`, human-first.
- **`Reports` tree node** + `{Title} ({date}) - {kind} report.md`.
- **First slice** scoped tight: `report` type + `loom_create_report` + `report` prompt + `project-overview` (roadmap passthrough) + CLI command + refs-picker exclusion. Everything else (filters, other kinds, extension action, refresh-in-place) deferred to follow-ups.
- Three non-blocking open questions parked for the plan: `reports/` location (per-weave vs top-level), refresh-vs-snapshot, kind-registry home (leaning core).

Next when you're ready: `generate plan` to break the first slice into steps — or refine the design first if any of the parked questions want settling now.

## Rafa:

### Open questions 

- `reports/` location: your leaning: cross-weave/roadmap → top-level; single-weave → under the weave. Confirm during plan.
- Refresh vs. snapshot: ok
- Kind registry home: your leaning core as a pure registry consumed by the prompt + selection, but I wonder if to save the file will need `fs` and for loom command will need `cli`...

refine design
generate plan

## AI:

Done — design refined and plan generated.

**Design refine**: the three open questions are now **Resolved decisions**. On your fs/cli worry, I added a layer-placement table — the registry stays pure `core`, and that's exactly *why* the other layers consume it without importing upward: saving is `app`→`fs` (`loom_create_report`), the command is `cli`. Needing fs/cli doesn't pull the registry out of core; it's just one feature spread across its proper layers per `cli → mcp → app → core + fs`.

**Plan** `plan-001` — *Doc-graph reports — first slice (project-overview)*, 6 steps in dependency order:

1. `report` doc type in core (rp_ ULID, snapshot frontmatter)
2. `loom_create_report` write path (core reducer → fs placement → mcp tool) — *blocked by 1*
3. kind registry + `report` prompt (project-overview = roadmap passthrough) — *blocked by 2*
4. `loom report <kind>` CLI command — *blocked by 3*
5. exclude `report` from `loom://refs` / requires_load picker — *blocked by 1*
6. build + test + verify end-to-end (report lands under `loom/reports/`, absent from `loom://refs`) — *blocked by 2–5*

The plan is `active`, not yet `implementing`. Next: `start plan` then `do step 1` (or `do plan` to run the slice through) whenever you want to build — or tell me to hold.

## Rafa:

side note: I read wrong when you said: `kind registry home` i read only `registry home` now I understand you where asking where to declare report `kind`. Anyway I liked the layer discussion ;-)

reports are saved in loom/reports or loom/weave/reports
extension should show tree nodes for them, opening the report file by click as the other docs

add plan steps for this or defer to next slice?

## AI:

(Ha — "kind registry home" *was* an ambiguous phrase; glad the misread turned into a useful tangent.)

My call: **defer the extension tree node to the follow-up extension slice** — and I'd bundle it with the extension *generate* action there, not split them. Reasoning:

- **They're the same surface, one change.** Both are `packages/vscode` work: a `Reports` tree node that renders report docs + click-to-open, and a "Generate report" action. Doing them together means touching the extension **once**, coherently — display + action ship as one "reports in the extension" story. Splitting them front-loads a second vscode edit for no gain.
- **Slice 1 stays honestly cheapest.** A CLI-generated report is a real markdown file — you can open it in the editor immediately, so it's not *invisible*, just not yet tree-surfaced. The whole point of slice 1 is to prove the data model + synthesis before investing in UI.
- **It's already captured, so it won't be lost.** The design's *Tree / presentation* section already specifies the `Reports` node and click-to-open. The follow-up plan inherits it directly.

One caveat where I'd flip: **if you want to demo/validate through the extension specifically** (screenshots of reports in the tree as the selling image), then the tree node earns its place in slice 1 even without the generate button — display is cheap and read-only. Given validation weighs heavily for Loom, that's a legitimate reason to pull it forward.

So — two clean options:
- **(A) Defer** *(my default)* — extension tree node + generate action together in the follow-up extension slice. plan-001 stays CLI-only.
- **(B) Pull display forward** — add one read-only step to plan-001: `Reports` tree node rendering report docs with click-to-open (no generate button yet), because the extension is your demo surface.

Which fits how you want to validate this?

## Rafa:

(A)

I started the plan
do plan
docs done
commit

## AI:

Started `do step 1` and read the real doc-type machinery (`entities/base.ts`, `idUtils.ts`, `frontmatterUtils.ts`) — and I'm hitting **stop-rule 3** before writing code. Two genuine design forks surfaced that the design left implicit; they'd shape steps 1–6, so guessing them autonomously is the wrong move. (`do plan` runs steps through, but design-decision and error-loop stops still interrupt — this is one.)

**Fork 1 — how does `report` store `scope` + `sources` in frontmatter?**
The canonical serializer (`serializeFrontmatter`) is **flat**: arrays go inline `[a, b]`, but a **nested object falls through to `JSON.stringify`** — so a `scope: { weaves, threads, from, to }` block would serialize as an ugly one-line JSON that won't round-trip cleanly back through the gray-matter parser. Options:
- **(a) Keep frontmatter truly minimal** — only `kind` + `generated_at` in frontmatter; render `scope` + `sources` as a body **`## Provenance`** section. *Cleanest for a snapshot doc, zero serializer changes, and scope/sources are human-facing anyway.* ← my rec
- **(b) Flatten** into scalar keys `scope_weaves` / `scope_threads` / `scope_from` / `scope_to` + inline `sources: []`. Round-trips, but adds 5 keys to `ORDERED_KEYS` and to every read path.
- **(c) Teach the serializer to emit nested block YAML** for `scope`. Most general, but touches the *canonical serializer* every doc type shares — biggest blast radius for the least slice-1 value.

**Fork 2 — what does `loom report project-overview` actually *do* when run?**
The design says "the agent synthesizes in the real loop, never sampling" — but who drives that from the CLI?
- **(a) Brief-returning**, mirroring `do-next-step` / `loom_do_step`: the CLI (and the `report` prompt) assemble the roadmap slice + framing and **return a brief**; the already-running agent reads it, synthesizes, and calls `loom_create_report`. *Consistent with Loom's server-selects/agent-reasons seam; nothing new invented.* ← my rec
- **(b) Launch a Claude agent** from the CLI (like the extension's `launchClaude`) so a human in a plain terminal with no agent gets a report end-to-end. Heavier (spawns a process), but it's the only way `loom report` "just works" for a non-agent caller.

This also decides **what step 6's "verify by running `loom report`" even means**: under (a) it means *I* (the agent) run the brief and create the doc; under (b) the command itself must drive synthesis headlessly.

**One I'll just decide unless you object** (minor): `report` is born `status: active`, and is **excluded from derived thread-status and staleness** (a leaf snapshot, like `ctx`/`reference`) — so a thread with reports isn't held "open" by them.

My combined rec: **1(a) + 2(a)** — minimal frontmatter + provenance in the body, and a brief-returning CLI/prompt. That keeps slice 1 genuinely cheap and invents no new machinery. Pick per fork (or endorse the combo) and I'll run the plan through.

## Rafa:

- Fork 1: a
- Fork 2: a

## AI:

Kept going into step 2 and read the fs/loading layer (`weaveRepository`, the create use-cases) — and hit a **foundational architecture decision the design glossed**, deeper than forks 1–2. Not thrashing: this only became visible by reading the code, which is exactly why step 2 shouldn't proceed on a guess.

**The finding:** in the current model *everything hangs off a weave.* `loadWeave` loads threads + weave-root loose fibers + `chats/` + `refs/`; `LoomState`/`LinkIndex` are built from weaves. **There is no loader for a top-level `loom/reports/` directory** — a cross-weave doc has no home in the graph today. And slice 1's `project-overview` is roadmap-scoped = cross-weave = precisely that homeless case. (Bonus finding: the newer create paths — `createReference`, `req` — are **plain app use-cases, not core events/reducers**, so step 2's "create-report event + reducer" was the wrong pattern anyway; the real work is smaller.)

So the real fork is: **do reports join the in-memory doc graph, or are they standalone artifact files?**

- **(A) Standalone artifact files — NOT loaded into `LoomState`.** `loom_create_report` writes `loom/reports/{…}.md` (cross-weave) / `loom/{weave}/reports/{…}.md` (weave-scoped) with proper frontmatter; `getState` never loads them. They're versioned markdown *in the repo* (on-disk "in the graph"), and being outside state makes them **automatically** excluded from refs / staleness / derived-status / requires_load — which is exactly how we characterized a report (a leaf snapshot excluded from everything). Step 5 becomes a near no-op. The future extension `Reports` node reads the dir directly. **Smallest, cleanest, and it matches the "excluded from everything" spec by construction.** ← strong rec
- **(B) First-class graph citizens** — new `Weave.reports` bucket + a top-level loader for `loom/reports/` + `LinkIndex`/`LoomState`/`getState` changes. Makes reports queryable in state, but it's the biggest blast radius in the codebase for the least slice-1 value, and then I'd have to *re-exclude* them from refs/staleness/derived one by one.

This does revise the design's implicit "reports are first-class docs loaded like others" — worth a one-line design amendment either way.

My read: **(A)**. It's the honest cheapest slice, it's correct-by-construction for the exclusions, and "queryable reports in state" is a clean additive follow-up if we ever want it. Your call — A or B — then I run the plan through (with the step-2 description corrected to a plain use-case + artifact write).

## Rafa:

(A)

## AI:

Slice 1 shipped and recorded. `do plan` → all 6 steps done, plan-001 auto-closed; `docs done` swept idea + design + this chat to `done`.

**What landed:**
- `report` doc type in core (`rp_` ULID, minimal snapshot frontmatter).
- `createReport` use-case + `loom_create_report` tool — standalone artifact under `loom/reports/` (cross-weave) or `loom/{weave}/reports/`, with a body `## Provenance` section.
- Kind registry (core) + `report` prompt + `loom report <kind>` CLI. Verified live: `loom report project-overview` returns the roadmap slice + framing + persist call.
- Three exclusions enforce storage decision A — reports stay out of `LoomState`, the link index, refs, and diagnostics (no phantom weave/thread). New `tests/reports.test.ts` guards all of it; full suite green.

**Two judgment calls I want on your radar (reopen if you disagree):**
1. `docs done` marked idea + design `done`, but they describe the *full* feature — follow-up slices (kind catalog, filters, extension `Reports` node + generate action, refresh-in-place) are captured as deferred inside them. They'd land as **new threads** citing this design, or a refine that reopens it. If you'd rather keep the design `active` as the living spec, say so and I'll flip it back.
2. Committing as **two** commits, not one — the slang `read`→`reply` fusion and the report feature are independent, so they get separate history even though you said "commit" once.

Committing now.