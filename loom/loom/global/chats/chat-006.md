---
type: chat
id: ch_01KVN1GAW82M9ARQ1QC0NR1SG1
title: Screenshots
status: done
created: 2026-06-21
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 3
---
# Screenshots

## Rafa:

I added some screenshots to be included in the documentation:
they are in `packages/vscode/media/screenshots`
chord-flow-caged-chords-implementing.png
chord-flow-roadmap.png
loom-rdd.png
loom-roadmap.png

they are screeshots of VSCode extension side bar weaves/threads view and roadmap view of this project itself
and the Chord Flow project developed using loom

I think the images should resized a little to be smaller, clickables to see them full size

include all of them in VSCode readme, main readme and a description with briefly explanations of advantages of having:
- weaves/threads graph view of loom chats, ideas, design, context, reqs, reference visually organized with the derive state and all infor available
- roadmap with blocked by info, priorities. History grouped by version, date, thread

What you think?
If you agree with the idea, do it


## AI:

Agreed — done. These two views are exactly the parts that are hard to sell in prose: the document graph and the derived roadmap. Showing them in both Loom (self-hosted) and ChordFlow (a real external app) is the strongest "it works beyond the demo" signal we have, so I wired all four in.

**What I changed**

- **Main `README.md`**
  - *VS Code Extension* section — added the two Loom shots side-by-side (`loom-rdd` = Threads + Context, `loom-roadmap` = Roadmap) right under the roadmap paragraph, with captions calling out derived state (`🔒 locked · ✅ covered`, `3/3 · done`, ⚠ stale) and the CONTEXT panel showing the exact docs + token cost before launch.
  - *Used by* section — added the two ChordFlow shots under the ChordFlow bullet, captioned to stress it's an unrelated app driven by the same graph (incl. the `1 stale · 3 plan steps blocked · 11 req coverage gaps` diagnostics banner).
- **`packages/vscode/README.md`** (marketplace)
  - *The LOOM panel* section — same two Loom shots after the roadmap paragraph.
  - New *A real project in Loom* section before *AI setup* — the two ChordFlow shots.

**Layout decisions**

- **Clickable to full size:** each image is wrapped `<a href="…"><img …></a>` pointing at the same file, so a click opens it full-res on GitHub / the marketplace.
- **Resized:** laid out in a 2-column `<table>` with `width="100%"` per cell, so each renders at ~half page width but stays responsive instead of a hardcoded pixel size. A `Click either image to view full size.` sub-line under each pair.
- **Paths:** main README uses repo-relative paths (`packages/vscode/media/screenshots/…`); the vscode README uses absolute `raw.githubusercontent.com/reslava/loom/main/…` URLs, because relative paths don't resolve on the marketplace page.

Two things worth a look before I commit:

1. **Captions** — I wrote them from what's visible in the shots; check they match how you'd describe the features (esp. the req/coverage wording).
2. **Image weight** — the four PNGs are ~70–135 KB each (430 KB total). Fine for a repo, fine for GitHub. The marketplace pulls them over raw URLs at page-load, so no bundle-size impact on the `.vsix`.

Want me to commit this? Suggested split, per your roadmap-commit convention this is all docs: a single `docs: add extension screenshots to READMEs`. Say `commit` and I'll do it (the screenshot dir is currently untracked, so it goes in the same commit).

## Rafa:

commit

do-release 1.10.1

to ship:
- fix(vscode): order unversioned bucket first in roadmap history
- screenshots

## AI:

🚀 **v1.10.1 shipped.** Committed the screenshots (`a9315f6`) + dogfood chat (`1bb8d86`), then ran `/do-release 1.10.1`.

- npm `@reslava/loom`, VS Code Marketplace, Open VSX — all published.
- GitHub release: https://github.com/reslava/loom/releases/tag/v1.10.1
- Pipeline `guard → build-test → publish(npm·vsce·ovsx) → release` all green; full local suite passed before tagging.

What shipped: the roadmap-history unversioned-bucket-first fix + the README screenshots (recorded as Changed + Documentation in both changelogs).

On your note — right, no Loom plan backed the fix, so `loom record-release 1.10.1` had nothing to stamp and no-op'd (81 plans already carried releases). Expected, harmless. The marketplace listing now renders the four screenshots over the raw.githubusercontent URLs.