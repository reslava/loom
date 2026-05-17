---
type: done
id: pl_01KRTB3J2BY6EEGKH330HY9V5P-done
title: Done — vsix body-builder fixes
status: done
created: "2026-05-17T00:00:00.000Z"
version: 3
tags: []
parent_id: pl_01KRTB3J2BY6EEGKH330HY9V5P
requires_load: []
---
# Done — vsix body-builder fixes

## Step 1 — Remove `# ${title}` from ideaBody.ts, designBody.ts, planBody.ts, ctxBody.ts — start each body with `\n` instead so saveDoc produces a blank line after `---`

Removed `# ${title}` / `# Plan — ${title}` / `# Design Context Summary` headings from all four body generators. Each template now starts with `\n` so `saveDoc` produces one blank line between the closing `---` and the first body line.

Files edited:
- `packages/core/src/bodyGenerators/ideaBody.ts` — removed `# ${title}\n\n` opening
- `packages/core/src/bodyGenerators/designBody.ts` — removed `# ${title}\n\n` opening
- `packages/core/src/bodyGenerators/planBody.ts` — removed `# Plan — ${title}\n\n` opening
- `packages/core/src/bodyGenerators/ctxBody.ts` — removed `# Design Context Summary\n\n` opening

Note: `title` parameter is now unused in `ideaBody.ts` and `planBody.ts`; `designBody.ts` `title` param also unused. Signatures left unchanged to avoid breaking callers — can be cleaned up in a follow-up.

## Step 2 — Remove `# Done — ${planDoc.title}` preamble from appendDone.ts — pass empty preamble and prepend `\n` to new-doc content

Removed `# Done — ${planDoc.title}` preamble from appendDone.ts new-doc creation path.

File edited:
- `packages/mcp/src/tools/appendDone.ts` line 88: changed `rebuildContent([\`# Done — ${planDoc.title}\`], [newSection])` to `'\n' + rebuildContent([], [newSection])`

Empty preamble removes the title heading; `'\n' +` prepends a blank line so `saveDoc` produces one blank line between the frontmatter `---` close and the first section header.

## Step 3 — Build all packages with `./scripts/build-all.sh` and verify new docs (idea, design, plan, ctx, done) have no title heading and have one blank line after frontmatter

Built all packages with `./scripts/build-all.sh` — clean build, zero errors.

Verification (node against compiled dist):
- `ideaBody`: no title heading, blank first line ✅
- `designBody`: no title heading, blank first line ✅ (# CHAT structural heading retained intentionally)
- `planBody`: no title heading, blank first line ✅ (# Goal / # Steps structural headings retained intentionally)
- `ctxBody`: no title heading, blank first line ✅
- `appendDone.js`: string `"# Done —"` absent from compiled output ✅

All five doc types produce bodies with no title-duplicate heading and exactly one blank line between the frontmatter `---` close and the first body line.
