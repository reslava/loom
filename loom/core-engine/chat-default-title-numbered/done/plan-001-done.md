---
type: done
id: pl_01KWRRHBFFVMEJNKC64JSAWAVY-done
title: Done — chat-default-title-numbered Plan
status: done
created: 2026-07-05
version: 1
tags: []
parent_id: pl_01KWRRHBFFVMEJNKC64JSAWAVY
requires_load: []
---
# Done — chat-default-title-numbered Plan

Single-site change in packages/app/src/chatNew.ts (the only place default chat titles are minted; loom_create_chat delegates to it). Imported formatOrdinal from core, hoisted the nextOrdinal result into `ordinal`, and built the fallback title as `${scopeId} Chat ${formatOrdinal(ordinal)}`. Verified against built dist: chat-001/002/003 → "refs Chat 001/002/003", explicit title still wins. Built clean with build-all.
