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
