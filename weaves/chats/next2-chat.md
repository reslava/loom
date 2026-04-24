# CHAT

## Rafa:
since I started the project there are so many docs and becuase it has been a manual work and evolve many times, now there is confusing what's next setp

I am going to enumerate some ideas or questions pending:

1. defered ideas 

_archive/
├── cancelled/
├── chats/
├── deferred/
│   ├── cli-error-standardization-idea.md
│   ├── deferred-work-command-idea.md
│   ├── evaluate-yaml-library-idea.md
│   ├── fast-plan-idea.md
│   ├── json-output-idea.md
│   ├── link-index-cache-idea.md
│   ├── loom-cleanup-idea.md
│   ├── loom-doctor-idea.md
│   ├── memory-fs-adapter-idea.md
│   ├── meta-plan-idea.md
│   ├── mono-multi-command-clarity-idea.md
│   ├── new-chat-doc-type-idea.md
│   ├── plan-step-id-idea.md
│   ├── section-templates-idea.md
│   ├── strict-workflow-mode-idea.md
│   ├── thread-based-archive-filtering-idea.md
│   ├── vscode-loom-switcher-design.md
│   └── vscode-loom-switcher-idea.md
└── superseeded/    

2. pending designs in weaves/

note: many of them could be obsolete, or already done

3. future idea: doc and plan step status -> defered?

4. weaves -> threads `weave-and-thread-design.md`

5. icons: i created an icon set svg color for tree, inline buttons and toolbar and for activity bar (b & w) and for weave implementing (replace spin)

6. promoteToIdea, promoteToDesign, promoteToPlan, refineIdea, refineDesign, refinePlan, summarize weave or thread? (-ctx)

7. future: ai change model?

8. review `.loom/workflow.yml` still has 
  type: design
  role: primary  

9. check creation constrains
  1 weave - M chats - X threads
  1 thread - 1 idea - 1 design - N plans 

10. chats under weave or under thread? how to show chats in tree?

11. check extension install 

12. mono-loom tests

13. how to move to weaveXXX/done? flat? all ideas designs, plans mixed ?

14. tree sort
    
15. Test a real chain of commands to veryfy the results

### TODO:
in my opinion we could do:
6, 8, 9, 15, 4

someday, when we finish the basic functionality, we should verify defered ideas and pending designs 

let me know what you think?

## AI:

Your instinct is right — the doc landscape has gotten messy, and it's worth stepping back. Here's my honest read of your list before picking what to do:

---

### What I agree on (your TODO: 6, 8, 9, 15, 4)

**6 — promoteToIdea / promoteToDesign / promoteToPlan / refineIdea / refineDesign / refinePlan / summarize**
This is the most valuable thing to build next. We have `promoteIdea` working. The natural extension:
- `promoteToDesign` — promote a chat or idea into a design doc
- `refineIdea` / `refineDesign` — AI reads the doc and proposes improvements
- `summarize` already exists as a command; we may just need to wire it up better

This unlocks the full AI-assisted authoring loop. High value, low risk.

**8 — Fix `.loom/workflow.yml`**
Quick fix. The `type: design` / `role: primary` fields there are stale scaffolding. Should be fixed so it doesn't confuse future tooling.

**9 — Check creation constraints (1 weave → M chats → X threads; 1 thread → 1 idea → 1 design → N plans)**
This is a design clarification, not code. Right now the extension doesn't enforce the `thread` level — it treats weaves as the atomic unit. We need to decide: do we add threads now (see item 4) or keep the flat-weave model and defer threads?

**15 — Test a real chain of commands**
Agreed. Before adding more features, we should walk the full golden path: chatNew → chatReply → promoteIdea → open idea → finalize. There are likely small rough edges we'd catch immediately. Low effort, high confidence.

**4 — weaves → threads (`weave-and-thread-design.md`)**
This is the biggest structural change. Worth doing, but it will touch the entire file layout and every command. I'd put this last in the group — do 6, 8, 15 first, then tackle 4 as a focused refactor.

---

### What I'd defer (not on your list, but noting it)

- **1 (deferred ideas)** — Review after basic functionality is solid. Many of those ideas may be superseded.
- **2 (pending designs)** — Same: audit pass later.
- **3 (deferred status for steps)** — Good idea, easy to add once the step model is stable.
- **5 (icons)** — Nice to have; unblock when the icon assets are ready.
- **7 (AI model switch)** — One setting change; defer.
- **10 (chats under weave or thread)** — Blocked by decision on item 4.
- **11 (extension install)** — Do this alongside item 15 (golden path test).
- **12 (mono-loom tests)** — Worth doing but not blocking.
- **13 (move to done/)** — Workflow housekeeping; can script it later.
- **14 (tree sort)** — UX polish; defer.

---

### Suggested order

1. **15** — Golden path test (find real gaps)
2. ✅ **8** — Fix `workflow.yml` (5 minutes)
3. ✅ **9** — Settle the weave/thread constraint question (design decision, then code if needed)
4. ✅ **6** — `promoteToDesign`, `refineIdea/Design`, and fill out the AI command palette
5. **4** — weaves → threads refactor

Does that order feel right, or do you want to reorder?

Next: waiting for direction.

## Rafa:
Yes, I think the same.

About commands names (I am Spanish and sometimes I am not sure of semantics)
promoteToIdea: only a chat can be promoted to a new idea
promoteToDesign: a chat or an idea can be promoted to a new design
promoteToPlan: a chat, an idea and a design can be promoted to a new plan
refineIdea, refineDesign, refinePlan: update the doc, version++, stale childs
sumarize: should we be able to generate context for a chat, a weave, a thread?

I see you used name `promoteIdea` to generate an idea from a chat, which name is more semantically correct for this action `promoteIdea` or `promoteToIdea` ?

let me know what you think 
let me know if we missed some important command not yet implemented or that needs to be reviewed?

## AI:

### On command names

Your definitions are semantically tight. Let me map them out:

| Action | Source doc(s) | Creates |
|--------|--------------|---------|
| `promoteToIdea` | chat | new idea doc |
| `promoteToDesign` | chat, idea | new design doc |
| `promoteToPlan` | chat, idea, design | new plan doc |
| `refineIdea` | idea | updates idea, version++ |
| `refineDesign` | design | updates design, version++, stales child plans |
| `refinePlan` | plan | updates plan steps |
| `summarize` | chat, weave, thread | generates `-ctx.md` |

**`promoteIdea` vs `promoteToIdea`:**

`promoteToIdea` is more correct in English. "Promote **to** idea" says what the destination is. `promoteIdea` reads as "promote the idea" (as if the idea already exists). Since we're creating a new doc of a different type, the `To` makes the direction explicit.

I'd rename: `promoteIdea` → `promoteToIdea`, `chatReply` stays as-is (it's an action, not a type transition).

---

### Commands audit — what's missing or needs review

**Implemented:**
- `chatNew` ✅
- `chatReply` ✅
- `promoteIdea` ✅ (rename to `promoteToIdea`)
- `weaveIdea`, `weaveDesign`, `weavePlan` ✅
- `finalize` ✅
- `rename` ✅
- `refineDesign` ✅ (via `REFINE_DESIGN` event)
- `startPlan`, `completeStep` ✅
- `validate` ✅
- `summarise` ✅ (exists but may need AI wiring — currently template-based?)

**Missing (new):**
- `promoteToDesign` — not yet built
- `promoteToPlan` — not yet built
- `refineIdea` — not yet built (no reducer for idea refinement)
- `refinePlan` — not yet built

**Needs review:**
- `summarise` — is it AI-powered yet or still a stub? If stub, it should use `aiClient` the same way `chatReply` does.
- `finalize` — does it handle `idea → draft → active` correctly and update the tree?
- `weaveDesign` with `parent_id` — does it correctly link to the source idea?

**Not yet decided:**
- `archiveWeave` / `archiveDoc` — move to `_archive/`
- `moveToThread` — blocked on weaves→threads decision

The most impactful missing ones are `promoteToDesign` and `refineIdea` — they complete the vertical slice for a single doc type before moving to plan promotion.

Next: waiting for direction on whether to rename `promoteIdea` → `promoteToIdea` and which command to build next.

## Rafa:
- Create a design with all agreed here `weaves/core-engine/` 
- Create a plan here `weaves/core-engine/plans/` 

## AI:

Done:

- **Design:** `weaves/core-engine/ai-command-palette-design.md` — captures all command definitions, naming rule (`promoteToIdea` not `promoteIdea`), summarize scope, and all implementation decisions.
- **Plan:** `weaves/core-engine/plans/ai-command-palette-plan-001.md` — 11 steps: rename, promoteToDesign, promoteToPlan, refineIdea, refinePlan, wire summarize, build+test.

Next: waiting for `go` to start Step 1 (rename `promoteIdea` → `promoteToIdea`), or direction to reorder.

## Rafa:
### Pending commands
1. Plan steps inline buttons:   
  - for every plan, vsix should show always next active step* 
  - `do Step(s)`: next*, all pending, show all pending to let the user pick: 
    - 2, 3, 5, 6
    - 4-12, 15
    - Or other UX than let the user view and pick
    - When AI finish will mark Steps done* or better AI return steps done and loom mark them

2. AI enabled*/disabled, decide actions or hide them when disabled   

* MVP features

### CLI vs vsix
- should we mantain simmetry pf commands and functionality between cli and vscode?
- vscode is the main and full feature UX

## AI:

**On plan step inline buttons (MVP scope)**

The "always show next active step" pattern is the right MVP. Here is how I would define the UX:

- Each plan node in the tree shows its next unblocked, undone step as a subtitle.
- `Complete Step` button (`$(pass)` icon, already registered) marks that step done and refreshes the tree.
- For "do multiple steps": the simplest MVP is a Quick Pick showing all pending steps as checkboxes — user selects which to mark done, loom marks them all. No AI needed for marking; AI is a separate "implement this step" action.
- Step completion should be driven by loom (the human or AI tells loom "steps 2, 3, 5 are done"), not by AI self-reporting. Keeps the state authoritative.

**On AI enabled/disabled**

Clean rule: if `reslava-loom.ai.apiKey` is empty, hide all AI commands from menus and show a warning inline where AI output would appear. No key = no AI actions rendered. This is one `when` clause on each menu entry: `&& reslava-loom.ai.enabled` (a derived context key we set on activation).

**On CLI vs VS Code symmetry**

My recommendation: **no enforced symmetry**. VS Code is the primary UX — full features, inline buttons, AI-driven actions, tree view. CLI is a power-user shortcut and scripting surface. It should cover the read path (status, validate, list) and the write path for non-interactive use (create docs, complete steps). AI commands stay VS Code-only for now — CLI has no API key config and no good output format for AI results. Symmetry is a maintenance burden; let each layer do what it does well.

## Rafa:
workflow to do and mark plan steps:
1. user see next active step, click on AI do these steps, and pick from checkboxes
2. AI implement the steps, finish. Where AI and user chat while implementing?
3. Loom mark steps done

correct?

## AI:

Almost — one gap in step 2: VS Code has no built-in chat panel, so "AI and user chat while implementing" needs a home. Two options:

**Option A — AI runs silently, reports result in a notification + output channel.**
User clicks "Do steps 2, 3, 5" → progress spinner → AI finishes → notification "Steps 2, 3, 5 complete" + output channel shows what was done. No back-and-forth. Simple, works today.

**Option B — AI runs in a new chat doc.**
User clicks "Do steps" → loom creates a new `{weave}-chat-N.md` → AI writes its implementation notes there → user can reply → when done, user clicks "Mark steps done". The chat doc becomes the implementation record.

Option B fits Loom's document-driven model better and gives you a permanent record. Option A is faster to build.

**Corrected workflow (Option B, MVP):**
1. User sees next active step in tree, clicks `Do Step(s)`, picks from Quick Pick checkboxes.
2. Loom creates a new chat doc, AI writes implementation plan/notes there. User can reply in the doc.
3. When user is satisfied, clicks `Complete Step(s)` on the plan node → loom marks the selected steps done and refreshes the tree.

Step 3 is always a deliberate human action — AI never marks steps done on its own. That keeps the plan state authoritative.

Does Option B feel right, or do you prefer the simpler silent Option A for now?

## Rafa:
No way for Option A, why? becuase no beginners Users will quit using loom. This way User lose the control of the most important phase, implementation.

So Option B.
What happen after user clicks `Complete Step(s)` ?
- AI write implementation notes in the CHAT
- AI should stop if some important decision needs to be done or some block point
- Can AI writes in CHAT while implementing without stopping the flow?

### -done.md documents
That brings me another doc type I used with you in my previous project.
After you finished a plan I asked you:
- Create a -done doc with implementation notes
- 
## AI:

**Option B confirmed. On the step completion flow:**

After user clicks `Complete Step(s)`:
1. Loom marks those steps done in the plan frontmatter, bumps nothing else.
2. Tree refreshes — next active step is now visible.
3. The chat doc stays open; user and AI continue there for the next step.

**On AI writing to chat while implementing:**
Yes — the chat doc is the running log. AI appends under `## AI:` as it works: what it did, decisions made, blockers hit. This is already how the current `chatReply` works (AI writes into the doc). The implementation session *is* a chat session in that doc.

For blocking decisions: AI stops mid-session, writes the decision question under `## AI:`, waits. User replies under `## Rafa:`, AI continues. Same protocol as any chat. No special "stop" mechanism needed — it is just the normal chat turn.

**On `-done.md` documents:**
This is a great pattern and fits Loom naturally. A `-done.md` is a post-plan record: what was built, key decisions locked in, anything that diverged from the plan. It lives alongside the plan (`{plan-id}-done.md` or a `done/` subfolder).

It is different from the chat doc — the chat is the live working log during implementation; the done doc is the clean retrospective written after. Two distinct purposes.

Should this become a first-class doc type (`type: done`, generated by a `loom.closePlan` command), or a convention (a markdown file the AI writes at the end of a plan chat)? The latter is simpler to start with.

## Rafa:
- Create an idea for `done` docs
- Create a plan for the rest

note: My concern is if AI will show same info that in chat window or less detailed?
Will user feel that using loom is less informative than chat window?
I hate chat window, it is one of the main reasons I started ideating this doc system working with you, but user should be he don't miss anything, he should feel a richer experience

## AI:

On richness: this is exactly Loom's advantage over a chat window. In a chat window the conversation is ephemeral — bubbles that scroll away, no structure, nothing to link to. In a Loom chat doc the AI writes *into a document* that is persistent, editable, linkable, and lives next to the plan it implements. The user can annotate inline, push back, reference file paths. The format is richer *by design*. A chat window gives you a conversation; Loom gives you a record.

The concern is valid only if the AI writes *less* — which would be a prompt quality problem, not a structural one. We make sure the system prompt for the implementation chat asks for full detail: what was done, why, what was skipped, what to watch for.

Creating the idea and plan now.
