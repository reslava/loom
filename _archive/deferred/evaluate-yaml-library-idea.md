---
type: idea
id: evaluate-yaml-library
title: "Evaluate 'yaml' (eemeli/yaml) as Future YAML Processor"
status: postponed
created: 2026-04-15
version: 1
tags: [yaml, dependencies, future, evaluation]
parent_id: null
child_ids: []
requires_load: []
---

# Evaluate 'yaml' (eemeli/yaml) as Future YAML Processor

## Problem
Currently, Loom uses `gray-matter` for frontmatter parsing and `js-yaml` for stringification. While sufficient for MVP, `js-yaml` has limited TypeScript support and less control over advanced formatting. As Loom evolves, we may need more robust YAML handling for `.loom/workflow.yml` validation, user configuration, and AI‑generated content.

## Idea
Evaluate replacing the current YAML stack with the modern **`yaml`** library (https://eemeli.org/yaml/). This library offers:
- Excellent TypeScript integration with precise types.
- Full control over formatting (e.g., `lineWidth`, `singleQuote`, custom node styles).
- Better error messages for debugging invalid YAML.
- Active maintenance and performance optimizations.

## Why Defer
- The current solution (`js-yaml`) meets all MVP requirements.
- Adding a new dependency requires careful consideration of bundle size and maintenance overhead.
- The migration effort is low but not urgent.

## Open Questions
- Does `yaml` support the exact `flowLevel` behavior we need for inline arrays?
- How does it handle comments in YAML (if we ever need to preserve them)?
- What is the bundle size impact on the VS Code extension?

## Next Step
Re‑evaluate when:
- We implement `.loom/workflow.yml` validation.
- Users request more advanced YAML formatting options.
- We encounter a limitation with `js-yaml` that `yaml` solves.

**Status: Deferred for post‑MVP consideration.**