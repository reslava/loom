---
type: idea
id: canonical-frontmatter-serializer-idea
title: "Canonical Frontmatter Serializer"
status: done
created: 2026-04-15
version: 1
tags: []
parent_id: null
child_ids: []                
requires_load: []
---

# 🔥 Canonical Frontmatter Serializer 

Simple, deterministic, and **does exactly what we want**.

## Problem

👉 **YAML libraries won’t reliably give you canonical formatting**
Not js-yaml, not gray-matter.

They optimize for *valid YAML*, not *stable formatting*.

So if we want:

* inline arrays
* stable key order
* predictable diffs

- we need to do serialization ourself.

---

## ✅ Drop-in serializer

```ts
function serializeValue(value: any): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[${value.map(v => serializeValue(v)).join(', ')}]`;
  }

  if (typeof value === 'string') {
    // quote only if needed
    if (value.includes(':') || value.includes('#') || value.includes('\n')) {
      return `"${value}"`;
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return 'null';
  }

  // fallback (objects)
  return JSON.stringify(value);
}
```

---

## ✅ Canonical frontmatter builder

```ts
export function serializeFrontmatter(obj: Record<string, any>): string {
  const orderedKeys = [
    'type',
    'id',
    'title',
    'status',
    'created',
    'version',
    'tags',
    'parent_id',
    'child_ids',
    'requires_load',
    'design_id',
    'target_version',
  ];

  const keys = [
    ...orderedKeys.filter(k => k in obj),
    ...Object.keys(obj).filter(k => !orderedKeys.includes(k)).sort(),
  ];

  const lines = keys.map(key => {
    const value = serializeValue(obj[key]);
    return `${key}: ${value}`;
  });

  return `---\n${lines.join('\n')}\n---`;
}
```

---

## ✅ Use it in `saveDoc`

Replace EVERYTHING YAML-related with:

```ts
const frontmatterStr = serializeFrontmatter(frontmatter);
const output = `${frontmatterStr}\n${bodyContent}`;
```

---

# 🎯 Output (guaranteed)

```yaml
---
type: plan
id: plan-001
title: My Plan
status: active
created: 2026-04-15
version: 1
tags: [ctx, summary]
child_ids: []
requires_load: []
---
```

✔ arrays always inline
✔ no surprises
✔ stable ordering
✔ perfect diffs

---

# 🧠 Why this is the right move 

We are building:

* structured docs (plan/design/ctx)
* version-controlled
* human-readable
* diff-sensitive

👉 This is **not YAML’s strength**

So instead of fighting YAML:

👉 we treat it as a *target format*, not a *source of truth*

---

# ⚠️ Limitations (transparent)

This serializer:

* ✅ handles primitives + arrays 
* ⚠️ does NOT support deep nested objects 

- but no problem 

Because:

- frontmatter should stay **flat + simple**