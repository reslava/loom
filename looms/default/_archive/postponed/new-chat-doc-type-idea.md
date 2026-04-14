---
type: idea
id: new-chat-doc-type-idea
title: "New chat doc type"
status: draft
created: 2026-04-11
uodated: 2026-04-13
version: 2
tags: []
parent_id: null
child_ids: []
requires_load: []
---

# 💬 New chat doc type

## Problem
Current design docs include the boilerplate of the chat User <-> AI associated.
Actually only -design docs admit file based chats User <-> AI

## Idea
Instead of attach the bolierplate of the conversacion chat between User and AI inside the design docs, we introduce a new type of doc `-chat.md`.

## Why now
I think this is very important and must be designed before implementing anything

## Open questions
What do you think (be honest)?
- Is useful?
- Is clear?

## Next step
If finally valitated
- Create a design doc

## Format
Informal, free-form conversation log. Follows current `-design.md` chats workflow:

```markdown
# CHAT

## {{UserName}}:  (or User: if not defined)
...

## {{AI-model}}:  (or AI: if not defined)
...

```

## Creating a chat and naming
### New chat (no associated) 
- an `{name}-chat.md` located at `.ws/chats/` 

### Chat about...
Linked to an esisting doc, depending on doc type selected 
- Name `{feature-name}-{type}-chat-NN.md` and located on same `feature/feature-name/`

## Action when Chat closed
- `{name}-chat.md` located at `.ws/chats/` -> create a new idea
- `{feature-name}-idea-chat-NN.md` -> refine the parent idea or create a new design
- `{feature-name}-design-chat-NN.md` -> refine the parent design or create a new plan
- `{feature-name}-plan-chat-NN.md` -> refine the parent plan

## Workflow
User can chat (optional becuase there are actions to do that directly) with AI preserving the history of decisions taken between any doc in the chain

[chat ->] idea [<-> chat] -> design [<-> chat] -> plan [<-> chat]

*[] means optional       

- When user start a not linked chat could be to create an idea
- When user start a chat about an idea could be to refine the idea or to create a new design
- When user start a chat about a design could be to refine the design or to create a new plan
- When user start a chat about a plan could be to refine the plan

The user point of view would be: "I want to chat abouut this..." and finally, could:
- cancel / archive / delete the chat becuase no relevant at all
- refine the `parent document` or `create a new child of parent`
- or create a new idea from if no parent