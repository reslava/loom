---
type: chat
id: ch_01KRBYBKYNDXAY737K178Q5BYA
title: docs-file-names-titles Chat
status: active
created: 2026-05-11
version: 1
tags: []
parent_id: null
requires_load: []
---

# docs-file-names-titles Chat

## Rafa:

### Loom file names

- 1 thread constrains: 1 idea, 1 design, N plans, M chats

Loom docs have:

1. frontmatter Title: showed in tree

2. default physical names of loom doc files:
{thread}-idea.md
{thread}-design.md
plans/{thread}-plan-NNN.md
chats/{thread}-chat-MMM.md
We should use thread constains, file names are free and easy to know parent thread just by its location, no problem for move / rename
When we create docs, we use default file names and assigning Title to frontmatter and `# Title` section. But we take care of thread constrains.
3. filename sufix: I think sufixs should be forced
-idea.md
-design.md
-plan-NNN.md
-chat-MMM.md
-reference.md

4. special forced filenames
ctx.md
{weave}/ctx.md

5. Rename should rename the frontmatter Title. But Currently we have this Title duplicated:

```markdown
---
type: idea
title: install idea
...
---

# install idea
```

So when user renane a doc, we should rename both at same time
6. Should we have an option for file physical name rename? what you think?
My opinion is: no. We leave this feature to VSCope explorer. We could even leave weave, thread, docs move to VSCode explorer. Agree?

## AI:

Good breakdown. Here's my read on each point:

**1 & 2 — Thread constraints + default file names**

Agreed. Thread layout is the constraint (`1 idea, 1 design, N plans, M chats`), not the file name. Default names are predictable and location already implies the parent thread, so no need for extra metadata.

**3 — Forced suffixes**

Agree. Suffixes are load-bearing for doc-type detection (the core `getDocType()` reader uses them). Enforcing them prevents ambiguity and keeps type detection simple and reliable. The full set:
- `-idea.md`
- `-design.md`
- `-plan-NNN.md` (NNN = zero-padded number)
- `-chat-MMM.md` (MMM = zero-padded or ULID)
- `-done.md` (for step/plan done docs — worth adding to the list)
- `-reference.md`
- `-ctx.md`

**4 — Special forced filenames**

`ctx.md` at global scope and `{weave}/ctx.md` at weave scope are already forced — the loader knows exactly where to look. Makes sense to keep these special-cased.

**5 — Dual title (frontmatter + `# Heading`)**

This is the real friction. Right now `title:` in frontmatter and `# Title` in the body are two sources of truth that can drift. On rename, we must update both atomically.

The cleaner fix is to ask: do we even need the `# Title` heading in the body? 

- **Option A: Keep both, rename updates both atomically.** Simple rule, no structural change. Body heading stays as visual anchor.
- **Option B: Drop the `# Title` heading from the body, use frontmatter `title:` as the single source.** The tree and any rendered view reads from frontmatter. Body starts at the first section after the frontmatter fence. No drift possible.

I lean toward **Option B** as the clean path — it removes the duplication at the source. But it's a breaking change to existing docs. What do you think?

**6 — Physical file rename**

Agree: leave physical rename and file/folder moves to the VS Code Explorer. Loom's `rename` operation should mean "change the display title" (frontmatter `title:` + body heading if Option A). Physical file naming is a filesystem concern, already handled well by the IDE. This keeps Loom's rename surface minimal and prevents us from reimplementing a file manager.

## Rafa:

I also pick Option B, I do not like having 2 sources of truth.
The only issue is that VSCode markdown preview do not show frotmatter title. What you think about this?

## AI:

Good — Option B it is.

On the VS Code preview gap: the standard markdown preview ignores YAML frontmatter, so without `# Title` in the body the doc appears to start mid-content with no heading. Two pragmatic options:

**Option B1 — Keep a synthetic `# {title}` injected at render time only (not stored in the file).**
The Loom VS Code extension's preview/tree already reads frontmatter. We add a small render step: when the extension opens a doc for preview, it prepends `# {frontmatter.title}` to the rendered output. The file itself stays clean (no body heading). VS Code's built-in markdown preview still won't show it, but the Loom extension preview will.

**Option B2 — Accept the raw preview gap; use the Loom tree as the canonical view.**
The VS Code built-in markdown preview is not Loom's primary surface — the Loom tree view is. Users who open a `.md` file raw in VS Code see no heading, but that's a minor cost. No extra code needed.

My take: **B2 now, B1 later.** The raw preview gap is a cosmetic issue, not a workflow blocker. We can add the synthetic heading injection to the extension's preview renderer as a polish step once Option B is adopted everywhere. Shipping B2 immediately keeps the scope tight and removes the dual-source problem today.

Does that work for you, or do you want the injection in scope from the start?

## Rafa:

B2

Append a `## 7. File names and Titles` section to `loom/refs/architecture-reference.md`.


## AI:

Done. Appended `## 7. File Names and Titles` to `loom/refs/architecture-reference.md`. It covers:

- Enforced suffixes table (`-idea.md`, `-design.md`, `-plan-NNN.md`, `-chat-MMM.md`, `-done.md`, `-reference.md`, `-ctx.md`)
- Special forced filenames (`ctx.md`, `{weave-id}/ctx.md`)
- Single source of truth rule: `frontmatter.title` only, no `# Heading` in the body
- Note on the VS Code preview gap (acceptable trade-off, future synthetic injection path noted)
- `loom_rename` scope: title only, physical file rename stays with VS Code Explorer