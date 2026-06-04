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