---
type: done
id: pl_01KXKV3Y5Z39FXBFKKTJKF6P7A-done
title: Done — Roadmap thread-click opens the latest open chat first
status: done
created: 2026-07-15
version: 1
tags: []
parent_id: pl_01KXKV3Y5Z39FXBFKKTJKF6P7A
requires_load: []
---
# Done — Roadmap thread-click opens the latest open chat first

Quick-shipped — recorded already-completed work:

1. Reworked resolveThreadDocPath (packages/vscode/src/tree/treeProvider.ts) so clicking a roadmap thread node prefers the latest still-open chat (status 'active', latest by created date then id) before falling back to design → idea → thread.md — so clicking a thread resumes the live conversation instead of always opening the spec. Status-gated: done/archived chats are skipped, so a wrapped-up thread degrades to the spec. Single caller (roadmap thread-click), so nothing else changes. Built, typechecked, and ran the suite (23/23) green.
