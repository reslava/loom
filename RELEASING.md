# Releasing Loom

Loom ships as two artifacts at **one synchronized version**:

- the CLI — `@reslava/loom` → npm
- the VS Code extension — `loom-vscode` (publisher `reslava`) → VS Code Marketplace **and** Open VSX

Releases are **tag-driven**. You bump + write notes locally and push a `vX.Y.Z`
tag; the [`release` workflow](.github/workflows/release.yml) reacts:
`guard → build-test → publish(npm · vsce · ovsx) → GitHub release`. CI never
pushes to `main` and never owns the version bump.

---

## Pre-tag checklist

Run through this **before** pushing the tag. It is trust-based — CI does not
verify most of it (the two machine-checked items are noted). Skipping a step
ships a broken or inconsistent release.

- [ ] **Record changes under `## [Unreleased]`** in [`CHANGELOG.md`](CHANGELOG.md)
      (*Keep a Changelog* format) as you go. The bump (next step) rolls this into the
      dated `## [X.Y.Z]` section that becomes the GitHub release body.
      *(Machine-checked: the `guard` job fails before any publish if no `[X.Y.Z]` section exists.)*
- [ ] **Add the extension's user-facing changes** to
      [`packages/vscode/CHANGELOG.md`](packages/vscode/CHANGELOG.md) under a new dated
      `## [X.Y.Z]` heading. This is the changelog the VS Code Marketplace and Open VSX
      display; it is **not** rolled by `bump-version.sh`, so write it by hand. If the
      extension had no functional changes this release, say so explicitly (still add the
      section — the guard requires it).
      *(Machine-checked: the `guard` job fails before any publish if no `[X.Y.Z]` section exists.)*
- [ ] **Bump the synchronized version:** `bash scripts/bump-version.sh X.Y.Z` —
      bumps all 7 `package.json`s and rolls `CHANGELOG.md` `[Unreleased]` → `[X.Y.Z]`.
      It does **not** commit or tag.
      *(Machine-checked: the `guard` job re-asserts all 7 match the tag.)*
- [ ] **Review the three READMEs** — root, CLI (`packages/cli`), extension
      (`packages/vscode`) — for accuracy at the new version. CI does **not**
      touch or verify READMEs; this is human judgment.
- [ ] **Build + test locally green:** `bash scripts/build-all.sh && bash scripts/test-all.sh`.
- [ ] **Commit, tag, push:**
      ```bash
      git commit -am "release: vX.Y.Z"
      git tag -a vX.Y.Z -m "vX.Y.Z"
      git push --follow-tags
      ```
      The tag **must be annotated** (`-a`) — `git push --follow-tags` only pushes
      annotated tags, so a lightweight `git tag vX.Y.Z` would push the branch but
      silently leave the tag local, and the release workflow would never fire.

---

## First-time setup (one-time)

Before the **first** release, each registry needs its account artifacts to exist
and a token minted, then the token stored as a GitHub secret at
**Settings → Secrets and variables → Actions**.

| Secret | Used by | How to mint it |
|--------|---------|----------------|
| `VSCE_PAT` | `publish-vsce` | Create the **`reslava` publisher** in the VS Code Marketplace (needs an Azure DevOps org), then Azure DevOps → **Personal Access Tokens** → a PAT with **Marketplace → Manage** scope. |
| `OVSX_TOKEN` | `publish-ovsx` | Sign in at open-vsx.org, accept the **Publisher Agreement**, create an **Access Token**, then create the namespace once: `npx ovsx create-namespace reslava -p <token>`. |
| `GITHUB_TOKEN` | `release` | Auto-provided by Actions — no setup. |

Store both as **Repository secrets** (Settings → Secrets and variables → Actions). They are read directly by the publish jobs.

**npm uses Trusted Publishing (OIDC) — no secret.** `publish-npm` authenticates via a
short-lived GitHub OIDC token instead of an `NPM_TOKEN`, so there is nothing to store
or rotate for npm. One-time setup: the `@reslava/loom` package must already exist on
npm (it does), then on npmjs.com open the package → **Settings → Trusted Publisher**,
add a **GitHub Actions** publisher pointing at repo **`reslava/loom`** and workflow
**`release.yml`**. The `publish-npm` job already declares `permissions: id-token: write`
and upgrades npm to a version that supports OIDC publish. (npm cannot pre-register a
trusted publisher for a package that does not exist yet — if you ever publish a *new*
scoped package, seed it once with an interactive `npm publish` before configuring OIDC.)

First-publish notes:
- **npm:** `@reslava/loom` is scoped, so publishes carry `--access public` (already wired in the workflow).
- **Marketplace + Open VSX:** the `reslava` publisher and the `reslava` Open VSX namespace must exist before the first push, or the publish step 404s.

---

## Dry-run before the first real tag

The workflow has a manual trigger that exercises everything **without publishing**:

**Actions → release → Run workflow → `dry_run: true`** (the default).

It runs `guard → build-test → publish-wiring` against the current branch (version
read from `package.json`): npm does `npm publish --dry-run`, the two marketplace
steps skip the actual publish, and the GitHub release is **not** cut. Use it to
confirm the pipeline is green before pushing your first `vX.Y.Z`.

---

## If a publish partially fails

npm versions are immutable — never try to reuse a consumed version.

1. **First, just re-run the same tag's workflow.** Every publish job is
   skip-if-already-published, so the artifact that already shipped no-ops and
   only the failed one retries. Most transient marketplace hiccups clear this way.
2. **Only if the npm content itself is wrong,** roll forward to the next
   **patch** (`X.Y.Z` → `X.Y.(Z+1)`): bump, re-tag, push. The orphaned npm
   version is harmless; leave it.

---

## Known risks / gotchas

- **The build is a dev build** (Option A): the published CLI tarball ships a
  sourcemap and is not minified. Intentional — better stack traces from user bug
  reports, and the bytes tested in `build-test` are exactly the bytes published.
- **Idempotency checks depend on registry query formats** — Marketplace via
  `vsce show … --json`, Open VSX via its HTTP version API. If a format changes the
  skip-if-published guard could mis-fire; a re-run is always safe (publish is
  idempotent), but watch the logs on the first release.
- **OIDC publish requires `repository.url` in the published package.json.** Trusted
  publishing auto-generates a provenance statement, and npm rejects the publish with
  `422 … Error verifying sigstore provenance bundle` if `repository.url` doesn't match
  the GitHub repo. `packages/cli` and `packages/vscode` both set it — any new published
  package must too.
