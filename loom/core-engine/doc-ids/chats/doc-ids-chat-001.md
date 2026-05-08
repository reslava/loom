---
type: chat
id: ch_01KQYDFDDB5ZMPV8Z8QTXPMB75
title: doc-ids Chat
status: done
created: "2026-05-02T00:00:00.000Z"
version: 1
tags: []
parent_id: null
requires_load: []
---

# CHAT

## Rafa:

### Doc IDs

I think we are having issues due to fragile docs ids and we will have many more when we let user move, drag & drop docs, rename...

I think actual doc ids are not good at all, so I think in a better approach.

### Prefix
prefix = type:

ch_ = chat
id_ = idea
de_ = design
pl_ = plan
cx_ = context
rf_ = reference

### ULID 
ULID = Universally Unique Lexicographically Sortable Identifier
id: pl_01JT8Y3R4P7M6K2N9D5QF8A1BC
Length: 26 characters

2 parts:
01JT8Y3R4P | 7M6K2N9D5QF8A1BC
timestamp   randomness
1. Timestamp part (first 10 chars)
Represents creation time in milliseconds.

2. Random part (last 16 chars)
Ensures uniqueness even if many IDs are created same millisecond.

Benefits:

sortable by creation time
shorter than UUID
readable
copy/paste friendly
stable forever

### Frontmatter
```yaml
---
type: plan
id: pl_01JT8Y3R4P7M6K2N9D5QF8A1BC
title: "Implement Toolbar Binding"
slug: implement-toolbar-binding
status: active
created: 2026-04-25
version: 1
parent_id: de_01JT8...
requires_load: []
---
```

### child_ids

We could remove child_ids entirely and compute backlinks by scanning parent_id.
Cleaner source of truth.

### Node.js

- Install:
npm install ulid

- Use:
import { ulid } from 'ulid'

const id = ulid()
console.log(id)

- Output:
01JT8Y3R4P7M6K2N9D5QF8A1BC

### Questions
What you think? Useful? Worth to implement?
Post MVP?

## AI:

Honest take: yes, current IDs are the wrong shape for where Loom is going, and your proposal is the right direction. But the timing matters.

### What's actually fragile today

The real problem isn't that `doc-ids` looks ugly — it's that **identity is coupled to three things at once**: the filename, the slug-in-frontmatter, and every `parent_id` reference pointing at it. Rename one, you break the others. Move a doc between threads, and the canonical path changes. Today we paper over this with `loom_rename` going through MCP, but it's a workaround for a structural issue: **slugs are not identifiers**.

Once users get drag/drop and free-form rename in the extension, this breaks daily. So the cost of *not* fixing it grows the moment we ship those features.

### What I like about the proposal

- **`type_` prefix** — huge win for readability in raw markdown and logs. `pl_01JT8Y…` tells you what kind of thing it is at a glance. Better than UUIDs.
- **ULID over UUID** — sortable by creation is genuinely useful for plans and chats (natural ordering without a separate `created` index).
- **Decoupling slug from ID** — this is the real prize. Slug becomes presentation (used in filename + title), ID becomes identity (stable forever). Rename freely, links never break.
- **Killing `child_ids`** — agree. It's a denormalization that drifts. Backlinks via `parent_id` scan + the existing link index is the single source of truth. We already build the index per `getState`; adding "children of X" is a one-liner.

### What worries me

1. **Filename ↔ ID decoupling cost.** Today the filename is the ID. Once we split, every repo (`weaveRepository`, `threadRepository`, `linkRepository`) needs to look up docs by ID-in-frontmatter, not path. The link index has to map `pl_01JT…` → file path. Doable, but it's an invasive change touching every doc-loading code path.

2. **Resource URIs get ugly.** `loom://thread-context/core-engine/doc-ids` is human-typeable today. `loom://doc/pl_01JT8Y3R4P7M6K2N9D5QF8A1BC` isn't. Mitigation: keep URIs slug-based for *thread* paths (threads are folders, slugs are stable enough at that level), use ULID only for *doc* identity. Threads-by-slug, docs-by-ULID is a defensible split.

3. **Migration is one-shot but destructive.** Every existing `parent_id` value, every cross-doc link, every test fixture. We'd need a migration script that walks the weave, mints ULIDs, rewrites frontmatter, and updates references atomically. Get it wrong once and the graph is corrupt.

4. **`requires_load` and human authoring.** Right now Rafa can write `requires_load: [vision, workflow]` in frontmatter by hand. With ULIDs, that becomes `[cx_01JT…, cx_01JT…]` — unwriteable without tooling. We'd need slug-based aliases that resolve to IDs, or accept that frontmatter becomes machine-only. The first is more work, the second is a real UX regression for the "markdown is the database, edit it like a human" promise.

### Recommendation

**Post-MVP, but plan it now as the next major refactor after MVP ships.** Specifically:

- Don't block MVP on this. Current scheme is fragile but survives until users get drag/drop.
- Open a thread `loom/core-engine/doc-ids/` (which is what this chat lives in — good) with an idea + design covering: ULID adoption, slug/ID split, child_ids removal, the `requires_load` aliasing question, and the migration script.
- **Sequence:** ship it before user-facing rename/move/drag features land in vscode, because those features are what makes today's scheme break.
- Bundle `child_ids` removal into the same migration — same touch points, half the effort.

The one thing I'd push back on: don't do this in pieces. Doc identity is load-bearing for reducers, link index, plan-step validation, and MCP resources. A half-migration where some docs have ULIDs and others don't is worse than either state alone. One atomic migration, full repo, all-at-once.

Worth implementing? Yes. Now? No — ship MVP first. Next? Yes, before drag/drop ships.

## Rafa:

### ULID
- ULID are for docs
- weaves and threads are folders, we use folders name for them

### requires_load
I think this field should only admit context docs.
Context docs are summary of a level of information, mainly reference docs of the level.
We have global, weave and thread context docs. We coould use:
loom-ctx.md - global
{weave-name}-ctx.md
{weave-name}-{thread-name}-ctx.md
What you think?

### parent_id
Usually will be filled by AI when promoting to a design, plan...

### New idea, design
When we close this chat with no more questions:
Create an idea and a design 

If you have more questions, let me know

## AI:

Good answers. The folder-as-identity for weaves/threads + ULID-for-docs split is exactly the right cut — keeps URIs human-typeable at the level humans navigate (folders) and stable-by-ULID at the level that gets renamed/promoted (docs). Agreed on `parent_id` being AI-filled on promotion; that's already the natural moment.

A few questions before we close and promote.

### 1. `requires_load` restricted to ctx docs — mostly yes, one snag

I like the predictable naming (`loom-ctx.md`, `{weave}-ctx.md`, `{weave}-{thread}-ctx.md`) — it solves the human-writeability problem from my earlier concern, because authors write the stable filename, not the ULID. And restricting to ctx docs enforces the "only summarized, AI-optimized content gets auto-loaded" discipline, which is good — prevents `requires_load` from pulling in giant design docs by accident.

**The snag:** today `loom-ctx.md` declares `requires_load: [vision, workflow]`, which are *refs*, not ctx docs. Two ways out:

- **(a)** Absorb vision + workflow content into `loom-ctx.md` itself (or into ctx docs that point at refs). Refs become "deeper reading" linked from ctx, never auto-loaded.
- **(b)** Allow `requires_load` to accept ctx docs *and* refs, but nothing else (no ideas, no designs, no plans). Refs are factual/stable, similar in spirit to ctx.

I lean (b) — refs like `architecture-reference.md` are exactly the kind of thing a plan might genuinely need pinned, and they're stable enough to belong in this list. (a) feels too restrictive and would force ctx docs to grow. What do you think?

### 2. Ctx docs and ULIDs

If ctx docs have predictable filenames (`core-engine-doc-ids-ctx.md`), do they still need a ULID in frontmatter? I'd say **yes, same scheme** — filename is the stable presentation/lookup key, ULID is the canonical identity. That way if a thread folder gets renamed (e.g. `doc-ids` → `document-identity`), the ctx doc's filename changes but its ULID and all references to it stay intact. Filename is *one* lookup path; ULID is the durable one.

So `requires_load` accepts the stable filename (e.g. `core-engine-doc-ids-ctx`) which the link index resolves to a ULID at load time. Humans write names, machines store ULIDs.

### 3. Confirming `child_ids` removal

Still in scope for this same migration? I think it has to be — same touch points (every doc's frontmatter), same reducer changes, same link-index update. Splitting it into a separate pass would double the work.

### 4. Slug field — keep or drop?

Your earlier example had both `id: pl_01JT…` and `slug: implement-toolbar-binding`. Where does the slug come from, and where is it used? I see two options:

- **(a)** Slug is derived from `title` on save (no field). Simpler, one less thing to drift.
- **(b)** Slug is its own frontmatter field, manually settable, used as the filename component. More control (titles can change without renaming files), but more state to maintain.

The filename today is something like `doc-ids-chat-001.md`. Under the new scheme, would it become `{slug}.md` or `{slug}-{ulid-suffix}.md`? Two chats with the same slug in the same folder need disambiguation.

### 5. Migration scope check

Just confirming the full list for the migration script:

- Mint ULID for every doc, write to `id` field with type prefix.
- Rewrite every `parent_id` from slug to ULID.
- Drop `child_ids` field everywhere.
- Rename ctx docs to the new convention (`{weave}-ctx.md`, `{weave}-{thread}-ctx.md`).
- Update link index to map filename + ULID → path.
- Update all repos to look up by ID-in-frontmatter, not path.
- Test fixtures regenerated.

Anything I'm missing?

---

If those four feel resolved, I have no more questions and we can close. Otherwise, your call on which to discuss next.

## Rafa:

### 1. `requires_load`
After rethinking about it:
1. context docs are automatically load depending on level:
   - global: always
   - corresponding weave and thread
2. requires_load point to reference docs using slug id. They are loaded filtered by future `loadWhen:` field. 
We have also global, weave and thread Refs folders, but we can have N reference docs in each level. Context, just 1 per level.

### 2. Ctx docs and ULIDs
yes, all docs have ULID id and slug

### 3. Confirming `child_ids` removal
yes, same migration

### 4. Slug field — keep or drop?
The main reason to keep them is for requires_load.
And requires_load only point to reference docs.
Making a good UX to select only reference docs its easy.
Help me with this, I am not sure how to deal with slug, how to mantain it.

Also we need to analyse if we need 3 levels for:
- context: yes, to load automatically only needed context and save tokens
- refs: maybe we could use only global refs, simple. Maybe this make easier requires_load field

### 5. Migration scope check
Agree

---

What you think? Im tired

## AI:

Short answers — you're tired, so I'll keep it tight.

### Auto-loaded ctx + `requires_load` for refs only

Clean. Resolves both the "what gets auto-loaded" and "what's writeable by hand" questions in one move:

- **Ctx docs** = automatic, scoped by level (global always, weave + thread when relevant). Zero `requires_load` entries needed for ctx — the loader figures it out from the path of the doc being read.
- **Refs** = explicit, listed in `requires_load` by slug, filtered by `loadWhen:` (future). Authors write `requires_load: [vision, workflow]`, the resolver maps slug → ULID → file.

The `loadWhen:` field is a nice escape hatch for refs that should only load in specific phases (e.g. a migration ref that only matters during the migration plan).

### Slug — how to maintain it

Three rules and you're done:

1. **Slug is stable on creation, not derived from title.** Mint slug once (from title at creation, kebab-cased), store it in frontmatter, never auto-update it. Title can change freely; slug doesn't follow. This is what makes `requires_load: [vision]` survive title edits.
2. **Slug uniqueness scope = the refs namespace.** With global-only refs (see below), uniqueness is one flat check across `loom/refs/`. Easy to validate at create time.
3. **Renaming a slug is an MCP op, not a frontmatter edit.** `loom_rename(id, newSlug)` finds every `requires_load` referencing the old slug and updates them atomically (link index already does the lookup). Direct frontmatter edits to `slug:` would break references — same rule as today's `loom_rename`.

Filename = `{slug}.md` (no ULID suffix). Slug is unique in its scope, so no collision. ULID lives only in frontmatter as the durable identity; filename is presentation.

**One subtlety:** when a doc is *not* a ref (idea, design, plan, chat, ctx, done), does it still need a slug? I'd say **no** — slug only matters for things `requires_load` can point at, which is refs. Other docs use ULID for identity and filename for presentation, with the filename derived from title or thread context (today's convention). Saves a field on most docs.

### Refs: 1 level (global) or 3 levels?

**Start with global only.** Reasons:

- Loom has ~10 refs total today, all genuinely global in scope (vision, workflow, architecture-reference, etc.). No pressure for scoping yet.
- Global-only collapses slug uniqueness to one namespace — `requires_load: [vision]` resolves unambiguously, no walk-up-the-tree resolution rules.
- If a weave later needs local refs, the convention is already there: name them `{weave}-{ref}-ref.md` and put them in `loom/{weave}/refs/`. Same pattern as ctx docs. Add it when needed, not preemptively.
- Cost of starting global and adding levels later: small (just a new folder convention + resolver fallback). Cost of starting 3-level and not needing it: complexity tax forever.

So: **ctx = 3 levels (global / weave / thread)** because auto-load needs scoping to save tokens. **Refs = global only for now**, expand if a weave grows local refs.

---

That answers everything. I have no more questions.

**Ready to close and promote.** When you say `go`, I'll:
1. Create the idea doc (`doc-ids-idea.md`) — the "why": fragile identity, ULID + slug split, drop `child_ids`, ctx auto-load, refs via `requires_load`.
2. Create the design doc (`doc-ids-design.md`) — the "how": frontmatter shape, migration script scope, slug maintenance rules, ctx auto-load resolver, refs scoping decision.

Get some rest. `go` when ready.

## Rafa:

- Agreed all
- slug only on reference docs
- Refs only global level

go

## AI:

Promoted. Created:

- `loom/core-engine/doc-ids/doc-ids-idea.md` — the why (fragile identity, ULID + slug split, drop `child_ids`, ctx auto-load, refs via `requires_load`).
- `loom/core-engine/doc-ids/doc-ids-design.md` — the how (frontmatter shape, slug rules, ctx auto-load resolver, link index changes, migration script, sequencing, acceptance criteria).

Note: MCP sampling isn't available in this client, so I drafted both docs from the chat content directly via `loom_update_doc` rather than via `loom_promote`'s sampling path. Content reflects the four-question resolution above (slug-on-refs-only, refs-global-only, all the rest agreed).

Both docs are `status: draft`. Review when rested — adjust anything that doesn't read right, or say `finalize` to set them active. Next step after that would be a plan doc breaking the migration into implementation steps, but per your earlier note this is **post-MVP**, so no rush.

✅ Chat → idea + design promoted.

Next: review drafts when you're ready, then `finalize` or request edits.

STOP — waiting for go.