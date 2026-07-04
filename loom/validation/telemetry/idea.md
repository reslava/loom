---
type: idea
id: id_01KWP9GAY7TYGS7NFKC5KFZAJ3
title: Opt-in usage telemetry — what is actually used
status: done
created: 2026-07-04
version: 1
tags: []
parent_id: null
requires_load: []
---
# Opt-in usage telemetry — what is actually used

## Problem

Same silence as the `user-feedback` thread, but the missing signal here is *quantitative*: which commands get used, whether users actually run the workflow loop (chat → generate → do-step → done) or stall, where errors happen, and whether they return. Installs and clones say nothing about behavior. Without this, feature priorities are guesses.

## What we want to build

Lightweight, **opt-in**, privacy-respecting usage telemetry:

- A **small** set of high-value events: activation/install, which `loom_*` tools / commands fire, workflow-phase transitions, error surfaces, and returning-session retention.
- A free/cheap sink — e.g. **PostHog free tier** (Rafa flagged it) or similar.
- **Anonymous and content-free:** a random install id, and *never* document content, file paths, titles, weave/thread names, or any PII. Transparent about exactly what is sent.
- **Off by default; explicit opt-in** with a clear one-time disclosure and an easy off switch (a setting + a `loom` flag / env var).

## Why it matters

Passive telemetry complements active feedback: feedback tells us *why*, from the few who speak; telemetry tells us *what*, across the silent many. Together they turn ~4.3K blind installs into a picture of real usage — the evidence needed to decide whether, and where, to keep investing.

## Not this (scope guard)

- Not a replacement for feedback (sibling thread) — numbers without narrative mislead.
- No content, no PII, no per-project identifiers. If in doubt, do not send it.

## Open questions

- **Provider:** PostHog free tier vs. a minimal self-hosted endpoint vs. GitHub-based counters — trade-offs in cost, privacy optics, and setup.
- **Consent model:** opt-in only (safest, honest, lower volume) vs. opt-out (more data, worse optics). For a trust-sensitive dev tool, opt-in is the default worth defending.
- **Event schema:** the minimal set that answers "is the loop used and where do people stall?" without scope creep.
- **Surface:** extension only, or the CLI too (the CLI is where MCP / agent usage actually happens).

## Success criteria

- Opt-in, disclosed, content-free telemetry that a privacy-conscious developer would accept.
- Captures a *small* set of events answering: is Loom activated, is the workflow loop used, where do errors/stalls cluster, do users return.
- Free or near-free to run; no heavy infra.
- A visible kill switch, and the README documents exactly what is and is not collected.