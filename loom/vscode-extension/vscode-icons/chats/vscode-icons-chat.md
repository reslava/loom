---
type: chat
id: vscode-icons-chat
title: "Vscode Icons Chat"
status: active
created: 2026-04-20
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
# CHAT

## Rafa:
I think vscode icons should be unified and not harcoded
I’ve already spotted a few inconsistencies, and as the icons multiply or we want to customise them, it’s going to be a real headache

So I created this design...

## VSCode Icons design - icons.ts 

```ts
export const Icons = {
  loom: 'loom',
  plan: 'plan',
  design: 'design',
  idea: 'idea',
  ctx: 'ctx',

  actionDelete: 'actionDelete',
  actionArchive: 'actionArchive',
  actionCancel: 'actionCancel',
  actionGenerate: 'actionGenerate',
} as const;
```

---

## Then map them internally

```ts
const CodiconMap: Record<string, string> = {
  loom: 'graph',
  plan: 'checklist',
  design: 'symbol-structure',
  idea: 'lightbulb',
  ctx: 'note',

  actionDelete: 'trash',
  actionArchive: 'archive',
  actionCancel: 'close',
  actionGenerate: 'sparkle',
};
```

## Factory

Make extensionUri optional globally:

```ts
let EXT_URI: vscode.Uri | undefined;

export function setIconBaseUri(uri: vscode.Uri) {
  EXT_URI = uri;
}
```

Then:

```ts
export function icon(id: keyof typeof Icons) {
  if (EXT_URI) {    
    const uri = vscode.Uri.joinPath(EXT_URI, 'assets', 'icons', `${id}.svg`)
    return { light: uri, dark: uri };
  }

  return new vscode.ThemeIcon(CodiconMap[id]);
}
```

usage:

```ts
icon(Icons.plan) // always
```

## Exports

with these four exports is the entire API:

```typescript
export const Icons = { ... } as const;
export function setIconBaseUri(uri: vscode.Uri): void { ... }
export function icon(id: keyof typeof Icons): vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri } { ... }
// CodiconMap stays unexported — internal detail
```

## Final structure 
**Directory structure is good.** `media/` is the VS Code convention (it's what the generator scaffolds by default, and `vsce package` includes it automatically). One addition worth considering:

```
media/
  icons/
    loom.svg
    plan.svg
    design.svg
    idea.svg
    ctx.svg
    actionDelete.svg
    actionArchive.svg
    actionCancel.svg
    actionGenerate.svg
  loom-icon.png        ← extension marketplace icon (128x128, required)
```

Initialization in `extension.ts`:

```typescript
import { setIconBaseUri } from './icons';

export function activate(context: vscode.ExtensionContext) {
    setIconBaseUri(context.extensionUri);
    // ... rest of activation
}
```

Using icons in `treeProvider.ts`:

```typescript
import { icon, Icons } from '../icons';

private createThreadNode(thread: Thread): TreeNode {
    const node = new vscode.TreeItem(thread.id, vscode.TreeItemCollapsibleState.Collapsed);
    node.iconPath = icon(Icons.loom);
    // ...
}

private createDocumentNode(doc: Document, contextValue: string): TreeNode {
    const node = new vscode.TreeItem(doc.title || doc.id, vscode.TreeItemCollapsibleState.None);
    node.iconPath = this.getDocumentIcon(doc.type);
    // ...
}

private getDocumentIcon(type: string): ReturnType<typeof icon> {
    switch (type) {
        case 'design': return icon(Icons.design);
        case 'idea':   return icon(Icons.idea);
        case 'ctx':    return icon(Icons.ctx);
        default:       return icon(Icons.design);
    }
}

private createPlanNode(plan: PlanDoc): TreeNode {
    const node = new vscode.TreeItem(plan.title || plan.id, vscode.TreeItemCollapsibleState.None);
    node.iconPath = icon(Icons.plan);
    // ...
}
```

Context menu items (in `package.json` they reference command IDs, but the inline buttons use icon IDs):

```typescript
private createDocumentNode(doc: Document, contextValue: string): TreeNode {
    // ...
    node.contextValue = contextValue;  // drives which context menu appears

    // Inline action buttons — these use Icons too via command contributions
    // package.json: "icon": { "id": "trash" }  ← swap to custom once ready
}
```

The `ReturnType<typeof icon>` on `getDocumentIcon` is worth keeping — it means if the return type of `icon()` ever changes (e.g. we add a third variant), the compiler will catch every usage site automatically.

Let me know what you think