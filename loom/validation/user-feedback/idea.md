---
type: idea
id: id_01KWP9G257MPBBMMK95Y4XPD9K
title: In-tool user feedback — turn silent usage into signal
status: done
created: 2026-07-04
version: 1
tags: []
parent_id: null
requires_load: []
---
# In-tool user feedback — turn silent usage into signal

## Problem

Loom has ~4.3K Open VSX installs plus steady GitHub repo clones, and **zero feedback**. We cannot tell whether anyone completes the workflow loop, hits walls, or gets value — the project's single biggest open question ("is this useful to someone who isn't me?") has no data behind it. The only feedback path today (find the repo, open a GitHub issue) is high-friction and self-selecting; almost nobody crosses it.

## What we want to build

A low-friction, opt-in, privacy-respecting way to send feedback from *inside* the tool, where the user already is:

- A one-click **"Send feedback"** affordance in the VS Code extension (a command + a small view/status-bar action), and a `loom feedback` CLI command.
- It opens a **prefilled** channel (a GitHub issue template / short hosted form / mailto) carrying only lightweight context — Loom version, OS. The user edits and sends; **never a silent send**.
- Optionally a tiny inline prompt at a natural "win" moment (e.g. after the first completed plan) — dismissible, shown once, never nagging.

## Why it matters

Validation is the project's north-star risk (a solo, unvalidated bet). A feedback channel converts silent installs into the qualitative signal that tells us whether to keep building and *what* to build next. It is cheap relative to any feature and attacks the "building in the dark" problem directly.

## Not this (scope guard)

- Not passive analytics — that is the sibling `telemetry` thread. This is *active*, user-initiated feedback.
- No dark patterns, no forced prompts, no PII harvesting. Everything is opt-in and visible.

## Open questions

- **Channel:** GitHub issue template vs. a hosted form vs. email — which is lowest-friction *and* reliably reaches Rafa?
- **Placement:** command palette only, a status-bar item, a tree action, or a one-time toast at a win moment?
- **CLI parity:** does `loom feedback` matter for v1, or is the extension enough (given agents/CLI users are a different audience)?

## Success criteria

- A user can send feedback in ≤1 click / one command, without leaving the editor.
- The message reaches Rafa with minimal context (version, OS) attached.
- Opt-in and unobtrusive: no background telemetry, no auto-send, at most one dismissible prompt.
- Ships cheaply — reuse GitHub / a free form; no backend to run.