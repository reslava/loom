# CHAT

## Rafa:
Next options:
1. `Phase 4 — Weave→Thread subdirs` ?
  - Taks: update `.loom/workflow.yml`
2. AI integration: we could start with -chat documents to test it
3. Integrate Thread builder into ViewModel | `packages/vscode/src/view/viewModel.ts`  
My opinion is 2
yours?


### Side question:
In CLAUDE.md:
"## Non-negotiable stop rules

1. **After each step**: mark ✅ in the plan · state the next step + files that will be touched · **STOP** — wait for `go`."

but when you do a step, do not show next step
how can we solve this?

## AI:

**On next options — my take:**

I agree with you: **option 2 (AI integration via -chat docs)** is the right move next.

Here's my reasoning:

- **Option 1 (Phase 4)** is a structural refactor that touches every weave on disk. It's a breaking change and the extension + CLI both need updating. The gain is cleaner file layout, but it doesn't add user-visible capability yet. Better when we have a stable foundation.
- **Option 3 (Thread builder / ViewModel)** is internal cleanup. Worth doing, but no urgency — the current `treeProvider.ts` works and users don't feel the difference.
- **Option 2 (AI integration)** closes the most important gap: right now the workflow is fully manual. The `-chat.md` files are already the natural interface (Rafa writes ideas/designs in them). Wiring AI responses into that flow would make Loom actually useful for its core promise.

Suggested starting point: pick one use-case (e.g. `weaveIdea` — user writes a prompt, AI drafts the idea doc) and implement it end-to-end as a spike. That gives us a real feedback loop before designing the full AI integration architecture.

---

**On the CLAUDE.md stop-rule gap:**

The rule says "state the next step + files that will be touched · STOP" but I don't always do it consistently. The cause is that single-step tasks (like `weavePlan --parent`) don't belong to a numbered plan, so there's no obvious "next step" to point to.

Two options:

1. **Narrow the rule**: apply the step/stop discipline only when executing a formal plan (plan-NNN steps). For ad-hoc tasks, just report what changed and ask what's next.
2. **Always end with an explicit "Next:" line**: even for ad-hoc work, end every response with `Next: {one sentence describing what I'd do next, or "waiting for direction"}`. This keeps the pattern consistent without needing a plan.

I'd suggest option 2 — it's a small habit change that makes every response feel like a checkpoint. Want me to update CLAUDE.md to make that explicit?

## Rafa:
### Update CLAUDE.md option 2

### Next AI, starting with -chat docs
   Read:
   weaves/ai-integration/ai-integration-design.md
   weaves/ai-integration/ai-integration-chat-titles-design.md
   weaves/ai-integration/reference-load-context-design.md 

- Chat
  1. First is command/button `loom weave chat` doc 
  2. I write  
  3. I run command/button `loom chat reply` or better name
  4. AI reply, appending the text at the bottom
  5. I run command/button with AI enabled  `loom promote idea` and AI generate a design  

- Loom should be AI agnostic
   For testing AI I payed $5 of DeepSeek API or use a Claude cheapest model
What you think?   

## AI — Chat Flow Design & Provider Strategy

**CLAUDE.md updated** — stop rule 1 now includes the `Next:` line for ad-hoc tasks.

---

### On your proposed flow

Your flow maps cleanly onto what `ai-integration-design.md` already defines, just with better command names. Let me restate it precisely:

| Step | Your name | My suggested name | What it does |
|------|-----------|-------------------|--------------|
| 1 | `loom weave chat` | `loom.chatNew` | Creates a new `*-chat.md` doc in the weave folder |
| 2 | — (you write) | — | User types in the doc normally |
| 3 | `loom chat reply` | `loom.chatReply` | Reads the doc, calls AI, appends `## AI:` block |
| 4 | `loom promote idea` | `loom.promoteIdea` | AI reads the chat, proposes an idea doc (Action Mode) |

The key difference from the design doc: **chat docs are first-class**, not just conversation logs inside design docs. A `*-chat.md` is where exploration happens before anything is formalized. I like this — it's cleaner.

One thing to settle: where do chat docs live? Options:
- `weaves/payment-system/payment-system-chat-001.md` (inside the weave, weave-scoped)
- `weaves/ai-chats/payment-system-chat.md` (top-level ai-chats dir, like you're using now)

The first option fits the existing model better — a chat belongs to a weave. The second is what you're doing now for meta-conversations (like this one). I'd say: **weave-scoped by default**, with `weaves/ai-chats/` reserved for workspace-level chats.

---

### On AI-agnostic provider

Agreed completely. The design already planned for this. Concrete approach:

```typescript
// packages/core: interface only
interface AIClient {
  complete(messages: Message[], opts: CompletionOpts): Promise<string>;
}

// packages/app: receives AIClient via deps injection (same pattern as everything else)
async function chatReply(input, deps: { aiClient: AIClient, ... }) { ... }

// packages/vscode: constructs the concrete client from VS Code settings
const client = makeAIClient(vscode.workspace.getConfiguration('reslava-loom.ai'));
```

For testing: **DeepSeek is the right call.** It's OpenAI-compatible (same SDK, just a different `baseUrl`), cheap ($5 covers a lot of development), and fast. Claude Haiku is also fine but costs slightly more per token for small tasks. DeepSeek's `deepseek-chat` model handles structured JSON proposals reliably.

VS Code setting to add:
```json
"reslava-loom.ai.provider": "deepseek" | "openai" | "anthropic" | "ollama"
"reslava-loom.ai.apiKey": "..."
"reslava-loom.ai.model": "deepseek-chat"
"reslava-loom.ai.baseUrl": "https://api.deepseek.com/v1"
```

---

### What I'd tackle first (smallest useful slice)

**`loom.chatReply`** — the core loop. No action mode, no promote, just:
1. Read the current open `*-chat.md`
2. Send conversation history to AI
3. Append `## AI:` block

This alone proves the provider integration works and gives you something to interact with immediately. Once that's solid, `loom.promoteIdea` (Action Mode) follows naturally.

Do you want to start with a plan for this, or talk through the design more first?

Next: waiting for direction on whether to start planning `loom.chatReply` or discuss further.

## Rafa:
- chat docs are first-class was a decision I made to mantain main docs clean, at the same time that conserving decision history in chats
- location: i like your proposal, weave-scoped by default, with `weaves/ai-chats/` reserved for workspace-level chats

If case you do not have more questions create `weaves/ai-integration/plans/ai-chat-plan-001.md`

### Side question 
Do AI needs we send the full chat everytime to request next reply?

## AI — Plan Created + Context Question

**Plan created:** `weaves/ai-integration/plans/ai-chat-plan-001.md`

---

**On sending full chat every time:**

Short answer: for now, yes — and that's fine. For the long term, no.

The AI has no memory between calls. Every `chatReply` call must supply the full conversation history so the model has context. For small chats (< ~50 turns, ~20k tokens) this is cheap and simple — just send everything.

For long chats, the right approach (already designed in the system) is:
- Summarize old turns into a `-ctx.md` file  
- Send: system prompt + `-ctx.md` (summary of early turns) + last N turns (verbatim)
- This keeps token cost flat regardless of chat length

For `ai-chat-plan-001` I'll implement the simple path (full history always). The `summarise` command already exists and can be reused later when you need the optimization. No need to design for it now.

Next: plan is ready at `weaves/ai-integration/plans/ai-chat-plan-001.md` — waiting for `go` to start Step 1.

## Rafa:
worked
- do git add, commit, push
lets move on
AI promote?
- If you agree create a plan in `weaves/ai-integration/plans`

## AI:

Agreed — `loom.promoteIdea` is the natural next step. It closes the first complete AI loop: chat → AI reply → promote → idea doc exists in the weave.

The flow:
1. User has a `*-chat.md` open with some conversation
2. Runs `loom.promoteIdea`
3. AI reads the full chat, generates a structured idea title + body
4. A new idea doc is created in the weave (same pattern as `weaveIdea` but AI-authored)
5. Tree refreshes, idea appears

This is Chat Mode only (no JSON handshake needed) — the AI just returns structured text, not a proposal object. Simpler than full Action Mode. We can layer Action Mode on top later.

**Plan created:** `weaves/ai-integration/plans/ai-promote-plan-001.md`

Committing and pushing now.

to get a chat to a real idea doc filled by AI we need JSON request, correct ?