#!/bin/bash
# Run the full Loom test suite

set -e  # Stop on first error

cd "$(dirname "$0")/.."

TS_NODE="npx ts-node --project tests/tsconfig.json"

echo ""
echo "══════════════════════════════════════════"
echo "  Loom Test Suite"
echo "══════════════════════════════════════════"
echo ""

run_test() {
    local file="$1"
    echo "▶ $file"
    $TS_NODE "$file"
    echo ""
}

# Step 1: Entity tests (no IO)
run_test tests/entity.test.ts

# Dates seam: core/dates.ts — canonical today()/nowIso(), tolerant toEpoch ordering
# (mixed YYYY-MM-DD vs full-ISO compare correctly), -Infinity sentinel, idempotent toCanonical
run_test tests/dates.test.ts

# Derived roadmap: pure buildRoadmap read-model — status overlay, dependency blocked-on,
# topo+priority order, done-plan history, and cycle/dangling/missing-manifest diagnostics
run_test tests/roadmap.test.ts

# State summary: pure toStateSummary projection — the cheap session-start map (weave/thread
# skeleton + status, active plan + pending-step count, stale flag, carried counts; no body leak)
run_test tests/state-summary.test.ts

# Version utils: pure semver parse/compare/max (release ordering, current_release derivation)
run_test tests/version-utils.test.ts

# Roadmap release surfacing: history nodes carry plan.actual_release; currentRelease = max (derive-only)
run_test tests/roadmap-release.test.ts

# recordRelease/backfillReleases use-cases: live sweep-unstamped, backfill date-range assignment,
# idempotent already-stamped no-op, overwrite restamp (injected loadState + captured runEvent)
run_test tests/record-release.test.ts

# req doc-type: parseReq buckets by IN/EX/C prefix; locked req never blocks DONE
run_test tests/req.test.ts

# req coverage: pure structural check (uncovered / excluded-violation / unknown citation)
run_test tests/req-coverage.test.ts

# report artifacts (storage decision A): standalone loom/reports/ snapshots, rp_ id,
# minimal frontmatter + Provenance body, invisible to LoomState + link index (no phantom weave/thread)
run_test tests/reports.test.ts

# report scanner backing loom://reports (Group D): finds cross-weave + weave-scoped
# reports, tags weaveSlug, newest-first order, ignores non-report markdown
run_test tests/reports-resource.test.ts

# selectReportDocs (report Group C keystone): pure doc-selection over LoomState —
# type/weave/thread/date filtering, chronological order, coverage manifest
run_test tests/report-selection.test.ts

# buildForwardSignal (prospective next-work kind): the four Tier-1 detectors (parked-decision,
# stalled-intent, blocked-work steps+threads, drift-debt), deterministic leverage/ready/age
# ranking, filters/empty-set, renderForwardSignal slice, and applyProspectiveFraming knob logic
run_test tests/forward-signal.test.ts

# req handle integrity: diffReqHandles refuses renumber/delete, allows append + ~dropped
run_test tests/req-diff.test.ts

# Step 2: weaveRepository (done/ subfolder)
run_test tests/weave-repository.test.ts

# threadRepository: idea/design/req/plan/done load + save round-trip
run_test tests/thread-repository.test.ts

# Step 3: planReducer
run_test tests/plan-reducer.test.ts

# Step 4: CLI commands + completeStep use-case
run_test tests/commands.test.ts

# CLI twins of the human tree-management tools (archive/restore/delete/move-thread/
# set-priority/set-thread-deps/close-plan/quick-ship/promote)
run_test tests/cli-tree-management.test.ts

# Tri-surface parity guard: every loom_* tool has a CLI twin or a documented exception
run_test tests/cli-mcp-parity.test.ts

# CLI in-process MCP client helper: round-trips loom://catalog over in-memory transport
run_test tests/cli-mcp-client.test.ts

# Step 5: closePlan use-case (mock AI)
run_test tests/close-plan.test.ts

# Step 5b: quickShip use-case — one-call done-plan recorder
run_test tests/quick-ship.test.ts

# Step 6: doStep use-case (mock AI)
run_test tests/do-step.test.ts

# loom_append_done MCP tool: single-step + batch (whole-done in one call) authoring,
# step-ordered upsert, idempotent replace + version bump, atomic fail-loud on unknown step
run_test tests/append-done.test.ts

# Context pipeline: pure assembler + serialiser (no IO)
run_test tests/context-assembler.test.ts

# scope:'doc' — the read/reply slang path: doc-only bundle (no ctx/parent/requires_load),
# header still carries weaveSlug/threadUlid, and the alreadyLoaded ledger still dedupes
run_test tests/context-scope-doc.test.ts

# Context Dispatcher (model C): pure assembleContext dedupe (empty ledger → full bundle,
# full ledger → 0 delta, version bump → re-injected, manifest = assumed-present) + a
# loom_do_step / loom://context round-trip threading the alreadyLoaded ledger param
run_test tests/context-dispatcher.test.ts

# req use-cases: create/refine/finalize lifecycle (real fs, injected loom root)
run_test tests/req-usecases.test.ts

# Context prefs: .loom/context-prefs.json repository (real fs) — Phase 3 sidebar overrides
run_test tests/context-prefs.test.ts

# Plan table utils: steps-table rewrite must not truncate trailing sections
run_test tests/plan-table-utils.test.ts

# Plan frontmatter steps: structured steps persist to/from frontmatter (source of truth);
# body table is a generated view; legacy plans fall back to body-parse and are not auto-migrated
run_test tests/plan-frontmatter-steps.test.ts

# Migrate plan steps: legacy body-table plans → frontmatter-native; idempotent; never empties unparseable
run_test tests/migrate-plan-steps.test.ts

# Migrate layout: legacy filenames → canonical flat scheme; rename-only, dry-run, idempotent, collision-safe
run_test tests/migrate-layout.test.ts

# Entities CRUD: docNaming (writers/ordinals/recognisers), rename/move weave·thread·doc, loose-fiber guard, reference file rename
run_test tests/entities-crud.test.ts

# API contract refactor: a doc-create references its thread by th_ ULID, lands in that
# exact thread, and NEVER fabricates one from an unresolvable reference (the originating
# duplicate-thread bug); resolveThreadUlid ⇄ resolveThreadFolder round-trip.
run_test tests/api-contract-refactor.test.ts

# MCP read-surface naming: no *Id resource-template placeholder / prompt-arg name;
# the slug thread form resolves and the bundle manifest carries weave_slug + thread_ulid
run_test tests/mcp-read-surface-naming.test.ts

# Surface catalog: loom://catalog covers tools + resources (concrete/templated) + prompts;
# ?kind= filters to one section; coerceCatalogKind rejects an invalid kind with the valid set
run_test tests/catalog-surface.test.ts

# archive-robust-move: moveTreeOrThrow is atomic-or-fail-loud — a copy-fallback that leaves
# the source (move resolves OR throws) rolls back the copy and throws (no silent duplicate);
# a pre-existing dest is never clobbered. Shared by archive / restore / thread-move.
run_test tests/archive-robust-move.test.ts

# refinePlan req-aware: a refine never strips Satisfies citations or flips done; 6-col replies emit new ids
run_test tests/refine-plan.test.ts

# design_version baseline: create/promote stamp the LIVE design version (not constant 1 / not
# undefined), refine re-baselines to clear staleness, and backfill repairs on-disk plans (dry-run safe)
run_test tests/design-version-baseline.test.ts

# stale parity: one canonical staleEntries predicate drives every surface — the four directional
# reasons fire, ideas are never stale, actionable excludes done docs, extension set == `loom stale` set
run_test tests/stale-parity.test.ts

# set-status decision: decideSetStatus is the pure guard — free labels allowed, plan->done/
# implementing + req->locked delegate to their owning tool, invalid status/type rejected
run_test tests/set-status.test.ts

# version-on-content: loom_update_doc bumps version/updated ONLY on a content edit; it now
# rejects a status-only call (status moved to loom_set_status, which also does not bump) —
# so marking a parent done never cascades staleness
run_test tests/version-on-content.test.ts

# staleness baselines: a design stamps idea_version from the live idea; a req parents to the
# design and stamps design_version (the design-first dependency direction)
run_test tests/staleness-baselines.test.ts

# Event save scope: a single event persists only the doc it changed (no blast radius)
run_test tests/event-save-scope.test.ts

# Step 7: buildCtxSource — pure ctx source assembler + helpers (no IO)
run_test tests/build-ctx-source.test.ts

# ctx pillar template (ctx-surface-parity): buildCtxSkeleton emits H1 + CLAUDE.md-split
# note + all default pillars; ctxTemplateHeadings preserves an existing doc's headings, else defaults
run_test tests/ctx-template.test.ts

# CLAUDE.md two-surface sync: the root CLAUDE.md and the LOOM_CLAUDE_MD install template
# must carry the same <!-- rule:id --> set + shared verbatim invariants (no silent drift)
run_test tests/claude-md-sync.test.ts

# Layer-imports guard: one table-driven check for EVERY package dependency edge —
# the executable mirror of architecture-reference.md §1. Resolves relative + package
# specifiers, enforces cli/vscode → mcp → app → core + fs + telemetry, node-fs bans
# on core/vscode (justified whitelist), and package coverage. Subsumes the former
# core-no-fs-imports + vscode-no-fs-imports guards; caught the ConfigRegistry IO drift class.
run_test tests/layer-imports.test.ts

# New MCP tools: patch_doc body-prose guard + Steps-table refusal, update_step/reorder_steps
# done-immutability + leading-block, read_chat_tail tail-after-last-AI with configured ai.model
run_test tests/mcp-new-tools.test.ts

# Step-CRUD: ADD_STEP/REMOVE_STEP reducers (positions, order, slug, strip+report, guards),
# the rekeyDetailSections Option-A invariant (backfill/reorder-reflow/add-stub/remove-prune),
# and a real-fs save round-trip proving the saver tracks detail sections by id
run_test tests/step-crud.test.ts

# resolveBlockedByIds: the single write-time normalizer (create + add/update-step) —
# numeric/"Step N" blockedBy → stable step-id slug; out-of-range throws; slugs + plan-ids
# pass through; dedupe; self-block throws
run_test tests/resolve-blockedby-ids.test.ts

# blockedBy normalization wired end-to-end: weavePlan create + ADD_STEP/UPDATE_STEP reducers
# persist ordinal blockedBy as slug ids (out-of-range throws; slug/plan-id passthrough; reorder-safe)
run_test tests/blockedby-normalization.test.ts

# cross-plan-blocker-validation: warn-and-store — an unresolved pl_ blocker is stored AND
# warned via the planExists predicate; validateStepBlockers flags dangling pl_/legacy refs
# (a valid pl_ no longer mis-flagged as unknown format); isStepBlocked's missing⇒blocked is
# a demoted, form-unified back-compat fallback
run_test tests/cross-plan-blocker-validation.test.ts

# Step 8: workspace workflow — real filesystem at j:/temp/loom (Phase 6, thread + multi-thread)
run_test tests/workspace-workflow.test.ts

# resolution-dx: link-index path exposure + suggest-on-miss resolver (real fs)
run_test tests/resolution-dx.test.ts

# create-with-body: one-call body on create_* + sampling-free promote (real fs)
run_test tests/create-with-body.test.ts

# install-workspace: loom install establishes user-owned CLAUDE-LOCAL.md (created once,
# never clobbered even on --force) + ensures root CLAUDE.md imports both contracts idempotently;
# idempotent .loom/CLAUDE.md write, in-shape npx pin-heal, and flag-gated command:"loom"→npx migration
run_test tests/install-workspace.test.ts

# resolve-loom-root: the shared server root resolver — explicit env wins, an unexpanded
# ${…} placeholder is ignored, a subdirectory launch walks up to the nearest .loom/, and
# no workspace degrades to cwd-fallback; plus the boot-notice text for each case
run_test tests/resolve-loom-root.test.ts

# agent-mcp-config: the launched-agent --mcp-config builder — loom-only form, and merging
# the user's other .mcp.json servers with the bundled loom winning the loom key
run_test tests/agent-mcp-config.test.ts

# create-plan-hardening: weavePlan rejects malformed agent calls — wire-marker body
# leaks in goal/title, stringified/unparseable/non-array steps, missing descriptions —
# never persists a corrupt plan + returns success (real fs)
run_test tests/create-plan-hardening.test.ts

# user-feedback: pure buildFeedbackUrl encoding, the fixed FEEDBACK_REPO sink
# (reslava/loom, no override of any kind), and getFeedbackContext's counts-only
# snapshot shape (non-PII key allowlist, currentRelease via buildRoadmap)
run_test tests/user-feedback.test.ts

# telemetry: opt-in consent gate (createTelemetry→Noop unless enabled+key), consentFromEnv
# opt-in semantics, content-free common props + taxonomy (scalar-only, exact event names),
# install-id minted only on opt-in, and the MCP dispatch tool→event map (error class never leaks the message)
run_test tests/telemetry.test.ts

# Legacy integration tests
run_test tests/id-management.test.ts
run_test tests/multi-loom.test.ts
# tests/weave-workflow.test.ts — pending Phase 6 rewrite (tests old flat-layout CLI workflow)

# MCP integration tests (spawns loom mcp subprocess)
run_test packages/mcp/tests/integration.test.ts

echo "══════════════════════════════════════════"
echo "  ✅ All tests passed"
echo "══════════════════════════════════════════"
echo ""
