---
type: idea
id: claude-md
title: "CLAUDE.md Lifecycle — Template, Fusion, and Maintenance"
status: draft
created: 2026-04-26
version: 1
tags: [claude-md, mcp, install, fusion, ai-integration]
parent_id: null
child_ids: []
requires_load: [loom-architecture]
---

# CLAUDE.md Lifecycle — Template, Fusion, and Maintenance

## Problem

Loom needs a CLAUDE.md in every project it's installed in, but:
1. Many projects already have a CLAUDE.md with project-specific rules
2. Loom's CLAUDE.md rules need to be kept up to date as Loom evolves
3. Loom's own CLAUDE.md (Stage 1 manual vs Stage 2 MCP) is a different document than the one Loom produces for its users

## Three documents in play

| Document | Audience | Content |
|----------|----------|---------|
| `CLAUDE.md` (this repo) | Claude Code working on Loom | Loom-specific rules, Stage 1/2 protocol |
| `references/CLAUDE-reference.md` | Handoff target for Stage 2 | Full MCP-era CLAUDE.md for Loom's own repo |
| `references/CLAUDE-template-reference.md` | Loom end users | Project-agnostic Loom section template |

## Idea: section markers for safe fusion

Loom owns a well-defined block within the user's CLAUDE.md, wrapped in markers:

```markdown
<!-- loom:start -->
## Loom — AI Agent Persistent Memory
... all Loom rules, MCP config, session start protocol ...
<!-- loom:end -->
```

`loom init` behaviour:
- No CLAUDE.md exists → create from template
- CLAUDE.md exists, no markers → append Loom block at bottom (preserve existing content 100%)
- CLAUDE.md exists, markers present → replace content between markers (idempotent, safe to re-run)

`loom upgrade` / `loom claude-md update`:
- Same as "markers present" path — updates Loom block to current template version
- Never touches content outside markers

## What lives inside the markers (always Loom-managed)

- MCP config snippet
- Session start protocol
- Ctx hierarchy
- MCP tools rule
- Stop rules
- Key terminology
- Frontmatter reference

## What lives outside the markers (always user-owned)

- Project description
- Project architecture
- Build / test commands
- Collaboration style
- Applied learning / project-specific rules

## Open questions

1. **Marker format:** `<!-- loom:start -->` is clean but invisible in rendered markdown. Alternative: `## Loom (managed)` heading with a prose note. Which is better for discoverability?

2. **Version tracking:** Should the Loom block include a version comment (`<!-- loom:version 0.5.0 -->`) so `loom upgrade` can warn when the installed block is outdated?

3. **Multi-workspace:** If a user has multiple Loom workspaces (multi-loom feature), does each workspace get its own CLAUDE.md block, or is there a single Loom block that covers all workspaces?

4. **Conflict resolution:** What if the user's existing CLAUDE.md has a stop rule that contradicts Loom's? Silent override? Warning? Side-by-side presentation?

5. **Future — AI-assisted fusion (`loom claude-md refine`):** After v1, add a command that uses MCP sampling to intelligently merge the user's existing CLAUDE.md with the Loom template, producing a cohesive single document. Proposed to user for approval before writing.
