# CHAT

## Rafa:

Are we ready for `loom/ai-integration/mcp/plans/mcp-plan-001.md`?
Is good idea create a `tag` before start? other suggestion?

## AI:

**Yes, tag first — 100% agree.**

Create `v0.4.0` (or `v0.4.0-pre-mcp`) before touching anything. Existing tags follow the pattern `v0.3.1`, `v0.3.0-pre-*`, so a pre-MCP tag fits naturally. `packages/mcp/` is a major new delivery layer — having a clean rollback point is worth 10 seconds.

**Are we ready?**

Yes. The app layer is complete — all 25 use cases are built and in `packages/app/dist/`:
`chatNew`, `chatReply`, `closePlan`, `completeStep`, `doStep`, `finalize`, `getState`, `promoteToDesign`, `promoteToIdea`, `promoteToPlan`, `refineIdea`, `refinePlan`, `rename`, `summarise`, `validate`, `weaveDesign`, `weaveIdea`, `weavePlan`, + multi-loom commands. 

Phase 4-5 of the plan ("thin MCP wrappers over `packages/app/` use cases") has no app-layer blockers.

**Two other suggestions before starting:**

1. **Activate the design** — `mcp-design.md` is still `status: draft`. Set it to `active` so the plan's `design_version` invariant is clean. One frontmatter field, no other changes.

2. **Install the MCP SDK** — confirm `@modelcontextprotocol/sdk` is available before Step 1. If it needs a workspace-root `npm install`, better to know now than mid-step.

After the tag + design activation, Step 1 of Phase 1 is just creating `packages/mcp/package.json`.

## Rafa:

- I have already set:
  - the design status to `active`
  - and the plan to `implementating` 

### TODO
- Create tag `v0.4.0-pre-mcp`  
- give me commands to install `@modelcontextprotocol/sdk`

## AI:

Tag created — `v0.4.0-pre-mcp` ✅

**Install the MCP SDK in `packages/mcp/` (once you create it in Step 1):**

```bash
# From the repo root — add to packages/mcp/package.json dependencies manually (Step 1),
# then install the workspace after:
npm install
```

Or if you want to install it standalone first to verify availability:

```bash
cd packages/mcp
npm install @modelcontextprotocol/sdk
```

The SDK is `@modelcontextprotocol/sdk` on npm. Current stable version is `1.x`. Step 1 of the plan writes `packages/mcp/package.json` by hand (with pinned versions), so no `npm install --save` needed — just list it in deps then run `npm install` from root to let the workspace resolve it.

Ready for Step 1 whenever you say `go`.

## Rafa:

I have already created `packages/mcp`

### TODO
- Install `@modelcontextprotocol/sdk`
- Do `mcp-plan-001.md` Phase 1, 2, commit

## AI:

Phase 1+2 committed — `e00c0e8`.

**Phase 1 (steps 1–5):**
- `packages/mcp/package.json` + `tsconfig.json`
- `src/server.ts` — factory with stubs for tools/prompts; resource dispatch
- `src/index.ts` — stdio entry point, reads `LOOM_ROOT`
- `loom mcp` wired in CLI; `packages/mcp` added to `build-all.sh` + root `tsconfig.json`

**Phase 2 (steps 6–10) — 5 resources live:**
| Resource | Returns |
|----------|---------|
| `loom://state` | Full `getState()` — supports `?weaveId=` filter |
| `loom://status` | Raw `.loom/_status.md` text |
| `loom://link-index` | `buildLinkIndex()` serialized |
| `loom://diagnostics` | Broken `parent_id`s + dangling `child_id`s |
| `loom://summary` | Health counts (weaves, plans, stale, blocked) |

Build clean. Tests passing (1 pre-existing failure unrelated to MCP).

Next: Phase 3 (document reading resources — `loom://docs/{id}`, `loom://thread-context/{weaveId}/{threadId}`, `loom://plan/{id}`, `loom://requires-load/{id}`).

## Rafa:

- Do Phase 3, 4, commit

## AI:

Phase 3+4 committed.

**Phase 3 (steps 11–14) — 4 document reading resources live:**

| Resource | Returns |
|----------|---------|
| `loom://docs/{id}` | Raw markdown of any doc by id |
| `loom://thread-context/{weaveId}/{threadId}` | Bundled: ctx summary + idea + design + active plan + requires_load refs |
| `loom://plan/{id}` | Plan frontmatter + parsed steps table as JSON |
| `loom://requires-load/{id}` | Recursive requires_load union as JSON array |

**Phase 4 (steps 15–20) — 6 document authoring tools live:**

| Tool | Delegates to |
|------|-------------|
| `loom_create_idea` | `weaveIdea` app use case |
| `loom_create_design` | `weaveDesign` app use case |
| `loom_create_plan` | `weavePlan` app use case |
| `loom_update_doc` | direct load/save, increments `version` |
| `loom_append_to_chat` | raw file append (preserves frontmatter) |
| `loom_create_chat` | `chatNew` app use case |

Build clean. Tests passing (1 pre-existing failure unrelated to MCP).

Next: Phase 5 (workflow transition tools — `loom_start_plan`, `loom_complete_step`, `loom_close_plan`, `loom_promote`, `loom_finalize_doc`, `loom_archive`, `loom_rename`).

## Rafa:

- Do Phase 5, 6, commit

## AI:

Phase 5+6 committed.

**Phase 5 (steps 21–27) — 7 workflow transition tools live:**

| Tool | Notes |
|------|-------|
| `loom_start_plan` | Fires `START_IMPLEMENTING_PLAN` event via `runEvent` |
| `loom_complete_step` | Delegates to `completeStep` app use case |
| `loom_close_plan` | Delegates to `closePlan`; stub AI client uses `notes` param or placeholder until Phase 8 sampling |
| `loom_promote` | Dispatches to `promoteToIdea/Design/Plan`; stub AI client until Phase 8 |
| `loom_finalize_doc` | Delegates to `finalize` app use case |
| `loom_archive` | Direct `fs.move` to `.archive/` (no app use case existed) |
| `loom_rename` | Delegates to `rename` app use case (updates all references) |

**Phase 6 (steps 28–32) — 5 search & query tools live:**

| Tool | Notes |
|------|-------|
| `loom_find_doc` | `findDocumentById` → `{ id, filePath }` |
| `loom_search_docs` | Case-insensitive id/title/content search; optional type + weave filter |
| `loom_get_blocked_steps` | Iterates implementing plans, runs `isStepBlocked` per step |
| `loom_get_stale_plans` | `getStalePlans()` per weave |
| `loom_get_stale_docs` | Stale plans + docs whose parent was updated after doc created |

Step 33 (`loom_refresh_ctx`) skipped — blocked by Phase 8 (sampling).

Build clean. Tests passing (1 pre-existing failure unrelated to MCP).

Next: Phase 7 (prompts) or Phase 8 (sampling) — your call.