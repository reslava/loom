---
type: design
id: ai-integration-chat-titles-design
title: "Optional Inline Titles for Chat Mode Conversations"
status: active
created: 2026-04-11
updated: 2026-04-14
version: 1
tags: [ai, chat, design, documentation, ux]
parent_id: ai-integration-design
child_ids: []
requires_load: [ai-integration-design]
target_release: "0.3.0"
actual_release: null
---

# Optional Inline Titles for Chat Mode Conversations

## Goal

Define an optional, AI-assisted convention for adding short, scannable titles to `## User:` and `## AI:` headers within `design.md` conversation logs. This improves navigability of long design discussions without adding friction to the primary writing experience.

## Context

The default conversation log format (`## User:` followed by free-form text) is lightweight and frictionless. However, as a design document grows to 50+ turns, it becomes difficult to quickly locate specific decision points or topic shifts.

The system already includes:
- **`-ctx.md`**: A periodic, comprehensive summary generated at checkpoints.
- **VS Code outline view**: Can parse Markdown headers.

**What's missing** is **real-time, in-line scannability** during active conversation. This feature addresses that gap by allowing the AI to optionally prepend a short title to section headers when a topic shift or significant decision occurs.

# CHAT

## Rafa:
We should add optional titles to conversation headers. When the user writes a long chunk or the AI makes an important point, we can prepend a short title. This makes long design docs scannable.

## AI:
Agreed. Let's define the convention and AI behavior.

### 1. Format

When appropriate, the AI may modify the `## User:` or `## AI:` header to include a short title, separated by an em dash:

```markdown
## Rafa — Deciding on Database Technology
[Long user message exploring PostgreSQL vs SQLite...]

## AI — Recommendation for PostgreSQL
[Detailed AI analysis and recommendation...]

## Rafa:
[Quick follow-up question.]

## AI:
[Brief answer.]
```

**Rules:**
- The base header `## {{user.name}}:` or `## AI:` is always present.
- The title is optional and added only by the AI (not required from the user).
- The delimiter is an **em dash** (`—`) to avoid Markdown link syntax ambiguity.
- Titles should be **3–6 words**, concise, and descriptive of the chunk's primary topic or outcome.

### 2. When to Add a Title

| Scenario | Add Title? |
|----------|------------|
| User message is > ~200 words or introduces a new topic. | Yes (AI adds to `## {{user.name}}:` header). |
| AI response contains a significant decision, recommendation, or complex explanation. | Yes (AI adds to `## AI:` header). |
| Short, conversational back-and-forth (e.g., clarification, simple Q&A). | No. |

The AI determines appropriateness based on content length and semantic shifts. Users are never required to write titles themselves.

### 3. Relationship to Existing Structure

This convention is **additive and backward-compatible**:
- Existing documents without titles remain valid.
- The AI may add titles when editing existing headers during a `REFINE_DESIGN` event (optional cleanup).
- The VS Code extension may parse these titles for an enhanced outline view.

### 4. AI Behavior Specification

The system prompt for **Chat Mode** includes the following instruction:

```text
### Conversation Header Titles (Optional)

To improve scannability of long conversations, you may optionally prepend a short title to `## {{user.name}}:` or `## AI:` headers using an em dash.

**Format:** `## {{user.name}} — Short Title` or `## AI — Short Title`

**When to add a title:**
- For the `## {{user.name}}:` header: if the user's message is long (over ~200 words) or clearly starts a new topic, add a concise 3–6 word title summarizing the user's input.
- For the `## AI:` header: if your response is substantial, contains a key decision, or explains a complex concept, add a concise title summarizing your response.

**When NOT to add a title:**
- Short questions/answers.
- Clarifications or minor follow-ups.

**Example:**
## Rafa — Database Technology Choice
(Long user message...)

## AI — PostgreSQL Recommended
(Long AI response...)

## Rafa:
(Short question)

## AI:
(Short answer)
```

### 5. Benefits

| Benefit | Description |
|---------|-------------|
| **Scannability** | Users can scroll through a long design doc and quickly grasp the conversation arc. |
| **AI Comprehension** | Titles act as strong attention anchors when the AI re-reads the document in future sessions. |
| **Zero User Effort** | The user never writes titles; the AI handles it automatically when helpful. |
| **Complements `-ctx.md`** | Provides real-time landmarks during active conversation, while `-ctx.md` provides periodic summaries. |
| **Future Extensibility** | Titles can be parsed by the VS Code extension to generate an interactive outline sidebar. |

### 6. Trade-offs & Mitigations

| Concern | Mitigation |
|---------|------------|
| AI may generate inaccurate or unhelpful titles. | Prompt engineering includes examples; user can manually edit if needed. |
| Titles add visual clutter to short exchanges. | Titles are only added for substantial chunks; short exchanges remain clean. |
| Parser ambiguity with square brackets. | Em dash delimiter avoids conflict with Markdown link syntax. |

### 7. Example Conversation Snippet

```markdown
# CHAT

## Rafa — Initial Problem Statement
We need to implement user authentication. I'm considering JWT vs session-based auth.
Our app is a single-page React app with a Node.js backend. What are the trade-offs?

## AI — JWT vs Session Analysis
JWT offers stateless scalability and works well with SPAs, but token revocation is harder.
Sessions are simpler to invalidate but require server-side storage.
For your stack, JWT with short-lived tokens and refresh rotation is a common pattern.

## Rafa:
What about security? I've heard JWT can be risky if not implemented correctly.

## AI — JWT Security Best Practices
You're right. Key risks include: storing tokens in localStorage (XSS), not validating signatures, and using weak secrets.
Recommendations: use HttpOnly cookies, short expiration, and a proper refresh token flow.

## Rafa — Decision: JWT with HttpOnly Cookies
Let's go with JWT, stored in HttpOnly cookies, with a 15-minute access token and 7-day refresh token.
I'll document this in the design.

## AI — Decision Recorded
Great. I'll note that the design now specifies JWT with HttpOnly cookies.
Would you like me to propose a `REFINE_DESIGN` event to update the frontmatter version?
```

## Decision

Adopt the optional inline title convention for Chat Mode. AI will add titles only when content is substantial or topic-shifting. Titles use em dash delimiter: `## {{user.name}} — Title`. No user action required; AI handles automatically.

## Next Steps

- Update `AI_INTEGRATION.md` to reflect this convention.
- Update `design-template.md` to include a comment about optional titles.