---
type: plan
id: pl_01KSNAAWE8FWDV91GCBQ8E4GRF
title: "Context Pipeline — Phase 2: load / load_when filtering"
status: done
created: "2026-05-27T00:00:00.000Z"
updated: "2026-05-28T00:00:00.000Z"
version: 2
design_version: 1
tags: []
parent_id: de_01KSG5XTNGXB2KPE448CA5B586
requires_load: []
target_version: 0.1.0
steps:
  - id: add-a-field-values-always-by
    order: 1
    status: done
    description: "Add a `load` field (values \"always\" / \"by-request\", default \"by-request\") and widen the reserved `loadWhen` to `load_when: string[]` on the ReferenceDoc entity in packages/core; absent load_when means all modes"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: parse-and-serialize-in-packages-fs
    order: 2
    status: done
    description: Parse and serialize `load` + `load_when` in packages/fs frontmatter (canonical key order, array handling, back-compat defaults for docs missing the fields)
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: implement-the-assembler-filter-assemblecontext-step
    order: 3
    status: done
    description: "Implement the assembler filter (assembleContext step 2-3): auto-load only always refs, exclude by-request refs from auto-load (still includable via requires_load), and drop always refs whose `load_when` omits the current mode — excluded refs get reason `load_when-filter`; ctx docs stay implicitly always/all-modes; `refine` mode filters by the target's type per design §8"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: extend-tests-context-assembler
    order: 4
    status: done
    description: "Extend tests/context-assembler.test.ts with the load/load_when matrix: by-request excluded from auto-load yet present via requires_load; always+load_when:[design] in design mode included but excluded (load_when-filter) in implementing; always with no load_when present in every mode"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: update-loom-refs-loom-context-pipeline
    order: 5
    status: done
    description: Update loom/refs/loom-context-pipeline-reference.md phasing table to mark P2 shipped + note the absorption, then run ./scripts/build-all.sh and ./scripts/test-all.sh green
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Context Pipeline — Phase 2: load / load_when filtering

## Goal

Phase 2 of the Unified Context Pipeline: activate reference-doc context filtering inside the pure assembler. Add the `load` axis (`always` / `by-request`) and the `load_when: [mode…]` filter — both absorbed from the now-archived `load-when` and `reference-load-context` threads (Option C, 2026-05-27) — and wire step 3 of the assembler algorithm. Reference-doc filtering ships now; ctx-doc filtering follows the inert getState ctx-load gap (out of scope). VS Code tree-view UX (References section, 📌 icon, tooltip tags) is Phase 3, not here.

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a `load` field (values "always" / "by-request", default "by-request") and widen the reserved `loadWhen` to `load_when: string[]` on the ReferenceDoc entity in packages/core; absent load_when means all modes | — | — | — |
| ✅ | 2 | Parse and serialize `load` + `load_when` in packages/fs frontmatter (canonical key order, array handling, back-compat defaults for docs missing the fields) | — | — | — |
| ✅ | 3 | Implement the assembler filter (assembleContext step 2-3): auto-load only always refs, exclude by-request refs from auto-load (still includable via requires_load), and drop always refs whose `load_when` omits the current mode — excluded refs get reason `load_when-filter`; ctx docs stay implicitly always/all-modes; `refine` mode filters by the target's type per design §8 | — | — | — |
| ✅ | 4 | Extend tests/context-assembler.test.ts with the load/load_when matrix: by-request excluded from auto-load yet present via requires_load; always+load_when:[design] in design mode included but excluded (load_when-filter) in implementing; always with no load_when present in every mode | — | — | — |
| ✅ | 5 | Update loom/refs/loom-context-pipeline-reference.md phasing table to mark P2 shipped + note the absorption, then run ./scripts/build-all.sh and ./scripts/test-all.sh green | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |