---
type: idea
id: id_01KV98KZVJFEMZBCHMZEEH8ZGZ
title: Roadmap history carries the release version (actual_release)
status: done
created: 2026-06-16
updated: 2026-06-17
version: 2
tags: []
parent_id: null
requires_load: []
---
# Roadmap history carries the release version (actual_release)

## What

Make the derived roadmap's **History** answer "what shipped in `vX.Y.Z`?" — by recording
the **release version** on shipped work and surfacing it in `buildRoadmap` history,
`loom roadmap`, and `loom://roadmap`.

## Why it matters

Shipping `v1.9.2` exposed the gap: to write the changelog I needed "what shipped since
`v1.9.1`", and the roadmap couldn't answer it. Roadmap history keys shipped plans by their
done-doc **date** only — no version — so the only reliable source for "changes since the
last tag" was `git log <lastTag>..HEAD`. That's git archaeology for a fact Loom should own,
and it's the exact "state is derived, don't trust hand/external sources" promise leaking.

The frontmatter field **already exists** — designs carry `target_release` and a
(currently always-`null`) `actual_release`. It's declared but never populated and never
surfaced. This thread is about *wiring it through*, not inventing a new field.

## Sketch (for design to settle, not locked)

- **Populate `actual_release` at release time.** The natural writer is the `do-release`
  runbook (`.claude/commands/do-release.md`): when it tags `vX.Y.Z`, stamp `actual_release`
  on the designs/plans whose work shipped in that release. Open question: which docs get
  stamped (every plan done since the last tag? the design?), and whether it's automatic vs.
  a reviewed step.
- **Surface it in the read-model.** `buildRoadmap` history nodes gain a `release` field;
  `loom roadmap` History can group/label by version; `loom://roadmap` history nodes carry it.
- **New query:** "what shipped in `vX.Y.Z` / since `vX.Y.Z`" answerable from the roadmap
  read-model.

## Explicit non-goal

This does **not** replace `git log` for changelog *prose* — commit bodies carry the "why"
that the roadmap never will. This makes the roadmap answer *which version shipped what*
(scope + version selection), so `do-release` can cross-check git against Loom's own record
instead of git being the sole source.

## Success criteria

- A shipped plan/design records the version it shipped in (`actual_release` populated, not `null`).
- `loom roadmap` History and `loom://roadmap` expose the release version per shipped item.
- "What shipped in `vX.Y.Z`?" is answerable from Loom without reading git.
- Backfill path for already-shipped history (map past done-docs to their release by date/tag).

## Open questions for design

- Who writes `actual_release` and when — `do-release` step, a dedicated `loom_*` tool, or both?
- Stamp the plan, the design, or both? (History keys on done *plans*; `actual_release` lives on *designs* today.)
- Backfill: derive historical `actual_release` from tag dates vs. leave history pre-this-thread unversioned.
