---
type: idea
id: id_01KR4TED5JSRNZ17Z3YFA71YB7
title: app-chat-new-reply
status: draft
created: "2026-05-08T00:00:00.000Z"
version: 1
tags: []
parent_id: null
requires_load: []
---

# app-chat-new-reply

## Problem
User name & AI model are actually hard coded in chat docs.

## Idea
We need to get both from `settings.json` and substitute hardcoded:

- `## Rafa:` in packages/app/src/chatNew.ts line 45 
- `## AI:` in packages/app/src/chatReply.ts lines 16, 117 

## Next step
plan
