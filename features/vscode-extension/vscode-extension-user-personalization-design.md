---
type: design
id: workflow-user-personalization-design
title: "User Personalization in Workflow Documents"
status: active
created: 2026-04-12
version: 1.0.0
tags: [personalization, ux, configuration, templates, ai]
parent_id: workflow-design-v2
child_ids: [design-template.md, AI_INTEGRATION.md]
requires_load: []
---

# User Personalization in Workflow Documents

## Goal

Enable a personalized collaboration experience by allowing the user to configure their preferred name. This name is used in document headers (`## Rafa:` instead of `## User:`) and AI interactions, creating a more natural, human-centric workflow.

## Context

The workflow system currently uses generic `## User:` and `## AI:` headers in conversation logs. While functional, this feels impersonal and mechanical. Allowing users to set their own name transforms the experience from "using a tool" to "collaborating with a partner."

This feature is **opt‑in** and purely cosmetic. If no name is configured, the system gracefully falls back to `"User"`.

# CHAT

## User:
I'd like the system to know my name and use it in the docs. Can we make `## Rafa:` appear instead of `## User:`? Also, the AI should call me by my name when we chat.

## AI:
Absolutely. This is a small change with a big impact on user experience. Let's break it down into two parts: document headers and AI interactions.

### 1. Configuration

The user's preferred name is stored in VS Code settings under the `workflow.user` namespace.

```json
{
  "workflow.user.name": "Rafa",
  "workflow.user.email": "rafa@example.com"  // Optional, reserved for future use
}
```

If `workflow.user.name` is not set or is empty, the system defaults to `"User"`.

### 2. Document Headers

#### Option A: Static Replacement at Document Creation
When the VS Code extension creates a new document (e.g., via `wf new design`), it replaces placeholders in the template with the configured name.

**Updated `design-template.md`:**
```markdown
# CHAT

## {{user.name}}:
<!-- Start here — describe the problem or idea to explore. -->
```

The extension replaces `{{user.name}}` with the configured value during file creation.

#### Option B: AI‑Directed Dynamic Header
Since the AI appends `## AI:` blocks, the system prompt can instruct it to use the personalized name when referencing user turns.

**System Prompt Addition (Chat Mode):**
```text
You are in **Chat Mode**. The user's name is {{user.name}}.
- When referencing the user's previous messages, use `## {{user.name}}:`.
- Your response will be appended as a new `## AI:` section.
```

This allows existing documents using `## User:` to gracefully transition as the AI adopts the personalized header.

**Recommendation:** Use **Option A** for new documents (clean, consistent) and **Option B** for AI interactions (ensures future turns use the correct name). This hybrid approach provides the best user experience.

### 3. AI Interaction Personalization

The system prompt sent to the LLM includes the user's name.

**Example Snippet:**
```text
You are an AI assistant collaborating with {{user.name}} on a feature within the Reslava workflow system.
Address the user as {{user.name}} in conversation.
```

### 4. Template Placeholder System

To support this and future personalization, the extension implements a lightweight placeholder syntax evaluated at document creation time.

| Placeholder | Replaced With |
|-------------|---------------|
| `{{user.name}}` | Configured user name |
| `{{user.email}}` | Configured email (optional) |
| `{{date}}` | Current date (ISO 8601) |
| `{{feature.id}}` | Feature identifier |

### 5. Implementation Notes

- **Configuration Reading:** Retrieve `workflow.user.name` from VS Code settings at extension activation. Store in a singleton for easy access.
- **Template Processing:** When running `wf new <type>`, load the template file, replace all `{{...}}` placeholders using the current context, and write the output.
- **AI Prompt Assembly:** Include `user.name` in the context object passed to the prompt builder.

### 6. Backward Compatibility

Existing documents using `## User:` remain valid. The AI is instructed to treat `## User:` and `## {{user.name}}:` equivalently when reading conversation history.

### Decision

Adopt the `workflow.user.name` configuration setting and the `{{user.name}}` template placeholder. Implement **Option A** (static replacement) for new document creation and **Option B** (AI instruction) for dynamic header generation in AI responses.

## Next Steps

- ✅ Update `design-template.md` to use `## {{user.name}}:`.
- Modify the native AI client to inject the user's name into system prompts.
- ✅ Document the new settings in `CONFIGURATION.md`.
