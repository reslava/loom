---
type: design
id: de_01KXG0081KSJXYKTD6HYWK75XN
title: ctx scope & surface parity
status: done
created: 2026-07-14
version: 1
idea_version: 2
tags: []
parent_id: id_01KXC5B8CFZJANSMRTSCGEFP8K
requires_load: []
---
# ctx scope & surface parity

## Decision recap

ctx is **global-only**. One `loom/ctx.md` per project; weave-level ctx retired. This design delivers option **A-plus**: global-only ctx with the visibility, freshness signal, and tri-surface parity a weave-ctx feature would have needed — applied to the single global doc. Decision + reasoning: `chat-001`.

## 1. Information model (the constraint everything else serves)

Four always-distinct levels, no redundant summaries:

| Level | Job | Loading |
|-------|-----|---------|
| CLAUDE.md / CLAUDE-LOCAL.md | rules & workflow contract (*how to behave*) | always |
| **loom/ctx.md** | architecture / API / stack (*what the project is*), links refs | always |
| loom/refs/*.md | deep detail | citation-loaded via `requires_load` |
| thread ctx (idea/design/plan) | working detail | parent-chain, on demand |

Design rule: **ctx.md never restates a rule from CLAUDE.md and never inlines what a ref holds — it links the ref and says when to load it.** That is what keeps four levels from collapsing into duplication.

## 2. The pillar template

Default, customizable section schema, used when `loom/ctx.md` does not yet exist:

- **Architecture** — layers/packages, dependency rule, module boundaries, one-line mental model. → deep ref.
- **API & contracts** — public surfaces, naming conventions, invariants. → deep ref.
- **Stack** — language, tech, libraries, dependencies + why.
- **Build, test & CI** — how to build/test, what CI enforces.
- **Documentation map** — the refs and *when* to load each (citation-loaded).
- **AI collaboration** — project-specific AI notes not already in CLAUDE.md.

The doc header carries the split note ("always-loaded architecture & API companion to CLAUDE.md; no rule restated here"). Each pillar = an HTML-comment authoring hint + content + optional `→ Deep:` ref link.

**Where it lives:** the default template is a constant in the ctx generator (project-agnostic), *not* a file. Once `ctx.md` exists, its own headings are the schema.

## 3. Refresh behavior (`loom_refresh_ctx`, global-only)

Three modes, one invariant — **existing sections are always preserved**:

1. **ctx.md absent, generate** → produce from the default pillar template.
2. **ctx.md absent, seed-skeleton-only** → write just the pillar headings + authoring hints (no inference), for the user to edit before a real generation.
3. **ctx.md exists, refresh** → re-pour content under the doc's *current* headings; never rewrite the section structure.

Tool changes:
- **Remove `scope: "weave"`** — the parameter and the `loom/{weave}/ctx.md` write path are deleted (no deprecation shim; clean removal).
- Add a `skeletonOnly` flag (or `mode: "skeleton"`) for mode 2.
- On write, stamp `last_refreshed` (date) in frontmatter.

## 4. Staleness — none, by decision

No automatic stale signal for global ctx: a hash-based one is untrustworthy (noise, or false calm when architecture changes in code but not in a hashed doc), and the only accurate one (AI judges at plan-finish) is off-spine auto-inference. Instead:

- Refresh is **always available** — never gated on a "stale" flag.
- `ctx.md` shows **"last refreshed: {date}"** — an honest recency signal; the user decides.
- The auto-detect-at-plan-finish path is parked in its own thread (`core-engine/ctx-auto-refresh-inference`) — see §7.

## 5. Tri-surface parity (the reason this thread exists)

| Capability | MCP | CLI | Extension |
|-----------|-----|-----|-----------|
| Refresh ctx | `loom_refresh_ctx` (global-only) | `loom refresh-ctx` | `loom/ctx.md` node → *Refresh* |
| Seed skeleton | `loom_refresh_ctx` `skeletonOnly` | `loom refresh-ctx --skeleton` | (optional) *Seed skeleton* |
| See ctx + recency | doc resource | `loom refresh-ctx` shows it / status | ctx node + "last refreshed: {date}" |

The CLI `loom refresh-ctx` mirror is the concrete parity gap named in chat and must land in this thread.

## 6. Dogfood: refactor our own `loom/ctx.md`

Bring `loom/ctx.md` onto the pillar template in the *same* thread:
- Drop section 4 "Rules — how to act in Loom" (duplicates CLAUDE.md stop rules / MCP visibility / chat-surface rule).
- Reduce the concept/glossary restatement (sections 1–2) to a one-line pointer; that content lives in CLAUDE.md + refs.
- Keep and expand architecture, API/naming, and surface-forms into the pillar sections.
- **Doing this may surface new default template sections — fold discoveries back into the template constant.**

## 7. Out of scope / parked

- **Auto-fire ctx refresh inference at plan-finish** → own thread `core-engine/ctx-auto-refresh-inference` (future nice-to-have).
- **AI auto-classifying threads into weaves** → off-vision, not pursued.

## 8. Doc sweep

Shift to global-only wording in: `loom/ctx.md` (self), `refs/architecture-reference.md` (doc-type table / ctx rows + stale rules), the ctx line in `refs/workflow-reference.md` ("global + weave" → "global"), any ctx mention in `CLAUDE.md` **and** the `LOOM_CLAUDE_MD` template, and the doc-graph-reports oversized-ctx suggestion (plan-006) — reword away from the weave-ctx nudge.

## 9. Build slice (plan preview)

1. Remove `scope:"weave"` from `loom_refresh_ctx`; delete the weave-ctx write path + its tests.
2. Pillar-template constant + generator: default-when-absent, preserve-sections-when-present, `skeletonOnly` mode; stamp `last_refreshed`.
3. CLI `loom refresh-ctx` (+ `--skeleton`) mirroring the tool.
4. Extension: `loom/ctx.md` tree node with *Refresh* action + "last refreshed: {date}".
5. Refactor our own `loom/ctx.md` onto the template (shed duplication); fold new sections back into the constant.
6. Doc + reports sweep to global-only.