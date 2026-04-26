# CHAT

## Rafa:

I created a custom SVG icon set for loom. They are in `packages/vscode/media/icons`. Some are animated.
I updated the code and most of them already showing up.

Icons design doc: `weaves/vscode-extension/vscode-icons/vscode-icons-design.md`

## TODO:
Add `thread` icon to `packages/vscode/src/icons.ts`. The icon already exists: `packages/vscode/media/icons/thread.svg`

## AI:

Done. Three changes:

**`packages/vscode/src/icons.ts`**
- Added `thread: 'thread'` to the `Icons` map (codicon fallback: `git-branch`).
- Added `getThreadIcon(status)` — mirrors `getWeaveIcon` shape but defaults to `icon(Icons.thread)` (the spool SVG) instead of the weave icon.

**`packages/vscode/src/tree/treeProvider.ts`**
- Import updated to include `getThreadIcon`.
- `createThreadNode` now calls `getThreadIcon(status)` instead of `getWeaveIcon(status)`.

The thread SVG (orange spool with wound thread lines) will now appear on all thread nodes in the tree. IMPLEMENTING/DONE/CANCELLED states still use the animated/coloured Codicon overrides.

## Rafa:

### chat doc
- Add also `chat`
- Custom icon already exists: `packages/vscode/media/icons/chat.svg`

### when finish
- create a done plan `weaves/vscode-extension/vscode-icons/done/vscode-icons-plan-002.md` for implemented `thread` & `chat` icons

## AI:

Done. `chat` icon added and wired.

**`packages/vscode/src/icons.ts`**
- `chat: 'chat'` added to `Icons` (codicon fallback: `comment-discussion`).
- `CodiconMap` entry added.

**`packages/vscode/src/tree/treeProvider.ts`**
- `createChatNode` now uses `icon(Icons.chat)` — resolves to `chat.svg` when the extension URI is set, falls back to Codicon otherwise.

**`weaves/vscode-extension/vscode-icons/done/vscode-icons-plan-002.md`** created — 4 steps, all ✅.

## Rafa:

- thread icon working
- chat docs show design icon

## AI:

Root cause: chat-type docs surfacing as loose fibers go through `createDocumentNode` → `getDocumentIcon('chat')` which was hitting `default` → design icon. `createChatNode` is correct but loose-fiber rendering bypasses it.

Fix: added `case 'chat': return icon(Icons.chat)` to `getDocumentIcon`. Now any code path that renders a chat-type doc — whether via `createChatNode` or `createDocumentNode` — will use `chat.svg`.

Plan updated to step 5.

## Rafa:

### Status
file: `packages/vscode/src/icons.ts`

#### Implementing 
- weave status implementing icon: `packages/vscode/media/icons/weave-implementing.svg`
- thread status implementing icon: `packages/vscode/media/icons/thread-implementing.svg`
- plan status implementing icon: `packages/vscode/media/icons/plan-implementing.svg`

#### Done status
- all docs icon: `packages/vscode/media/icons/status-done.svg`

### Toolbar icons
- File to touch `packages/vscode/package.json`
- Chat, Idea, Design, Plan
- Group, Filter, Archive

## AI:

**`packages/vscode/src/icons.ts`**

Added `svgIcon(filename, codiconFallback)` private helper — resolves a direct SVG path when `EXT_URI` is set, falls back to a named codicon otherwise.

Wired into all three status functions:
- `getWeaveIcon`: IMPLEMENTING → `weave-implementing.svg` · DONE → `status-done.svg`
- `getThreadIcon`: IMPLEMENTING → `thread-implementing.svg` · DONE → `status-done.svg`
- `getPlanIcon`: implementing → `plan-implementing.svg` · done → `status-done.svg`

**`packages/vscode/package.json`**

Swapped codicon strings for SVG path objects on 10 commands:

| Command | Was | Now |
|---------|-----|-----|
| weaveIdea / promoteToIdea | `$(lightbulb)` | `idea.svg` |
| weaveDesign / promoteToDesign / refineDesign | `$(symbol-structure)` | `design.svg` |
| weavePlan / promoteToPlan | `$(checklist)` | `plan.svg` |
| chatNew | `$(comment-discussion)` | `chat.svg` |
| setGrouping | `$(list-tree)` | `group.svg` |
| setTextFilter | `$(filter)` | `filter.svg` |
| toggleArchived / closePlan | `$(archive)` | `archive.svg` |

## Rafa:

- thread icon working
- chat docs show design icon

## Rafa: 

### Status
file: `packages/vscode/src/icons.ts`

#### Implementing 
- weave status implemening icon: `packages/vscode/media/icons/weave-implementing.svg`
- thread status implemening icon: `packages/vscode/media/icons/thread-implementing.svg`
- plan status implementing icon: `packages/vscode/media/icons/plan-implementing.svg`

#### Dome status
- all docs icon: `packages/vscode/media/icons/status-done.svg`

### Toolbar icons
- File to touch `packages/vscode/package.json`
- Chat, Idea, Design, Plan
packages/vscode/media/icons/chat.svg
packages/vscode/media/icons/idea.svg
packages/vscode/media/icons/design.svg
packages/vscode/media/icons/plan.svg
- Group, Filter, Archive
packages/vscode/media/icons/group.svg
packages/vscode/media/icons/filter.svg
packages/vscode/media/icons/archive.svg

NOTE: rename the icons if you consider better name

## AI:

Done. Summary of changes:

icons.ts — svgIcon() helper added; all three status functions (getWeaveIcon, getThreadIcon, getPlanIcon) now use the implementing/done custom SVGs with codicon fallbacks.

package.json — 10 toolbar commands updated from $(codicon) strings to { light, dark } SVG path objects.

Next: waiting for direction.