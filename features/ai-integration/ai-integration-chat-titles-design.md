---
type: design
id: workflow-chat-mode-titles-design
title: "Optional Inline Titles for Chat Mode Conversations"
status: draft
created: 2026-04-11
version: 1.0.0
tags: [ai, chat, design, documentation, ux]
parent_id: workflow-design-v2
child_ids: []
requires_load: [AI_INTEGRATION.md, design-template.md]
---

# Optional Inline Titles for Chat Mode Conversations

## Goal

Define an optional, AI-assisted convention for adding short, scannable titles to `## User:` and `## AI:` headers within `design.md` conversation logs. This improves navigability of long design discussions without adding friction to the primary writing experience.

## Context

The default conversation log format (`## User:` followed by free-form text) is lightweight and frictionless. However, as a design document grows to 50+ turns, it becomes difficult to quickly locate specific decision points or topic shifts.

The system already includes:
- **`design-ctx.md`**: A periodic, comprehensive summary generated at checkpoints.
- **VS Code outline view**: Can parse Markdown headers.

**What's missing** is **real-time, in-line scannability** during active conversation. This feature addresses that gap by allowing the AI to optionally prepend a short title to section headers when a topic shift or significant decision occurs.

## Proposed Convention

### Format

When appropriate, the AI may modify the `## User:` or `## AI:` header to include a short title, separated by an em dash:

```markdown
## User — Deciding on Database Technology
[Long user message exploring PostgreSQL vs SQLite...]

## AI — Recommendation for PostgreSQL
[Detailed AI analysis and recommendation...]

## User:
[Quick follow-up question.]

## AI:
[Brief answer.]
```

**Rules:**
- The base header `## User:` or `## AI:` is always present.
- The title is optional and added only by the AI (not required from the user).
- The delimiter is an **em dash** (`—`) to avoid Markdown link syntax ambiguity.
- Titles should be **3–6 words**, concise, and descriptive of the chunk's primary topic or outcome.

### When to Add a Title

| Scenario | Add Title? |
|----------|------------|
| User message is > ~200 words or introduces a new topic. | Yes (AI adds to `## User` header). |
| AI response contains a significant decision, recommendation, or complex explanation. | Yes (AI adds to `## AI` header). |
| Short, conversational back-and-forth (e.g., clarification, simple Q&A). | No. |

The AI determines appropriateness based on content length and semantic shifts. Users are never required to write titles themselves.

### Relationship to Existing Structure

This convention is **additive and backward-compatible**:
- Existing documents without titles remain valid.
- The AI may add titles when editing existing headers during a `REFINE_DESIGN` event (optional cleanup).
- The VS Code extension may parse these titles for an enhanced outline view, but fallback gracefully.

## AI Behavior Specification

The system prompt for **Chat Mode** (see `AI_INTEGRATION.md`) will include the following instruction:

```text
### Conversation Header Titles (Optional)

To improve scannability of long conversations, you may optionally prepend a short title to `## User:` or `## AI:` headers using an em dash.

**Format:** `## User — Short Title` or `## AI — Short Title`

**When to add a title:**
- For the `## User:` header: if the user's message is long (over ~200 words) or clearly starts a new topic, add a concise 3–6 word title summarizing the user's input.
- For the `## AI:` header: if your response is substantial, contains a key decision, or explains a complex concept, add a concise title summarizing your response.

**When NOT to add a title:**
- Short questions/answers.
- Clarifications or minor follow-ups.

**Example:**
## User — Database Technology Choice
(Long user message...)

## AI — PostgreSQL Recommended
(Long AI response...)

## User:
(Short question)

## AI:
(Short answer)
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Scannability** | Users can scroll through a long design doc and quickly grasp the conversation arc. |
| **AI Comprehension** | Titles act as strong attention anchors when the AI re-reads the document in future sessions. |
| **Zero User Effort** | The user never writes titles; the AI handles it automatically when helpful. |
| **Complements `design-ctx.md`** | Provides real-time landmarks during active conversation, while `design-ctx.md` provides periodic summaries. |
| **Future Extensibility** | Titles can be parsed by the VS Code extension to generate an interactive outline sidebar. |

## Trade-offs & Mitigations

| Concern | Mitigation |
|---------|------------|
| AI may generate inaccurate or unhelpful titles. | Prompt engineering includes examples; user can manually edit if needed. |
| Titles add visual clutter to short exchanges. | Titles are only added for substantial chunks; short exchanges remain clean. |
| Parser ambiguity with square brackets. | Em dash delimiter avoids conflict with Markdown link syntax. |

## Example Conversation Snippet

```markdown
# CHAT

## User — Initial Problem Statement
We need to implement user authentication. I'm considering JWT vs session-based auth.
Our app is a single-page React app with a Node.js backend. What are the trade-offs?

## AI — JWT vs Session Analysis
JWT offers stateless scalability and works well with SPAs, but token revocation is harder.
Sessions are simpler to invalidate but require server-side storage.
For your stack, JWT with short-lived tokens and refresh rotation is a common pattern.

## User:
What about security? I've heard JWT can be risky if not implemented correctly.

## AI — JWT Security Best Practices
You're right. Key risks include: storing tokens in localStorage (XSS), not validating signatures, and using weak secrets.
Recommendations: use HttpOnly cookies, short expiration, and a proper refresh token flow.

## User — Decision: JWT with HttpOnly Cookies
Let's go with JWT, stored in HttpOnly cookies, with a 15-minute access token and 7-day refresh token.
I'll document this in the design.

## AI — Decision Recorded
Great. I'll note that the design now specifies JWT with HttpOnly cookies.
Would you like me to propose a `REFINE_DESIGN` event to update the frontmatter version?
```

## Implementation Plan

1. **Update `AI_INTEGRATION.md`** to include the optional title instruction in the Chat Mode system prompt.
2. **Update `design-template.md`** to include a comment about optional titles (e.g., `<!-- AI may add short titles to headers for long sections: ## User — Title -->`).
3. **(Optional) VS Code Extension Enhancement**: Parse titled headers to provide an outline view or quick-jump functionality.
4. **No changes required** to core engine, reducers, or filesystem layer.

## Open Questions

- Should the AI ever modify existing headers to add titles retrospectively (e.g., during `REFINE_DESIGN` cleanup)?
  - *Initial stance:* No. Keep it as a real-time conversational aid. Retrospective cleanup is a separate, manual (or future automated) task.

## Decision

- **Adopt the optional inline title convention for Chat Mode.**
- AI will add titles only when content is substantial or topic-shifting.
- Titles use em dash delimiter: `## User — Title`.
- No user action required; AI handles automatically.

## Next Step

Update `AI_INTEGRATION.md` and `design-template.md` to reflect this convention.