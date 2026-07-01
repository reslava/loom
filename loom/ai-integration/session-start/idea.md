---
type: idea
id: id_01KWDB80YJ6Q9AQ7CAQED83PV2
title: Cheap, scoped session start
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: null
requires_load: []
---
# Cheap, scoped session start

## What

Make session start **cheap and scoped**: stop reading the full `loom://state` graph (~2 MB) just to learn which thread is active, and replace it with a small always-loaded project map plus a deep load of only the thread the user points at.

## Why it matters

The current session-start protocol (step 4) reads `loom://state?status=active,implementing` to discover active work. Measured on this repo that payload is **2.02 MB** — and 93% of it is the live `weaves` doc graph (95 threads / 84 plans / 465 steps serialized in full; ~28% is pretty-print whitespace). The `status` filter shaves only ~7%, because it filters at the *weave* level and the active weaves *are* the big ones. Archives and the link index are negligible — the size is an **altitude mismatch**, not a leak: the resource hands back the entire derived graph to answer a question that needs a few hundred bytes.

Two consumers, two needs:
- The **VS Code tree** legitimately needs the whole graph to render every weave/thread/badge.
- An **AI session** almost never does. When the user points me at a chat or doc, that pointer *already names the active thread* — so the breadth scan is redundant on every pointed start (which is nearly all of them).

This directly serves the vision's "*both always know weaves/threads state*" and "*AI as stateful via cheap rereads it does at every action*": today every session pays 2 MB to learn one thread id.

## Success criteria

1. **Dead code removed** — `loom://state`'s parsed-but-unused `threadId` param is deleted (no consumer; finishing it would be a half-feature with no caller).
2. **A lightweight map exists** — `loom://state?shape=summary` returns the weave/thread skeleton + status (no step bodies, no doc content), ~10–15 KB on this repo vs 2 MB, as a projection of the state already computed.
3. **Session-start protocol rewritten** — ctx → vision/workflow → catalog → `state?shape=summary` (always, the cheap map) → `do-next-step` / `context/thread/{weave}/{thread}` only for the thread the user pointed at. No unconditional full-state read.

## Out of scope

- Changing what the VS Code tree reads (it keeps the full `loom://state`).
- A thread-scoped *structured-state* resource — `do-next-step` + `context/thread` already cover the pointed-thread need; the summary map covers orientation/placement.
