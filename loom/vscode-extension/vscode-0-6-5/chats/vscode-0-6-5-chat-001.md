---
type: chat
id: ch_01KSCSR06669YTC3SM0GR054YH
title: vscode-0-6-5 Chat
status: active
created: 2026-05-24
version: 1
tags: []
parent_id: null
requires_load: []
---
# vscode-0-6-5 Chat

## Rafa:

update packages/vscode/README.md and main README.md if needed
update any doc you consider
bump all & vsix 0.6.5
github release 0.6.5
commit push


## AI:

0.6.5 release. Changes since 0.6.1:

- Tree auto-reveals newly created weaves/threads/docs
- Frontmatter title = single source of truth (body H1 synced)
- Cross-shell prompt via tmpfile (fixes special chars/newlines/quotes), always-fresh terminal
- Removed `--dangerously-skip-permissions` from claude invocations
- promoteToPlan: fix `threadId` arg name, steps in `loom_create_plan` args
- Fix: rename scan scope, ctx prompt H1, close-plan test status

Plan:
1. Add CHANGELOG entries (0.6.0, 0.6.1, 0.6.5)
2. Bump all package versions → 0.6.5
3. Build vsix
4. Commit + push
5. GitHub release v0.6.5