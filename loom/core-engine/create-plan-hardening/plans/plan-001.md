---
type: plan
id: pl_01KV95YQBDJ2Q6XVD88X0VN45E
title: Harden loom_create_plan against malformed agent calls
status: done
created: 2026-06-16
updated: 2026-06-16
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 1.9.1
steps:
  - id: confirm-root-cause
    order: 1
    status: done
    description: "Confirm the root cause by tracing createPlan.ts → weavePlan.ts: wire blob lands in goal, steps arrives undefined → steps:[] + body leak; tool still returns success"
    files_touched: [packages/mcp/src/tools/createPlan.ts, packages/app/src/weavePlan.ts]
    blocked_by: []
    satisfies: []
  - id: add-throw-on-malformed-guards-in
    order: 2
    status: done
    description: Add assertNoWireLeak (reject tool-call wire markers in goal/title) and coerceSteps (JSON.parse stringified steps; reject non-array / non-object / missing-description) in weavePlan; throw on malformed; drop the lying as-any cast in createPlan.ts
    files_touched: [packages/app/src/weavePlan.ts, packages/mcp/src/tools/createPlan.ts]
    blocked_by: []
    satisfies: []
  - id: regression-tests
    order: 3
    status: done
    description: Add tests/create-plan-hardening.test.ts (7 cases incl. no-file-written on leak) and register in test-all.sh; fix req-usecases.test.ts which relied on the old lenient bare-string-steps shape
    files_touched: [tests/create-plan-hardening.test.ts, scripts/test-all.sh, tests/req-usecases.test.ts]
    blocked_by: []
    satisfies: []
---
# Harden loom_create_plan against malformed agent calls

## Goal

Make loom_create_plan fail loudly on a malformed agent tool-call instead of silently persisting a corrupt plan and returning success. Root cause (confirmed by tracing the code): a malformed call delivered the tool-call wire blob in `goal` while `steps` arrived undefined, so the plan was written with `steps: []` and the raw wire markers serialized into the body. The guard lives in the app use-case (weavePlan) so every surface — CLI, MCP, extension — inherits it.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Confirm the root cause by tracing createPlan.ts → weavePlan.ts: wire blob lands in goal, steps arrives undefined → steps:[] + body leak; tool still returns success | packages/mcp/src/tools/createPlan.ts, packages/app/src/weavePlan.ts | — | — |
| ✅ | 2 | Add assertNoWireLeak (reject tool-call wire markers in goal/title) and coerceSteps (JSON.parse stringified steps; reject non-array / non-object / missing-description) in weavePlan; throw on malformed; drop the lying as-any cast in createPlan.ts | packages/app/src/weavePlan.ts, packages/mcp/src/tools/createPlan.ts | — | — |
| ✅ | 3 | Add tests/create-plan-hardening.test.ts (7 cases incl. no-file-written on leak) and register in test-all.sh; fix req-usecases.test.ts which relied on the old lenient bare-string-steps shape | tests/create-plan-hardening.test.ts, scripts/test-all.sh, tests/req-usecases.test.ts | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
