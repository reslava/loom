---
type: idea
id: json-output-idea
title: "`--json` Flag for All CLI Commands"
status: deferred
created: 2026-04-17
version: 1
tags: [cli, json, scripting, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# `--json` Flag for All CLI Commands

## Problem
The CLI currently outputs human‑readable text with colors and formatting. This is great for interactive use, but makes scripting and testing difficult. Parsing colored text from `loom status` or `loom validate` is brittle and error‑prone.

## Idea
Add a `--json` flag to every CLI command that produces structured output. When `--json` is present, the command outputs a single JSON object (or array) to stdout, with no colors or extra formatting. Stderr remains for error messages.

**Example:**
```bash
loom status --json
# Output: { "threads": [ { "id": "example", "status": "ACTIVE" } ] }

loom validate --all --json
# Output: { "valid": ["example"], "invalid": [ { "id": "test", "issues": [...] } ] }
```

This enables:
- Shell scripts to parse Loom state reliably.
- CI/CD pipelines to validate Loom documents.
- The test suite to use `--json` for precise assertions.

## Why Defer
- The human‑readable output is sufficient for MVP.
- Adding `--json` requires defining a stable schema for each command's output.
- We can add it incrementally to commands as needed.

## Open Questions
- Should `--json` suppress all stderr output except fatal errors?
- Should there be a `--pretty` flag for formatted JSON?

## Next Step
Implement `--json` for the most scripted commands (`status`, `validate`, `list`) first. Create `json-output-plan-001.md` when ready.

**Status: Deferred for post‑MVP consideration.**