---
type: chat
id: ch_01KX04F9YF26QAWJM1V1W3KBEM
title: loom-resource-catalog Chat 001
status: done
created: 2026-07-08
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 14
---
# loom-resource-catalog Chat 001

## Rafa:

read idea

maybe we could add an optional filter 
`loom catalog {filter}`
to get only tools, or only resources or only prompts

is it all grounded?

## AI:

Read the idea, and checked every factual claim against the code. **Mostly grounded — three caveats.**

**What's solidly grounded:**
- ✅ `loom://catalog` is auto-generated from the live tool registry — `buildToolCatalog(TOOLS)` → `registerToolCatalog` (`packages/mcp/src/catalog.ts:45`, wired at `server.ts:147`). Never drifts. True.
- ✅ The three source arrays exist exactly where the idea says: `PROMPTS` (`server.ts:102`), `CONCRETE_RESOURCES` (`:106`), `RESOURCE_TEMPLATES` (`:118`). So "generate the catalog from the same arrays the server serves" is real and cheap.
- ✅ No catalog resource for resources/prompts today. Confirmed.
- ✅ The `mcp-read-surface-naming` dependency is **already `done`** (state summary) — so "land after/with it" is satisfied; it's no longer a blocker, just a fact that the names are already corrected (`{docUlid}`, `{weaveSlug}/{threadSlug}`).

**Three things the idea slightly overstates or misses:**

1. **"A human can't list resources" is only true inside Claude CLI's `/mcp` view.** The `loom` CLI *already* has `loom resources` (lists concrete resources, uri+title) and `loom resources read <uri>` (`packages/cli/src/commands/resources.ts`). So the human isn't fully blind. The Problem section should narrow to: *no grouped, param-annotated catalog covering **templates + prompts**.*

2. **The real gap is templates + prompts, not resources-in-general.** `loom resources` calls `listResources()`, which returns **only `CONCRETE_RESOURCES`** — the templated resources (`loom://context/...`, `loom://docs/...`, `loom://plan/...`, `loom://requires-load/...`) and all prompts are invisible to it. That's the precise drift-prone surface `mcp-reference.md` §1 hand-maintains. Worth stating the gap this sharply in the design — it's narrower and more defensible than "humans can't see resources."

3. **Surface overlap to resolve (clean-code):** if we ship a combined catalog, `loom resources` and `loom catalog resources` would do nearly the same thing. Decide now whether the new catalog *supersedes* `loom resources` (fold it in) or they coexist. My lean: fold — one surface index, not two.

---

**On your `loom catalog {filter}` proposal — yes, but push the filter down a layer.**

The filter is worth having, but if it lives only as a CLI arg, an MCP *agent* reading `loom://catalog` gets no benefit. Make it a **resource query param** and let the CLI pass it through:

- `loom://catalog?kind=tools` · `?kind=resources` · `?kind=prompts` (omit = whole surface)
- `loom catalog tools` → just reads `loom://catalog?kind=tools`

That way agents and the terminal share one mechanism, and it stays consistent with how `loom://state?shape=summary` already query-params the resource.

**One consequence to be explicit about:** a filter presupposes the **one-combined-catalog** answer to the idea's open question (tools+resources+prompts in one resource, sectioned). The idea already leans that way; the filter locks it in. If we go combined, the resource header "Loom MCP **tools**" has to become "Loom MCP **surface**," and the session-start protocol keeps its single `loom://catalog` read (now covering all three). I think combined is right — one read, one drift-free source — but flagging it as the decision the filter forces.

**Naming nit (API rule):** `kind` reads cleanly and is unambiguous; avoid `filter` as the param name since it doesn't say *filter by what*.

---

**Open decisions before a design:**
1. Combined `loom://catalog` (my lean) vs. separate `loom://resource-catalog`? The filter argues for combined.
2. Fold `loom resources` into the new catalog, or keep it? (my lean: fold)
3. `?kind=tools|resources|prompts` as the filter shape — agree?

Answer those and I'll write the design. Not touching anything until the shape's settled.

## Rafa:

agree with your leans
write design

## AI:

Design written — `design.md` (`de_01KX05QVG0ZQ343932H8E1C2S1`), status `draft`. Locks in all three leans:

- **One combined `loom://catalog`** (Tools · Resources · Prompts), header becomes "Loom MCP surface"; session-start keeps its single catalog read.
- **`?kind={tools|resources|prompts}`** filter on the resource; CLI `loom catalog [kind]` passes through; invalid kind errors with the valid set.
- **Fold `loom resources` (list)** into `loom catalog resources`; keep `loom resources read <uri>` as the generic reader.
- Generated from the live `TOOLS` / `CONCRETE_RESOURCES` / `RESOURCE_TEMPLATES` / `PROMPTS` arrays → drift-free. `catalog.ts` grows `buildResourceCatalog` + `buildPromptCatalog`, composed by a `buildCatalog(..., kind?)`; four small variants pre-rendered once at construction (registry is static).
- Same-change doc sweep: `mcp-reference.md` §1 points at the live catalog instead of duplicating; session-start wording "tool index" → "surface index".

One minor open question left for the plan: resource grouping — **Concrete/Templated two-subsection split** (my lean, matches the tool catalog's grouped style) vs. one flat list.

Review the design when you can. Say `go` (or answer the grouping question) and I'll write the plan.

## Rafa:

Briefly explain resource grouping: Concrete/Templated two-subsection split

## AI:

The Resources section would split by whether the URI is a fixed address or a fill-in-the-blank template — the same distinction the MCP server itself makes (`CONCRETE_RESOURCES` vs `RESOURCE_TEMPLATES`, two separate arrays and two separate list handlers). Rendering mirrors that:

**Concrete** — read verbatim, no params:
- `loom://state` — full project state
- `loom://roadmap` — derived cross-weave roadmap
- `loom://catalog` — this surface index
- …(status, link-index, diagnostics, summary, refs, feedback-context)

**Templated** — you fill a `{placeholder}` to address one thing:
- `loom://context/{docUlid}` — context bundle for a doc
- `loom://docs/{docUlid}` — raw markdown of a doc
- `loom://plan/{planUlid}` — plan with parsed steps
- `loom://requires-load/{docUlid}` — a doc's requires_load closure

Why split rather than one flat list: the two kinds are *used* differently — concrete you just read, templated you must construct with an id/slug — so grouping tells the reader at a glance which ones need an argument. It also matches the tool catalog's existing grouped style, and it's free because the server already keeps them in two arrays (no classification logic to write). The alternative, one flat list, buries that "needs a param" signal and mixes `loom://state` next to `loom://context/{docUlid}` as if they're the same shape of thing.

That's the only open question left on the design — say `go` and I'll write the plan.

## Rafa:

agree with your lean Concrete/Templated two-subsection split
go

## AI:

Plan written — `plan-001.md` (`pl_01KX06HTCVST3REW77FHEDSWFB`), 5 steps, Concrete/Templated split baked in:

1. **Whole-surface catalog builder** — `catalog.ts`: add pure `buildResourceCatalog` (Concrete / Templated) + `buildPromptCatalog`, a `buildCatalog(..., kind?)` composer under a "Loom MCP surface" header, and a `{ all, tools, resources, prompts }` variant cache.
2. **Server wiring + `?kind=` parsing** — `server.ts`: feed CONCRETE_RESOURCES/RESOURCE_TEMPLATES/PROMPTS into the builder, parse `?kind=` (throw on invalid), refresh the `loom://catalog` entry's name/description. *(blocked by 1)*
3. **CLI `loom catalog [kind]`; drop `loom resources` list** — keep `loom resources read <uri>`. *(blocked by 2)*
4. **Doc sweep** — `mcp-reference.md` §1 → live catalog; "tool index" → "surface index" in CLAUDE.md + LOOM_CLAUDE_MD template + ctx.md. *(blocked by 2)*
5. **Surface-catalog test** — `tests/catalog-surface.test.ts` asserting all three sections, `?kind=` filtering, and invalid-kind error. *(blocked by 2)*

Heads-up: I tried to finalize the design and got `Current status: done` — looks like you moved it via the extension. Left it as-is, didn't revert.

Plan is `draft`. `go` to start plan + do step 1, or adjust the steps first.

## Rafa:

I alredy started the plan
do whole plan

## AI:

Whole plan done — `plan-001` auto-completed (all 5 steps ✅), done doc at `done/plan-001-done.md`.

**What shipped:**
- `loom://catalog` now indexes the **whole MCP surface** — Tools · Resources (Concrete / Templated) · Prompts — generated from the live `TOOLS` / `CONCRETE_RESOURCES` / `RESOURCE_TEMPLATES` / `PROMPTS` arrays, so it can't drift.
- **`?kind=tools|resources|prompts`** filters to one section (invalid kind → error listing the valid set); CLI **`loom catalog [kind]`** passes it through.
- **Folded `loom resources` (list)** → `loom catalog resources`; kept `loom resources read <uri>` as the generic reader.
- `buildToolCatalog` kept byte-identical (Tools section), so old consumers and `?kind=tools` are unchanged.
- Docs swept: `mcp-reference.md` §1 now points at the live catalog (no more duplicated list); session-start wording "tool index" → "surface index" in CLAUDE.md + template + ctx.md.

**Verification:** build-all clean; full `test-all` green (new `tests/catalog-surface.test.ts` + updated `commands.test.ts`, and the mcp integration / cli-mcp-client / claude-md-sync tests all pass); live smoke of `loom catalog prompts` and an invalid kind both behave.

One tiny cosmetic artifact I noticed and left: `firstSentence` truncates the `do-next-step` arg help at "Plan ULID (e.g." — the same first-sentence rule the tool catalog already uses, so I didn't special-case it. Say the word if you'd rather it not clip on "e.g.".

Nothing committed (you didn't ask). Next: `commit` to land it, or point me at the next thing.

## Rafa:

I did a quick check
I did not found resources:
`loom://context/thread/{weaveSlug}/{threadSlug}`
`loom://context/{weaveSlug}/{threadSlug}/{docSlug}`

## AI:

You're right, and it points at a real defect — but not in the catalog. **The catalog is honest; the registry is under-declared.**

The context resource is a **single** `RESOURCE_TEMPLATES` entry (`server.ts:120`):
```
{ uriTemplate: 'loom://context/{docUlid}', name: 'Context Bundle',
  description: '... Three forms — ULID: loom://context/{docUlid}; thread slug: loom://context/thread/{weaveSlug}/{threadSlug}; doc slug: loom://context/{weaveSlug}/{threadSlug}/{docSlug} ...' }
```
The two slug-path forms live only inside the **description prose**. The catalog renders one line per entry = `uriTemplate` + the *first sentence* of the description — so it shows `loom://context/{docUlid}` and truncates the rest. Faithful to the registry, but the registry hides two-thirds of the real addressing surface.

**And it's not just the catalog that's blind** — the MCP `ListResourceTemplates` response is built from the same array (`server.ts:154`), so *every* MCP client's resource-template list only ever advertised `{docUlid}`. You just hit the same blind spot from the catalog side.

**Root cause:** the registry should be the true declaration of what the server serves. The handler already dispatches all three forms by prefix (`uri.startsWith('loom://context/')` → `handleContextResource` parses whichever shape), so the fix is **declaration-only**:

- Add two first-class `RESOURCE_TEMPLATES` entries — `loom://context/thread/{weaveSlug}/{threadSlug}` and `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` — with distinct names (e.g. "Context Bundle (by thread slug)" / "(by doc slug)"). No handler change.
- The catalog then lists all three automatically (drift-free), and so does the MCP template list.

**Alternative I considered and reject:** just make the catalog print full descriptions instead of first sentences. That's a band-aid — it papers over the catalog view but leaves `ListResourceTemplates` still advertising a single form to every other client. Fix the source, not the view.

This is a small follow-up to *this* thread (the catalog exposed the gap, so it's fair game here). Want me to do it and record it as a `plan-002` on this thread? `go` and I'll add the two entries + a test asserting all three context forms appear in both the catalog and the template list.

## Rafa:

first, ensure that there is not other resources hidden (or tools...)
do loom_quick_ship

## AI:

Audited the whole surface first, then fixed and quick-shipped (`plan-002`, done).

**Audit result — one defect, no others:**
- **Tools** can't hide — the catalog and `ListTools` both derive from the single `TOOLS` array, and `CallTool` has no out-of-array handler. Same for **prompts** (`PROMPTS` → `ListPrompts` + `GetPrompt`).
- **`docs` / `plan` / `requires-load`** are honest single-form `{id}` handlers.
- **`loom://context`** was the only under-declared one: it serves three URI forms but `RESOURCE_TEMPLATES` declared only `{docUlid}` — the two slug-path forms lived in the description prose, so both the catalog *and* every MCP client's `ListResourceTemplates` were blind to them. (Tellingly, `mcp-reference.md` already documented all three by hand — the hand-doc knew, the machine registry didn't. That's the drift the catalog is meant to kill, pointing the other way.)

**Fix (root cause, declaration-only):** added the two slug-path forms as first-class `RESOURCE_TEMPLATES` entries, each with a form-identifying first sentence. The handler already dispatched all three by prefix, so no handler change. Now the catalog lists all three and `ListResourceTemplates` advertises all three.

**Guard:** integration test now asserts all three context forms appear in both `loom://catalog` and `ListResourceTemplates` (regression guard for exactly this defect), plus a `?kind=resources` filter check. Build clean, full `test-all` green, live `loom catalog resources` shows all three.

Nothing committed. Next: `commit` to land both plans (the surface catalog + this context-forms fix), or point me onward.

## AI:

Committing both plans to `main` as one logical unit — the whole-surface `loom://catalog` (tools + resources + prompts, `?kind=` filter, CLI passthrough, folded `loom resources` list) and the `loom://context` three-forms declaration fix — along with the code, tests, doc sweep, and this thread's design/plan/done docs. Commit is the last action of this turn so the tree lands clean.