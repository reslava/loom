---
type: idea
id: id_01KXAT9JZJ8XZ14TPK8F95P4HB
title: Doc-graph reports — analytical reports generated from Loom's project history
status: done
created: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
---
# Doc-graph reports — analytical reports generated from Loom's project history

## What we want to build

A **report** feature that generates analytical reports from the **Loom doc graph** — chats, ideas, designs, plans, done docs, roadmap — rather than from the codebase alone. The point is to extract the **meta-information that does not live in code**: *why* decisions were taken, where implementation drifted from design, what shipped and when, where the weak points are.

A report is produced by an AI agent that reads a *filtered, deterministic slice* of the doc graph and synthesizes it under a chosen **report kind** (project overview, architecture, decisions/why, release notes, drift audit, security, …). The result is saved back into the graph as a durable, versioned Loom doc.

Origin: `chats/chat-001.md` in this thread.

## Why it matters

- **It cashes in Loom's core bet.** Every other feature so far *builds* the doc graph; this is the first that *queries it as decision-memory*. Answering "why did we choose ULIDs over slugs?" or "what's the security posture of everything in v1.16?" today means manual archaeology through chats/designs/dones. A codebase-only AI structurally cannot do this — the rationale isn't in the code. Reports make it a one-command answer.
- **Vision fit.** Serves *"the AI becomes as stateful as it can be — via durable docs it rereads"* and directly removes a manual synthesis step no other tool touches.
- **Validation value.** This is the most **demo-able** feature on the board — "point Loom at your project's history, get a decisions-and-weaknesses report" sells the doc-graph premise in a single screenshot/GIF. That weighs heavily given Loom needs cheap external validation.

## Design stance (decisions grounded in chat-001)

1. **Report *kind* is the primary knob — it implies the doc-set.** The user picks *what kind of report*, and the kind determines which doc types feed it. The orthogonal "deep-level" matrix (chats / ideas / plans / done / all combinations) is explicitly **rejected as the front-door knob** — nobody should hand-tune the token/quality tradeoff per run. Deep-level survives only as an optional power-user override. Each kind reads the *minimum* doc-set it needs, which is also what keeps token cost bounded.

   Initial kind → doc-set map:
   | Kind | Reads |
   |------|-------|
   | project overview | roadmap (history + pending) |
   | architecture | designs + refs |
   | decisions / "why" | chats + designs |
   | release notes / changelog | done + roadmap (`actual_release`) |
   | design-vs-done drift audit | designs **vs** done |
   | security / weakness | designs + done + refs |

2. **Architecture: deterministic selection in the server, synthesis in the agent.** Split along Loom's existing seam (same as `do_step`):
   - **Server** owns *filtered doc-selection* — a deterministic, testable assembly ("bodies of docs matching {kinds, weaves, threads, date-from/to}"), a generalization of the context pipeline + `buildRoadmap`. Filters, dedup, ordering, token budgeting live here.
   - **Agent** owns *synthesis* — a `report` MCP prompt gathers that slice and hands the host agent "here are the docs, produce a {kind} report." Report generation is inference-heavy, so it must run in the real agent loop (where the tokens and tools are), **not** via captive `sampling/createMessage` (blocked in Claude Code for the same reason).
   - Shape: **one filtered-context resource/tool (deterministic) + one `report` prompt (parameterized by kind + filters).**

3. **Reports persist as Loom docs, versioned, back into the graph.** A "v1.16 architecture report" is itself durable decision-memory and belongs in the tree. Surfaced under a dedicated **`Reports`** tree node (new) rather than buried in `Refs`, filename pattern `{Title} ({date}) - {kind} report.md`.

4. **Tri-surface: launched from CLI (`loom report <kind> …`) and mirrored as an extension action** (per tri-surface command parity). Filters (weave/thread/date) are CLI flags / extension inputs.

## Relationship to `ctx` (keep them distinct, share the machinery)

A report is *close* to "a richer, on-demand, filtered ctx with an analytical lens" — so name the boundary to avoid building two summarizers: **ctx is scope-state the AI reads to *operate*; a report is a narrative artifact a *human* reads to *understand*.** Different audience, different lifecycle. But the underlying doc-selection machinery is **shared** with ctx, `loom://roadmap`, and the context pipeline — never a third parallel path.

## Adjacent features this same machinery unlocks (later)

- **Release notes / changelog** between two releases from done docs (`actual_release` already carries the data — nearly free).
- **Decision-provenance lookup** — "why do we do X?" traced to the chat/design turn where it was decided (targeted query, not a full report).
- **Onboarding brief** — "get an agent up to speed on weave Y" as a generated doc.
- **Design-vs-done drift audit** — the uniquely-Loom version of "inconsistency / conflict points."

## First slice (ship cheapest, validate, then expand)

- A single `report` prompt over **`loom://roadmap`** (already exists), one kind: **"project overview"**, **no filters**, persisted as a doc under `Reports`.
- Prove it lands / demos well before building the kind catalog + filters (weave/thread/date). **Do not build the full kind × filter × deep-level cube in the dark.**

## Success criteria

- `loom report project-overview` (CLI) and the extension equivalent generate a coherent overview report from the roadmap and save it as a versioned Loom doc under a `Reports` node.
- The doc-selection layer is deterministic and unit-testable independent of the AI synthesis.
- Adding a second report kind requires only declaring its doc-set + prompt framing — no new selection path.

## Open questions (deferred, not blocking the first slice)

- Exact frontmatter/type for a persisted report (new `report` doc type vs. a `reference` variant) and whether reports are refreshable/versioned like other docs or immutable snapshots.
- Filter grammar for the CLI (`--weave`, `--thread`, `--since`, `--until`) and how it maps to the extension inputs.
- Whether the deep-level override is worth exposing at all, or dropped entirely in favor of kind-implied doc-sets.
