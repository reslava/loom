---
type: idea
id: id_01KWKDH801PGWJJCKECP3HZZ2A
title: Unambiguous Loom API naming + canonical ULID everywhere
status: done
created: 2026-07-03
version: 1
tags: []
parent_id: null
requires_load: []
---
# Unambiguous Loom API naming + canonical ULID everywhere

## Problem

Dogfooding Loom in chord-flow surfaced a create-path bug: `loom_create_idea(weaveId="guitar", threadId="th_01KWA2…38Y", …)` — where `th_01KWA2…38Y` is the **real existing thread's ULID** — did not place the idea in that thread. It created a duplicate thread folder named literally by the ULID (`loom/guitar/th_01KWA2…38Y/`), scaffolded a fresh `thread.md` with a *new* ULID, and left the real thread untouched. The idea was orphaned in a fabricated duplicate.

## Root cause — the *name*, not missing code

`threadId` in the create/scaffold use-cases is a **folder slug**, spliced straight into the path (`path.join(weavePath, input.threadId)`) with no ULID→folder resolution and no guard. A parameter ending in `Id` reads as "the stable ULID" — to the AI most of all, since the primary consumer of the `loom_*` API is a model that pattern-matches on the parameter name. The name told the caller to pass the ULID; the code wanted the slug. The API misled its own author-and-consumer, which is the strongest evidence the name is wrong.

Two aggravating mechanisms turned the ambiguity into silent data corruption:
- `assertValidThreadId` only rejects slashes / `..` / reserved names — a `th_…` ULID passes, so it is accepted as a literal folder name.
- The auto-scaffold seam (`ensureThreadManifest` → `createThread`) converts an unrecognised thread reference into "invent a new thread" instead of erroring.

This is **systemic**, not one tool: every create/scaffold/promote use-case keys on `weaveId + threadId`-as-folder and shares the silent-duplicate failure. Mutate ops (`setThreadPriority` / `setThreadDeps`) already resolve by ULID — the create family is the inconsistent outlier.

## What we want to build

Make the Loom API's parameter names unambiguous and make canonical use of ULIDs everywhere they are the true identity. Concretely, three deliverables:

1. **Naming convention** — a citation-loaded reference (`loom/refs/api-naming-reference.md`) plus a hard-rule short-form in `CLAUDE.md` (CLAUDE.md only; no `LOOM_CLAUDE_MD` template mirror, no `rule:` marker — authoring Loom's own API is repo-specific). The rule: a parameter ending in `Id` MUST mean the stable ULID; a slug/folder parameter is never named `*Id` (use `weave`, `weaveSlug`, `weaveFolder`, etc.); every Loom entity **except weave** has a ULID as its canonical, rename-survivable reference handle.
2. **Audit** — a read-only inventory of every `loom_*` tool and app use-case parameter, each classified ULID-ref / slug / title / body, with every ambiguity flagged. This finalizes the convention from all real cases, not just `threadId` / `weaveId`.
3. **One comprehensive breaking refactor** — apply the convention and canonical ULID resolution across the whole API in a single pass: rename ambiguous params (`weaveId → weave`, `threadId` → ULID meaning, …), add a shared ULID→folder resolver, and remove the create-into-a-nonexistent-thread auto-scaffold seam (a doc-create must never fabricate a thread; an unresolvable reference must error, never invent). Then release.

## Why it matters

Loom's whole premise is that structured docs are the shared context and the API is how the AI acts on them. The primary consumer of that API is a language model that reasons from parameter names. So **unambiguous naming is load-bearing, not cosmetic** — a misleading name is a latent data-corruption bug, as this case proved by corrupting real data from a single natural call. It also removes a manual step the vision cares about: the user should be able to reference a thread by the identity Loom exposes (`loom://state` gives ULIDs) without translating it to a folder slug by hand.

## Success criteria

- No `loom_*` parameter named `*Id` accepts a slug; slug parameters are renamed accordingly.
- Referencing any entity (except weave) by its canonical ULID resolves to the right target; an unresolvable/`th_`-shaped reference **errors** rather than fabricating a duplicate.
- A doc-create never invents a thread — thread creation is explicit.
- Regression test: `create_idea` with an existing thread's ULID lands the idea in that thread; with an unknown ULID it throws.
- The naming convention is documented (reference + CLAUDE.md hard rule) and the full API conforms after the audit + refactor.

## Scope / sequencing (agreed)

Roadmap: **1** naming reference + CLAUDE.md rule → **3** audit → **4** comprehensive breaking refactor + release. An interim non-breaking patch was considered and **dropped** — nobody is waiting, so the two safety invariants (no fabrication, unresolvable-ref errors) fold into the step-4 refactor rather than shipping as a short-path patch. Since Loom has no external users, the breaking change is done once, comprehensively, not in two waves. The convention doc (1) is provisional-pending-audit; the audit (3) finalizes it before (4).
