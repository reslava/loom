---
type: idea
id: ctx-context-rename-idea
title: "Rename ctx → context, summarise → summarize"
status: deferred
created: 2026-04-22
version: 1
tags: [naming, ctx, context, summarize, refactor, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Rename ctx → context, summarise → summarize

## Problem

The `ctx` doc type is an opaque abbreviation and `summarise` uses British spelling. Together they create a naming inconsistency that makes the vocabulary harder to read.

## Idea

Rename the doc type from `ctx` to `context` (files: `*-ctx.md` → `*-context.md`) and the command from `loom.summarise` to `loom.summarize`. Both changes are mechanical but touch the full stack.

## Why now

Deferred — the rename is purely cosmetic and the churn isn't worth it while core features are still being built. Revisit when the doc type system stabilises.

## Open questions

- Do we also rename the `CtxDoc` TypeScript interface to `ContextDoc`?
- How do we migrate existing `*-ctx.md` files in the repo?

## Next step

design
