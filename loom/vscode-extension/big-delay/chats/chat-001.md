---
type: chat
id: ch_01KXN9A85EC6W3SSEKR0CZKTEX
title: big-delay Chat 001
status: active
created: 2026-07-16
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 1
---
# big-delay Chat 001

## Rafa:

I am observing that sometimes, some actions like thread, doc retitle, or set-status done are launched there is a very big delay.

I wonder if we could easyly find a root cause for this.
If it is hard to find, we will leave as is

## AI:

Good news: this one is **easy to triage, cheaply** — the instrumentation already exists. The `vscode-mcp-timeout-diagnostics` thread left every MCP request logged in the **Output → "Loom MCP"** channel with per-call timing:

```
[client] callTool start id=42 loom_set_status inFlight=1
[client] callTool ok    id=42 loom_set_status durationMs=180
[client] readResource ok id=43 loom://state durationMs=2400
```

So the ask is: next time you feel the big delay, open that channel and look at the last ~10 lines. The pattern pins the culprit with no new code:

- **`callTool` durationMs is big** → server-side write path is slow (`runEvent` load→reduce→save).
- **`callTool` fast, but `loom://state` durationMs is big** → the delay is the tree refresh, not the action.
- **Big gap between your click and the `start` line, or `inFlight > 1`** → the call queued behind another in-flight request on the single stdio pipe.
- **All durations small but the UI still lags** → VS Code side (tree render / watcher storm), not MCP.

Reading the code, I already see the structural suspect — every retitle / set-status click costs **one tool call + two full `loom://state` reads**:

1. The command awaits the tool, then calls `treeProvider.refresh()` → reads the **full `loom://state`** (~2 MB here; the server re-scans and re-parses every doc under `loom/` — this repo has 152 plans) plus `loom://reports`, plus `loom://roadmap` in roadmap view.
2. ~800 ms later the `**/loom/**/*.md` watcher sees the file the tool just saved and fires the debounced `syncAndRefresh` → a **second** full state read of the same state.

Each full-state read is a whole-workspace scan on the server. On Windows, intermittent multi-second file IO (Defender scanning hundreds of `.md` opens is a classic "sometimes slow" source) would make exactly these actions feel randomly heavy.

**Suggested path:** don't fix anything yet. Reproduce once, paste the Loom MCP output tail here, and we'll know in one look whether it's (a) the double full-state read — fixable by making `refresh()` skip when the watcher refresh is already pending, or by a summary-shaped tree read, (b) server scan cost — fixable with caching, or (c) something environmental we'd leave as is, exactly as you said.