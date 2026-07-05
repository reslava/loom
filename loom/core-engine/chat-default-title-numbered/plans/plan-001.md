---
type: plan
id: pl_01KWRRHBFFVMEJNKC64JSAWAVY
title: chat-default-title-numbered Plan
status: done
created: 2026-07-05
updated: 2026-07-05
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 1.17.0
steps:
  - id: numbered-the-default-chat-title-chatnew
    order: 1
    status: done
    description: "Numbered the default chat title: chatNew now appends the filename ordinal (formatOrdinal) so a default-named chat is titled \"{scope} Chat NNN\" (e.g. \"core-engine Chat 002\") instead of a bare \"{scope} Chat\" shared by every sibling. Reuses the ordinal already computed for the filename; an explicit title still overrides."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# chat-default-title-numbered Plan

## Goal

Numbered the default chat title: chatNew now appends the filename ordinal (formatOrdinal) so a default-named chat is titled "{scope} Chat NNN" (e.g. "core-engine Chat 002") instead of a bare "{scope} Chat" shared by every sibling. Reuses the ordinal already computed for the filename; an explicit title still overrides.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Numbered the default chat title: chatNew now appends the filename ordinal (formatOrdinal) so a default-named chat is titled "{scope} Chat NNN" (e.g. "core-engine Chat 002") instead of a bare "{scope} Chat" shared by every sibling. Reuses the ordinal already computed for the filename; an explicit title still overrides. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
