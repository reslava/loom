---
type: idea
id: id_01KX3TA3059YGZ15GK1Y5J5YVC
title: Self-hosting repo guard for loom install
status: done
created: 2026-07-09
version: 1
tags: []
parent_id: null
requires_load: []
---
# Self-hosting repo guard for loom install

## What

Make `loom install` a **near-total no-op** on a self-hosting Loom repo — the Loom source repo itself and any fork of it — gated by an explicit `selfHosting: true` flag in `.loom/settings.json`. When the flag is set, `installWorkspace` returns before touching any file.

## Why it matters

`loom install` runs from three entry points — the CLI, the `loom_install` MCP tool, and the extension **silently on every activation**. On a normal project this is exactly right: it writes the project-agnostic session contract to `.loom/CLAUDE.md` and patches the root `CLAUDE.md` to import it.

On the Loom **source** repo it is wrong and quietly dangerous:

- This repo's contract is the bespoke **recursive** `CLAUDE.md` (rules for building Loom with Loom). The install-written `@.loom/CLAUDE.md` import silently layers the **generic** template contract on top of it — the wrong contract, injected invisibly into every session here.
- `.loom/CLAUDE.md` and `CLAUDE-LOCAL.md` are **gitignored + untracked**, so git never surfaced the drift, and the extension **rewrites `.loom/CLAUDE.md` on every activation**.

This serves the vision's "drop `loom install` into any repository and it just works" (install must be safe and idempotent everywhere) and protects the "Loom builds itself" dogfooding case. The manual step it removes: reverting install's writes / untangling the wrong contract on the dev repo.

## Success criteria

- With `"selfHosting": true` in `.loom/settings.json`, `installWorkspace` returns early — every result field `false` plus a `skipped: "self-hosting"` marker — **before** any filesystem write, and the short-circuit sits **above** the `input.force` branch so `--force` cannot override it.
- The flag is read through `ConfigRegistry` (the existing `.loom/` config seam), not a direct file read.
- CLI reports `self-hosting repo — skipped`; the extension's activation-time install short-circuits with zero writes (same code path, automatic).
- On this repo the artifacts are cleaned up: the flag is set (committed), `.loom/CLAUDE.md` + `CLAUDE-LOCAL.md` are deleted, and the two `@import` lines are removed from root `CLAUDE.md`.
- `test-all` stays green — the CLAUDE.md sync test reads root `CLAUDE.md` + the `LOOM_CLAUDE_MD` template only, never `.loom/CLAUDE.md`, and the removed `@import` lines are neither a `<!-- rule:id -->` marker nor an invariant token.

## Approach — 4 ordered steps (sequencing is load-bearing)

The currently-installed extension has **no guard yet**, so any file cleanup done before the guard ships is undone on the next activation (it recreates `.loom/CLAUDE.md` and re-prepends the imports). Order is therefore non-negotiable:

1. **Guard** — read `selfHosting` via `registry`; early no-op above the `--force` branch; CLI `self-hosting repo — skipped` message. Then `build-all.sh` **and reload the extension** so the running server has it.
2. **Set the flag** — `"selfHosting": true` in `.loom/settings.json` (tracked; travels with the repo).
3. **Delete** `.loom/CLAUDE.md` + `CLAUDE-LOCAL.md`.
4. **Strip imports** — remove the `@.loom/CLAUDE.md` / `@CLAUDE-LOCAL.md` lines from root `CLAUDE.md`.

Steps 2–4 are only safe once step 1 has shipped and the extension has reloaded.

## Recording note

For a change this size, record the finished work as a single DONE plan via `loom_quick_ship` (citing this idea) rather than generating a pending plan and stepping through `do_step`. Quick-ship is post-work, so it runs **last**, after steps 1–4 are implemented and verified.
