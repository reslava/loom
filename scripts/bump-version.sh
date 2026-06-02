#!/bin/bash
# Bump the synchronized Loom version across all 7 package.json files and roll the
# CHANGELOG. Edits files only — it does NOT commit or tag. Review the READMEs and
# CHANGELOG, then commit and `git tag vX.Y.Z` by hand.
#
# Usage: bash scripts/bump-version.sh X.Y.Z
set -euo pipefail

VERSION="${1:-}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Usage: bash scripts/bump-version.sh X.Y.Z   (semver core, e.g. 0.8.0)" >&2
    exit 1
fi

cd "$(dirname "$0")/.."

# 1. Bump every package.json (root + all workspaces) in one shot. No git tag/commit
#    — tagging is the maintainer's manual step. file: workspace deps carry no
#    version range, so nothing else needs rewriting.
echo "📦 Bumping all package.json files to $VERSION ..."
npm version "$VERSION" \
    --workspaces --include-workspace-root \
    --no-git-tag-version --allow-same-version

# 2. Roll the CHANGELOG: promote [Unreleased] into a dated [X.Y.Z] section, leave a
#    fresh empty [Unreleased] on top, and fix the link refs. Done in node — safer
#    than sed for multi-line section surgery.
echo "📝 Rolling CHANGELOG.md ..."
VERSION="$VERSION" node <<'NODE'
const fs = require('fs');
const version = process.env.VERSION;
const date = new Date().toISOString().slice(0, 10);
const file = 'CHANGELOG.md';
let s = fs.readFileSync(file, 'utf8');

if (!/^## \[Unreleased\]$/m.test(s)) {
    console.error('   CHANGELOG.md has no "## [Unreleased]" section — cannot roll.');
    process.exit(1);
}

// Promote the current [Unreleased] body into a dated version section, with a
// fresh empty [Unreleased] left on top.
s = s.replace(/^## \[Unreleased\]$/m, `## [Unreleased]\n\n## [${version}] - ${date}`);

// Point the [Unreleased] compare link at the new tag and add a release-tag link
// for the new version directly beneath it (no-op if the link refs are absent).
s = s.replace(
    /^\[Unreleased\]:.*$/m,
    `[Unreleased]: https://github.com/reslava/loom/compare/v${version}...HEAD\n` +
    `[${version}]: https://github.com/reslava/loom/releases/tag/v${version}`
);

fs.writeFileSync(file, s);
console.log(`   [Unreleased] -> [${version}] - ${date}`);
NODE

# 3. Assert every version-bearing package.json now matches — this mirrors the
#    `release` workflow's guard job exactly, so the bump fails loudly here rather
#    than at CI if any file was missed (e.g. a name collision swallowing the root).
echo "🔎 Verifying all 7 package.json versions match $VERSION ..."
fail=0
for pkg in package.json \
           packages/core/package.json \
           packages/fs/package.json \
           packages/app/package.json \
           packages/mcp/package.json \
           packages/cli/package.json \
           packages/vscode/package.json; do
    pv="$(node -p "require('./$pkg').version")"
    if [ "$pv" != "$VERSION" ]; then
        echo "   ✗ $pkg = $pv (expected $VERSION)" >&2
        fail=1
    fi
done
if [ "$fail" -ne 0 ]; then
    echo "Bump incomplete — some package.json files were not updated. Fix before tagging." >&2
    exit 1
fi

echo "✅ Bumped to $VERSION. Next: review the 3 READMEs + CHANGELOG, then:"
echo "     git commit -am \"release: v$VERSION\" && git tag \"v$VERSION\" && git push --follow-tags"
