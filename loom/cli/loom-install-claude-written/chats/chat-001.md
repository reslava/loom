---
type: chat
id: ch_01KWWG4PNX4JPDTPE5KSZFNE1G
title: loom-install-claude-written Chat 001
status: active
created: 2026-07-06
version: 1
tags: []
parent_id: null
requires_load: []
---
# loom-install-claude-written Chat 001

## Rafa:

CLI command loom install always writes `.loom/CLAUDE.md` file, even if it is byte identical to the previous one

```
$ loom install
🧵 Loom installed successfully.

   Workspace: J:\src\chord-flow
   .loom/        already exists
   .loom/CLAUDE.md  written
...
```

Check if no difference and do not write it again in that case
