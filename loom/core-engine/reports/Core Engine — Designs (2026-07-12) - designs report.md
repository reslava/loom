---
type: report
id: rp_01KXC1HB5WJQKCA1SRDAARGEKF
title: "Core Engine — Designs"
status: active
created: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
kind: designs
generated_at: "2026-07-12T20:50:39.932Z"
---
# Core Engine — Designs Report

*Kind: `designs` · scope: weave `core-engine` · synthesized from a **budget-degraded** slice (22 of 32 designs read in full).*

## Coverage & method

Synthesized from the `designs` slice of the **core-engine** weave: **32 design docs, 211,746 chars (~53k tokens)** at full size. Under the kind's 150k-char budget the slice degraded to **22 full · 0 summary · 10 reference-only** (150,463 chars emitted).

> **A caveat that shapes this report:** degradation is by **recency**, so the **10 oldest designs — the architectural bedrock (2026-04-11 → 04-17) — are the ones dropped to reference-only.** They are named at the end but were not read in depth here. This report covers the 22 more-recent designs in full and the foundations by title only. For a complete pass: `loom report designs --weave core-engine --full` (~53k tokens).

The engine also flagged that **core-engine has no `ctx` doc** — generating one would let future budgeted runs *summarize* the tail instead of dropping it.

## The design story (22 designs read, grouped)

### Domain model & identity
- **Weave & Thread — the true graph model** (`de_01KQYDFDDCMH30S303HF03ET00`). The bedrock metaphor: a **Weave** is a project folder, a **Thread** a workstream under a strict **one idea → one design → N plans** rule. Alternatives are never multiple designs in one thread — they are **separate threads linked by `parent_id`** ("threads are cheap; splitting *is* the model"). Loose fibers are weave-root docs not yet in a thread. Nearly everything else assumes this shape.
- **Doc IDs — ULID identity with slug presentation** (`de_01KQYDFDDBE8A6JD6P57DM5HV4`). Durable identity is a **prefixed ULID** (`pl_`, `de_`, `id_`…); filenames stay human-readable presentation; `child_ids` is dropped (derived from `parent_id` via the link index). **ctx is the documented exception** — it keeps a semantic id (`loom-ctx`, `{weave}-ctx`) and is auto-loaded by path scope, never via `requires_load`. Refs are slug-addressed and consolidated into a single global `loom/refs/`.
- **Loom entities CRUD** (`de_01KWEGNABRHPMVY50E6DGRX4WQ`) + **API contract — unambiguous naming + canonical ULID** (`de_01KWKFHSXS96W36BE28VYFG64P`): the naming law that a `*Ulid` parameter is always a ULID and `*Slug` a folder slug — the convention the whole MCP/CLI surface now speaks.

### Staleness (three passes converging on one model)
- **Staleness Management** (`de_01KQYDFDDC911HGHRQGZV1ZSCA`): staleness is **child-driven, never parent-driven** — refining an idea *marks* the design stale, it never silently rewrites it; the user decides when to refine. Implementing against a stale design **warns, doesn't block**.
- **Trustworthy staleness — directional, version-based model** (`de_01KWCR8E1NC37G0GW05A14X9C9`) + **Align stale surfaces** (`de_01KWC4K9YJ2R4GJJR7VS6X1ADX`): the later consolidation onto one canonical, directional, version-based definition shared across every surface — the corpus correcting an earlier ad-hoc version toward a single model.

### Context (ctx)
- **Unify ctx filenames to plain `ctx.md`** (`de_01KQYDFDDBPFWTRWDMCAH1V45S`): **path = scope**; the filename is always `ctx.md`, the frontmatter `id` carries durable identity.
- **ctx docs not loaded by getState** (`de_01KSTFX5FNN132HHSFHNSK497C`) + **Consolidate ctx generators into one** (`de_01KSYEC48HS5VPGRDK5FFDPDFH`): fixing ctx to actually load into state, and collapsing multiple generators into one (**global + weave** scope). *(This weave still has no ctx — the gap the report engine flagged live.)*

### Records, archive & fast paths
- **Done Documents** (`de_01KQYDFDDBYKHS1J703PFE3P9T`): a first-class **write-once `done` type** recording *what actually happened* per plan (what was built, decisions made during implementation, open items) — the raw material a drift-audit or shipped report reads.
- **Quick-ship** (`de_01KWJD3J9MB1XC6XE32QXWDWGA`): a one-call recorder that mints a `done` plan for already-finished work, so fast fixes still land in versioned history.
- **Archive management** (`de_01KQYDFDDAGQTWJZT0PAE09GTQ`): a central `loom/.archive/{reason}/{mirrored-path}` layout (cancelled / deferred / superseded / chats), chosen (Option B) for visual obviousness and zero frontmatter dependency in tree rendering. **Archive must move atomically** (`de_01KWH5FR1BGXFH3GBKECKHG9DF`) later hardened it against silent copies.

### Roadmap, releases & dates
- **Derived Roadmap** (`de_01KV3GPTMNXT66C4N73WAFN7ZW`): the cross-weave roadmap (future / present / history) **computed** from thread state + priorities — a derived view, not a maintained doc.
- **Roadmap carries the release version** (`de_01KVA7ABHNH0MC2FZSS1PPT4J7`): `actual_release` on plans as the single carrier, `current_release` derived from it.
- **Canonical Date Handling** (`de_01KV7K8QRWASFRVD0RECSB96D2`): one date model across the engine.

### Workflow, requirements & agent DX
- **Requirements-Driven Development** (`de_01KTBA3MSAGGDWC5G55A49JN4T`): the optional **`req` doc type** — a thread's locked Included / Excluded / Constraints scope, always-loaded, with plan-vs-req coverage verification.
- **Scope runEvent saves to the changed doc set** (`de_01KSNACN3T97M7HVG3K0W3WBQB`): a correctness/perf fix so a mutation writes only what changed, not the whole weave.
- **Agent doc-tooling DX** (`de_01KT3FG3M865N54WBT3Z95T20Y`): id/path transparency + create-doc-with-body, so an agent creates a doc with real content in one call.
- **`loom_create_plan` normalizes blockedBy ordinals** (`de_01KWGTDV2BKCYGE8THQYVBPXT3`) + **MCP read-surface naming** (`de_01KWYVRS94S3K18HDRSVPHNE4K`): the finishing sweeps aligning step-dependency handles and the read surface to the ULID/slug contract.

## Foundations — reference-only (not read under the budget)

The 10 earliest designs (2026-04-11 → 04-17), the bedrock the above build on, dropped to reference-only by the recency budget:

- Core Engine Design · `de_01KQYDFDDB802XEJM0S329T9WW`
- Workflow Feature Model · `de_01KQYDFDDFPJETSXVMRDSKD8C2`
- Workspace Directory Structure · `de_01KQYDFDDCB06E6V25HT94VAP3`
- Application Version Tracking · `de_01KQYDFDDF3J8F6P5F3VJQ8BWQ`
- Dependency Tracking in Plans · `de_01KQYDFDDBCXYVBTRHGT38887N`
- Structured Link Index · `de_01KQYDFDDCQ0DBXVNCSCK57P7M`
- Automatic Document ID Management · `de_01KQYDFDDC2GWRSG7TVP5Z5MAN`
- Application Layer for Clean Architecture · `de_01KQYDFDDA1XV31SK6N64VS0ST`
- Document Body Generators & Utility Extraction · `de_01KQYDFDDAGJ0Q2B1E1R2ZQ67W`
- BaseDoc — Foundational Document Interface · `de_01KQYDFDDATTCNZQCNB0JR0Z0F`

To pull these in: `--full`, or `--since 2026-04-11 --until 2026-04-20`.

## Findings

1. **Recency budgeting drops the wrong tail for a `designs` report.** The foundational designs (link index, clean-architecture layering, BaseDoc, id management) are exactly what a designs/architecture reader most wants — and they are the ones degraded. For this kind, **oldest-first or `--full` is the better shape**; recency-first suits "what changed lately," not "the design corpus." This reinforces the recency finding from the decisions report — worth acting on before these reports go into a README.
2. **core-engine has no ctx.** With one, the budget could summarize the tail instead of dropping it (the engine's live suggestion).
3. **The corpus visibly self-corrects.** Staleness took three passes (ad-hoc → directional model → surface alignment); archive was hardened (taxonomy → atomic move); naming got a contract refactor + a read-surface sweep. That iteration history is itself the decision-memory a codebase-only view cannot show.

## Provenance

- **Kind:** designs
- **Scope:** weaves: core-engine; threads: all; from: —; to: —
- **Sources:** de_01KQYDFDDCMH30S303HF03ET00, de_01KQYDFDDBYKHS1J703PFE3P9T, de_01KQYDFDDBE8A6JD6P57DM5HV4, de_01KQYDFDDC911HGHRQGZV1ZSCA, de_01KQYDFDDAGQTWJZT0PAE09GTQ, de_01KQYDFDDBPFWTRWDMCAH1V45S, de_01KSNACN3T97M7HVG3K0W3WBQB, de_01KSTFX5FNN132HHSFHNSK497C, de_01KSYEC48HS5VPGRDK5FFDPDFH, de_01KT3FG3M865N54WBT3Z95T20Y, de_01KTBA3MSAGGDWC5G55A49JN4T, de_01KV3GPTMNXT66C4N73WAFN7ZW, de_01KV7K8QRWASFRVD0RECSB96D2, de_01KVA7ABHNH0MC2FZSS1PPT4J7, de_01KWC4K9YJ2R4GJJR7VS6X1ADX, de_01KWCR8E1NC37G0GW05A14X9C9, de_01KWEGNABRHPMVY50E6DGRX4WQ, de_01KWGTDV2BKCYGE8THQYVBPXT3, de_01KWH5FR1BGXFH3GBKECKHG9DF, de_01KWJD3J9MB1XC6XE32QXWDWGA, de_01KWKFHSXS96W36BE28VYFG64P, de_01KWYVRS94S3K18HDRSVPHNE4K
- **Generated:** 2026-07-12T20:50:39.932Z
