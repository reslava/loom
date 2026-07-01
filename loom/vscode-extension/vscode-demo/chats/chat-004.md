---
type: chat
id: ch_01KT9RPPWX3QZJNXVH0XMXERES
title: vscode-demo Chat
status: active
created: 2026-06-04
version: 1
tags: []
parent_id: null
requires_load: []
---
# vscode-demo Chat

## Rafa:

gif is in `packages/vscode/media/loom-demo-workflow.gif`
replace main readme, vscode readme placeholders
commit, push all

## AI:

Done. Wired the demo gif into both READMEs (replacing the *(coming soon)* placeholders):

- **`README.md`** (repo root) — two spots: the "See the loop in motion" callout in the workflow section, and the "Workflow demo" callout under the VS Code Extension section. Both now embed `![Loom workflow demo](packages/vscode/media/loom-demo-workflow.gif)`.
- **`packages/vscode/README.md`** (marketplace listing) — the top "Workflow demo" callout now embeds `![Loom workflow demo](media/loom-demo-workflow.gif)` (path relative to the package, so it renders on the VS Code Marketplace).

Committing the gif + both README edits and pushing to `main` next.

## Rafa:

Having same GIF twice and close each other in main README is absurd.
Keep just the one of `VS Code Extension` sections, delete the other

## AI:

Agreed — two gifs a few lines apart was silly. Fixed:

- Deleted the first gif (and its "See the loop in motion" callout) from the `requires_load` / context section.
- Kept the single gif in the **VS Code Extension** section, and moved the better "See the loop in motion" wording onto it (it was previously the weaker "same loop, rendered inline on the marketplace listing").

So the main README now has the demo gif exactly once. `packages/vscode/README.md` is untouched (still its own single copy for the marketplace).

Committing and pushing next.