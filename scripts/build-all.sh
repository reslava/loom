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
rm -rf packages/core/dist packages/fs/dist packages/telemetry/dist packages/app/dist packages/cli/dist packages/mcp/dist

echo "📦 Building core..."
cd packages/core && npx tsc --build --force

echo "📦 Building fs..."
cd ../fs && npx tsc --build --force

echo "📦 Building telemetry..."
cd ../telemetry && npx tsc --build --force

echo "📦 Building app..."
cd ../app && npx tsc --build --force

echo "📦 Building mcp..."
cd ../mcp && npx tsc --build --force

echo "📦 Building cli (bundled with esbuild)..."
cd ../cli && node esbuild.js

# Surface whether the PostHog key was baked into this bundle. Key-less builds are
# structurally Noop (telemetry can never send) — this line makes that visible at
# every build so a silent key-less local build never masquerades as working.
if [ -n "$LOOM_POSTHOG_KEY" ]; then
    echo "🔑 PostHog key: present — telemetry can send"
else
    echo "🔑 PostHog key: absent — telemetry is Noop (set LOOM_POSTHOG_KEY before building to bake it)"
fi

echo "🔗 Linking CLI globally..."
npm link --force

echo "📦 Building vscode..."
cd ../vscode && npx tsc --build --force

echo "✅ Build complete. 'loom' command is ready."