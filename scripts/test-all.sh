#!/bin/bash
# Run the full Loom test suite

set -e  # Stop on first error

cd "$(dirname "$0")/.."

TS_NODE="npx ts-node --project tests/tsconfig.json"

echo ""
echo "══════════════════════════════════════════"
echo "  Loom Test Suite"
echo "══════════════════════════════════════════"
echo ""

run_test() {
    local file="$1"
    echo "▶ $file"
    $TS_NODE "$file"
    echo ""
}

# Step 1: Entity tests (no IO)
run_test tests/entity.test.ts

# Step 2: weaveRepository (done/ subfolder)
run_test tests/weave-repository.test.ts

# Step 3: planReducer
run_test tests/plan-reducer.test.ts

# Step 4: CLI commands + completeStep use-case
run_test tests/commands.test.ts

# Step 5: closePlan use-case (mock AI)
run_test tests/close-plan.test.ts

# Step 6: doStep use-case (mock AI)
run_test tests/do-step.test.ts

# Context pipeline: pure assembler + serialiser (no IO)
run_test tests/context-assembler.test.ts

# Plan table utils: steps-table rewrite must not truncate trailing sections
run_test tests/plan-table-utils.test.ts

# Event save scope: a single event persists only the doc it changed (no blast radius)
run_test tests/event-save-scope.test.ts

# Step 7: buildCtxSource — pure ctx source assembler + helpers (no IO)
run_test tests/build-ctx-source.test.ts

# Step 8: workspace workflow — real filesystem at j:/temp/loom (Phase 6, thread + multi-thread)
run_test tests/workspace-workflow.test.ts

# Legacy integration tests
run_test tests/id-management.test.ts
run_test tests/multi-loom.test.ts
# tests/weave-workflow.test.ts — pending Phase 6 rewrite (tests old flat-layout CLI workflow)

# MCP integration tests (spawns loom mcp subprocess)
run_test packages/mcp/tests/integration.test.ts

echo "══════════════════════════════════════════"
echo "  ✅ All tests passed"
echo "══════════════════════════════════════════"
echo ""
