---
type: idea
id: id_01KQYDFDD9AE2306D37KA2WNA3
title: Showing Docs Loaded Visibility
status: done
created: "2026-05-04T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Showing Docs Loaded Visibility

## Problem

When AI loads context docs (thread context, `requires_load` refs, global ctx), the user can't see what was loaded. They don't know whether the AI has stale or incomplete context. This undermines trust — the user guides the AI but can't see what it sees.

CLAUDE.md already defines MCP visibility prefixes (`📡`, `📄`, `📘`, `🔧`). But they're applied inconsistently and `chat_reply` has no clear rule.

## Idea

Every time AI loads context docs, it emits a visibility line showing what was loaded and from where. This is a **CLAUDE.md rule**, not a code change. The format already exists — we standardize its application.

**Before any AI response that uses loaded context:**
```
📡 MCP: loom://thread-context/{weave}/{thread}
📄 {doc}.md — loaded for context
📄 {doc}.md — loaded for context
```

**One line per doc.** No bulk lists. The user can scan vertically.

## Why now

The prefixes exist. The rule exists. It's just not applied systematically. This is the cheapest context-trust fix possible — no code, only CLAUDE.md text.

## Open questions

- Should the format be machine-parseable for future UI? → Markdown links would be better: `📄 [doc-id](file://path)`. But prefixes work for now.
- Should we log what was NOT loaded? → Only emit what WAS loaded. Missing context is hard to detect.

## Next step

design