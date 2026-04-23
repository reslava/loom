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

# Step 7: summarise use-case (mock AI)
run_test tests/summarise.test.ts

# Step 8: workspace workflow — real filesystem at j:/temp/loom (Phase 1, no VS Code process)
run_test tests/workspace-workflow.test.ts

# Legacy integration tests
run_test tests/id-management.test.ts
run_test tests/multi-loom.test.ts
run_test tests/weave-workflow.test.ts

echo "══════════════════════════════════════════"
echo "  ✅ All tests passed"
echo "══════════════════════════════════════════"
echo ""
