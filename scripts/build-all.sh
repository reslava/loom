#!/bin/bash
# Build all Loom packages in correct dependency order

set -e  # Stop on first error

echo "🧹 Cleaning dist folders..."
rm -rf packages/core/dist packages/fs/dist packages/cli/dist

echo "📦 Building core..."
cd packages/core && npx tsc --build --force

echo "📦 Building fs..."
cd ../fs && npx tsc --build --force

echo "📦 Building cli..."
cd ../cli && npx tsc --build --force

echo "🔗 Linking CLI globally..."
npm link --force

echo "✅ Build complete. 'loom' command is ready."