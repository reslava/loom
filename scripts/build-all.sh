#!/bin/bash
# Build all Loom packages in correct dependency order

set -e  # Stop on first error

LINT=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --lint)
            LINT=true
            shift
            ;;
    esac
done

if [ "$LINT" = true ]; then
    echo "🔍 Linting core purity..."
    npm run lint
fi

echo "🧹 Cleaning dist folders..."
rm -rf packages/core/dist packages/fs/dist packages/app/dist packages/cli/dist packages/mcp/dist

echo "📦 Building core..."
cd packages/core && npx tsc --build --force

echo "📦 Building fs..."
cd ../fs && npx tsc --build --force

echo "📦 Building app..."
cd ../app && npx tsc --build --force

echo "📦 Building cli..."
cd ../cli && npx tsc --build --force

echo "🔗 Linking CLI globally..."
npm link --force

echo "📦 Building vscode..."
cd ../vscode && npx tsc --build --force

echo "📦 Building mcp..."
cd ../mcp && npx tsc --build --force

echo "✅ Build complete. 'loom' command is ready."