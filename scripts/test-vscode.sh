#!/bin/bash
# Run the Loom VS Code Extension Host tests (Phase 2)
# Requirements: VS Code installed, packages built

set -e

cd "$(dirname "$0")/.."

echo ""
echo "══════════════════════════════════════════"
echo "  Loom VS Code Extension Host Tests"
echo "══════════════════════════════════════════"
echo ""

# Step 1: Build the VS Code extension
echo "▶ Building VS Code extension..."
(cd packages/vscode && npm run build)
echo ""

# Step 2: Compile the Extension Host test files
echo "▶ Compiling Extension Host tests..."
npx tsc -p tests/vscode/tsconfig.json
echo ""

# Step 3: Launch the Extension Host test runner
echo "▶ Running Extension Host tests..."
node tests/vscode/out/runTests.js

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Extension Host tests passed"
echo "══════════════════════════════════════════"
echo ""
