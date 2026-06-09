# Architecture Overview — REslava Loom

A high-level technical map of REslava Loom for contributors and curious users: how it stores state in Markdown, derives everything else, and keeps integrity without a database.

> **This is the reader's-eye view.** The *canonical* architectural facts — the exact package dependency rule, MCP surface, doc-type table, frontmatter schema, directory layout, and file-naming rules — live in **[architecture-reference](../loom/refs/architecture-reference.md)**. The *implementation contract* — the two API surfaces, the dependency-injection pattern, reducer purity, ID lifecycle, and the known gotchas — lives in **[implementation-contract-reference](../loom/refs/implementation-contract-reference.md)**. When this overview and a reference disagree, the reference wins; tell us so we can fix the overview.

---

## 1. Core philosophy: the filesystem *is* the database

One uncompromising principle drives everything:

> **Markdown files are the single source of truth. There is no central state machine and no hidden cache.**

Workflow status is never stored in a `.json` cache, a SQLite file, or an in-memory global. The status of a thread is **derived** by reading the frontmatter of the Markdown files on disk, every time it's needed.

**Why this matters:**
- **Git-native** — every state change is a version-controlled file diff.
- **Human-readable** — you can read and edit status directly in the editor; no proprietary UI required to see the truth.
- **Resilient** — if the extension crashes or the CLI breaks, the state is intact: it's just files.

---

## 2. The layers

Loom is built in six packages with a strict, one-directional dependency rule:

```
   cli            vscode            mcp          ← delivery surfaces
 (terminal)   (human UI panel)  (agent surface)
     │              │               │
     │              └───────┐       │
     │   (inspection)  MCP-only     │  the gate
     ▼              ▼       ▼        ▼
                  app (use-cases)            ← orchestration: (input, deps) => result
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
        core                 fs               ← domain + infrastructure
   (pure logic)        (file IO, parsing,
   entities, reducers,  repositories, link
   events, validation)  index, serializers)
```

**Dependency rule — layers never import upward:**
- `cli` may call `app` directly (for inspection) or go through MCP (for mutations).
- `vscode` calls **MCP only** — no direct `app` imports. It is a thin MCP *client*.
- `mcp` imports **only** `app` — it is the gate through which agents mutate state.
- `app` imports **only** `core` and `fs`.
- `core` imports only itself; `fs` imports `core` and standard libraries.

**MCP is the primary gate.** Both agents (via the MCP server) and the human VS Code panel (as an MCP client) route mutations through the same surface, so they can't drift apart. See [architecture-reference §1–2](../loom/refs/architecture-reference.md).

---

## 3. The document model

Every doc shares a common frontmatter (`BaseDoc`): `id`, `type`, `title`, `status`, `version`, `parent_id` / `child_ids` (the links that form a **thread**), and `requires_load`. The doc types and their lifecycles:

| Type | Purpose | Statuses |
|------|---------|----------|
| `chat` | Free-form AI conversation log (the thinking surface). | — |
| `req` | The thread's locked scope spec (include / exclude / constraints). | `draft`, `locked` |
| `idea` | Raw concept, pre-design. | `draft`, `active`, `done`, `cancelled` |
| `design` | Design conversation + decision log. | `draft`, `active`, `closed`, `done`, `cancelled` |
| `plan` | Implementation plan — structured `steps` in frontmatter (source of truth); the body table is a generated view. | `draft`, `active`, `implementing`, `done`, `blocked`, `cancelled` |
| `done` | Post-implementation record. | — |
| `ctx` | AI context summary — **global + weave scope only** (no thread ctx). | `draft`, `active`, `done`, `cancelled` |
| `reference` | Static architectural facts that docs cite. | `active` |

*Custom workflows can add types and statuses via `.loom/workflow.yml`.* The canonical frontmatter key order and the per-type fields (`role`, `design_version`, `target_release`, `load` / `load_when`, `req_version`) are specified in [architecture-reference §3](../loom/refs/architecture-reference.md). For the requirements model specifically, see [loom-requirements-reference](../loom/refs/loom-requirements-reference.md).

---

## 4. Derived state — the brain

The aggregates (`LoomState`, `Thread`, weave/thread status) are **computed on the fly, never written to disk**:

- **Thread resolution** — a recursive walk of `parent_id` links groups all docs that resolve to the same primary `design` into one `Thread`.
- **Status calculation** — if any plan is `implementing` → thread is *implementing*; else if any doc is `active` → *active*; else if all plans are `done` → *done*. `ctx`, `reference`, and (perpetual) `req` docs are excluded from the every-done predicate, so they never block `DONE`.
- **Staleness** — a plan is stale when `plan.design_version < design.version`; a doc built against a `req` is stale when its `req_version` falls behind a re-locked req; a ctx is stale when its scope changed after it was generated. Stale docs are **flagged, never silently used or dropped** (`loom_get_stale_docs`).

---

## 5. Event-sourcing & pure reducers

State changes happen **only** through events — the UI and CLI never mutate a file's state directly:

1. **Trigger** — e.g. you click *Start Plan*, or an agent calls `loom_start_plan`.
2. **Event** — `{ type: 'START_PLAN', payload: { planId } }`.
3. **Reducer** — a **pure** function (`packages/core/*Reducer.ts`, signature `(doc, event) => doc`) computes the new frontmatter state. No `fs`, no network, no VS Code calls — trivially testable and deterministic.
4. **Persist** — the `app` layer hands the updated doc to `fs`, which serializes frontmatter (always via `serializeFrontmatter`, for canonical key order) and writes the file.

Reducer purity is a hard invariant — all IO lives in `fs`, all orchestration in `app`. See [implementation-contract-reference](../loom/refs/implementation-contract-reference.md) for the reducer contract and the two API surfaces (`getState` for reads, the event path for writes).

---

## 6. The context pipeline

Whenever an AI action launches, a **Unified Context Pipeline** assembles the docs the AI should see and bakes them into the prompt *before* it runs — the user never pastes context. The heart is a **pure** function, `assembleContext(targetId, mode, overrides, state) → ContextBundle` in `packages/app`; the single impure step (reading state + `.loom/context-prefs.json`) lives in the MCP `loom://context/{id}` resource.

The same `ContextBundle` drives three surfaces — the injected prompt, the `📄 … loaded for context` visibility lines, and the sidebar CONTEXT panel — so they cannot disagree. Assembly order: global ctx → weave ctx → thread `req` → `load: always` references (filtered by mode via `load_when`) → parent chain → target → `requires_load` (resolved transitively). Full design: [loom-context-pipeline-reference](../loom/refs/loom-context-pipeline-reference.md).

---

## 7. Multi-loom workspaces

Loom runs in two modes; the physical structure of a loom is identical in both — only *discovery* differs:

- **Mono-loom** — `.loom/` lives at a project root, alongside `src/`, `package.json`. The CLI finds `.loom/` in the current directory or any parent.
- **Multi-loom** — a global registry at `~/.loom/config.yaml` tracks several looms; `loom switch` changes the active one.

---

## 8. Security model

| Vector | Mitigation |
|--------|------------|
| **Arbitrary code execution** | The `run_command` effect is **disabled by default**; requires opt-in via `reslava-loom.allowShellCommands: true`. |
| **Path traversal** | Command `cwd` is restricted to the workspace root unless `allowOutsideCwd` is explicitly set. |
| **Secret leakage** | Environment variables matching `*TOKEN*` / `*SECRET*` are filtered from subprocess env unless explicitly allowed. |

---

## 9. Extension points

The architecture extends without touching the core engine:

1. **Custom document types & statuses** — declared in `.loom/workflow.yml`.
2. **Custom validators** — `loom validate` enforces cross-document consistency rules from `.loom/workflow.yml`.
3. **Custom effects** — arbitrary scripts via `run_command` (when enabled).

---

## Related reading

- [architecture-reference](../loom/refs/architecture-reference.md) — canonical structural facts (the source this overview summarizes).
- [implementation-contract-reference](../loom/refs/implementation-contract-reference.md) — implementation contract & gotchas.
- [loom-context-pipeline-reference](../loom/refs/loom-context-pipeline-reference.md) — how context is assembled.
- [loom-requirements-reference](../loom/refs/loom-requirements-reference.md) — the requirements model.
- [AI_INTEGRATION.md](AI_INTEGRATION.md) — how the AI plugs in through MCP.
