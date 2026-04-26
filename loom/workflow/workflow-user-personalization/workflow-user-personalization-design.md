---
type: design
id: workflow-user-personalization-design
title: "User Personalization in Workflow Documents"
status: done
created: 2026-04-12
version: 1.0.0
tags: [personalization, ux, configuration, templates]
parent_id: workflow-design-v2
child_ids: []
requires_load: []
---

# User Personalization in Workflow Documents

## Goal

Enable a personalized collaboration experience by allowing the user to configure their preferred name (and optionally email) within the workflow system. This name will be used in document headers (`## Rafa:` instead of `## User:`) and AI interactions to create a more natural, friendly partnership.

## Context

The current workflow uses generic `## User:` and `## AI:` headers in conversation logs. While functional, this feels impersonal—like talking to a robot (which, technically, I am, but we can pretend otherwise). Allowing users to set their own name transforms the experience from "using a tool" to "collaborating with a partner."

This feature is purely cosmetic and opt-in. If no name is configured, the system gracefully falls back to `## User:`.

# CHAT

## Rafa:
I'd like the system to know my name and use it in the docs. Can we make `## Rafa:` appear instead of `## User:`? Also, the AI should call me Rafa when we chat.

## AI:
Absolutely, Rafa. This is a small change with a big impact on user experience. Let's break it down into two parts: document headers and AI interactions.

### 1. Configuration

The user's preferred name is stored in VS Code settings. We'll define a new configuration namespace:

```json
{
  "workflow.user.name": "Rafa",
  "workflow.user.email": "rafa@example.com"  // Optional, for future features
}
```

**Default Behavior:** If `workflow.user.name` is not set or empty, the system uses `"User"`.

### 2. Document Headers

When the VS Code extension creates a new document (e.g., via `wf new design`), it can replace a placeholder in the template with the configured name.

**Updated `design-template.md`:**
```markdown
# CHAT

## {{user.name}}:
<!-- Start here — describe the problem or idea to explore. -->
```

The extension replaces `{{user.name}}` with `"Rafa"` during file creation.

**Existing Documents:** Documents already using `## User:` will continue to work. The AI can be instructed to use the personalized name when referencing past user turns, but the existing text remains unchanged. This ensures backward compatibility.

### 3. AI Interaction

The system prompt sent to the LLM (in both Chat and Action modes) will include the user's name.

**Updated System Prompt Snippet (Chat Mode):**
```text
You are an AI assistant collaborating with {{user.name}} on a feature within the Reslava workflow system.
- Address the user as {{user.name}} in conversation.
- When appending a new user turn header, use `## {{user.name}}:`.
- The user's previous messages may be under `## User:` or `## {{user.name}}:`. Treat them equally.
```

**Example Interaction:**
```markdown
## Rafa:
I think we should use PostgreSQL.

## AI:
Good choice, Rafa. PostgreSQL will handle the concurrency we need. Want me to propose a `REFINE_DESIGN` event?
```

### 4. Template Placeholders

To support this and future personalization, the extension should support a simple placeholder syntax in all templates:

| Placeholder | Replaced With |
|-------------|---------------|
| `{{user.name}}` | Configured user name |
| `{{user.email}}` | Configured email (optional) |
| `{{date}}` | Current date (ISO format) |
| `{{feature.id}}` | Feature identifier |

This is a lightweight templating engine that runs at document creation time.

### 5. Implementation Notes

- **Extension Activation:** Read `workflow.user.name` from VS Code settings. Store in a singleton for easy access.
- **Document Creation:** When running `wf new <type>`, load the template, replace placeholders, and write the file.
- **AI Prompt Assembly:** Include `{{user.name}}` in the system prompt context.

### 6. Future Enhancements

- **User avatar:** Could be used in the VS Code tree view to show who is working on a feature.
- **Multiple collaborators:** If the system ever supports real-time collaboration, each user's name could appear on their respective turns.

### Decision

Adopt the `workflow.user.name` setting and `{{user.name}}` placeholder. Update `design-template.md` and the AI system prompts accordingly. This is a low-risk, high-delight feature.

## Next Steps

- Update `design-template.md` with `## {{user.name}}:`.
- Add user name injection to the native AI client.
- Document the setting in `README.md` or a new `CONFIGURATION.md`.

Excellent progress, Rafa! 🎉 You're checking off items like a pro. Let's tackle the remaining two tasks so you can fully cross this off your list.

---

## Rafa:

✅ Update design-template.md with ## {{user.name}}:  

🔳 Add user name injection to the native AI client.
🔳 Document the setting in README.md or a new CONFIGURATION.md

## AI:

### 🔧 Task 2: Add User Name Injection to the Native AI Client

This involves modifying the `NativeAIClient` class in your VS Code extension to read the configured user name and inject it into the system prompt and conversation headers.

#### Step 1: Read Configuration

Create a helper function to get the user's name from VS Code settings:

```typescript
import * as vscode from 'vscode';

export function getUserName(): string {
    const config = vscode.workspace.getConfiguration('workflow.user');
    return config.get<string>('name') || 'User';
}
```

#### Step 2: Inject into System Prompt

When building the system prompt for Chat Mode or Action Mode, replace a placeholder with the actual name:

```typescript
const userName = getUserName();

let systemPrompt = `
You are an AI assistant collaborating with ${userName} on a feature within the Reslava workflow system.
- Address the user as ${userName} in conversation.
- When appending a new user turn header, use \`## ${userName}:\`.
- The user's previous messages may be under \`## User:\` or \`## ${userName}:\`. Treat them equally.
...
`;
```

#### Step 3: Header Generation for AI Responses

When the AI appends a response (in Chat Mode), the extension should write `## AI:` as the header. The user's header is already in the document (either static or replaced at creation). If you want the AI to *generate* a user header (e.g., when summarizing a user turn), instruct it to use the personalized name.

**Prompt instruction:**
```text
When you need to reference or create a user turn header, use `## ${userName}:`.
```

This ensures consistency moving forward.

---

### 📄 Task 3: Document the Setting in `README.md` or `CONFIGURATION.md`

Given the growing number of configuration options, I recommend creating a dedicated `CONFIGURATION.md` file in the `docs/` directory. This keeps the README clean and provides a central reference for users.

#### Proposed `docs/CONFIGURATION.md`

```markdown
# Configuration Guide

The Reslava workflow system is configured via VS Code settings. These settings control user preferences, AI behavior, and system defaults.

## User Personalization

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `workflow.user.name` | `string` | `"User"` | Your preferred name. Used in document headers and AI conversations. |
| `workflow.user.email` | `string` | `null` | (Optional) Your email address. Reserved for future collaboration features. |

**Example `settings.json`:**
```json
{
  "workflow.user.name": "Rafa",
  "workflow.user.email": "rafa@example.com"
}
```

## AI Provider Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `workflow.ai.provider` | `string` | `"deepseek"` | AI provider: `"deepseek"`, `"openai"`, `"anthropic"`, or `"ollama"`. |
| `workflow.ai.apiKey` | `string` | `""` | Your API key for the selected provider. |
| `workflow.ai.model` | `string` | `"deepseek-chat"` | Model name (e.g., `"deepseek-chat"`, `"deepseek-reasoner"`). |
| `workflow.ai.baseUrl` | `string` | Provider default | Override the API endpoint (useful for local proxies). |

**Example:**
```json
{
  "workflow.ai.provider": "deepseek",
  "workflow.ai.apiKey": "sk-...",
  "workflow.ai.model": "deepseek-chat"
}
```

## Context & Token Management

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `workflow.ai.maxContextTokens` | `number` | `8000` | Maximum tokens for the AI prompt. |
| `workflow.ai.designSummaryThreshold` | `number` | `20000` | Characters in `design.md` before auto-summary. |

## Security & Effects

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `workflow.allowShellCommands` | `boolean` | `false` | Enable `run_command` effect. |
| `workflow.allowSensitiveEnvVars` | `boolean` | `false` | Allow passing sensitive environment variables to commands. |
```

#### Update `README.md`

Add a brief reference to the new configuration guide in the **Documentation** section:

```markdown
| [**CONFIGURATION.md**](./docs/CONFIGURATION.md) | Complete reference for all VS Code settings. |
```

---

### ✅ Checklist Update

| Task | Status |
|------|--------|
| Update `design-template.md` with `## {{user.name}}:` | ✅ Done |
| Add user name injection to the native AI client | ✅ Ready for implementation (code snippets provided) |
| Document the setting in `README.md` or `CONFIGURATION.md` | ✅ Ready for implementation (doc content provided) |

You're now equipped to knock out those last two items when you dive into the code, Rafa. The personalization engine is primed and ready. 🚀

Shall we move on to the next design challenge, or is there anything else you'd like to refine before we wrap up this session?

