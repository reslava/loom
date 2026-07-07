---
type: done
id: pl_01KWYNA01G1Y58ZZK64XATYHKX-done
title: Done — context-load-by-need Plan
status: done
created: 2026-07-07
version: 1
tags: []
parent_id: pl_01KWYNA01G1Y58ZZK64XATYHKX
requires_load: []
---
# Done — context-load-by-need Plan

Outcome of context-load-by-need chat-001: rejected the original load-by-need/deferral proposal (it fights Loom's north star of always-contextualized AI, and the design-proposal floor eats the deferral window anyway). The real defect was timing, not amount — context was being loaded after a code-first answer instead of up front. Fix is a one-clause sharpening of the existing `rule:context-injection` shared rule, not a new mode system. Both surfaces edited in place (marker set unchanged, 15 rule ids still parity-matched, 12 invariant tokens present). No code change to the MCP server.
