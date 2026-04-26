---
type: plan
id: core-engine-plan-003
title: "CLI Interface — The `loom` Command"
status: done
created: 2026-04-10
updated: 2026-04-14
version: 2
design_version: 3
tags: [loom, cli, ux, commands]
parent_id: core-engine-design
target_version: "0.3.0"
requires_load: [core-engine-design, multi-workspace-mvp-design]
---

# Plan — CLI Interface (The `loom` Command)

| | |
|---|---|
| **Created** | 2026-04-10 |
| **Updated** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `core-engine-design.md` (v3) |
| **Target version** | 0.3.0 |

---

# Goal

Provide a command‑line interface (`loom`) to interact with the REslava Loom workflow system. This enables developers to view thread status, trigger workflow events, and manage their looms before the VS Code extension is complete.

This plan builds directly on the multi‑loom foundation established in `multi-workspace-plan-001`.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Setup CLI project structure with `commander` | `packages/cli/` | `multi-workspace-plan-001` |
| ✅ | 2 | Implement `loom status` command | `packages/cli/src/commands/status.ts` |
| ✅ | 3 | Implement `loom validate` command | `packages/cli/src/commands/validate.ts` |
| ✅ | 4 | Implement `loom refine-design` command | `packages/cli/src/commands/refine.ts` |
| ✅ | 5 | Implement `loom start-plan` command | `packages/cli/src/commands/startPlan.ts` |
| ✅ | 6 | Implement `loom complete-step` command | `packages/cli/src/commands/completeStep.ts` |
| ✅ | 7 | Implement `loom summarise-context` command | `packages/cli/src/commands/summarise.ts` |
| ✅ | 8 | Wire all commands into the main CLI entry point | `packages/cli/src/index.ts` |
| ✅ | 9 | Test CLI with real looms | `looms/test/` |

---

## Step 1 — Setup CLI Project Structure with `commander`

**File:** `packages/cli/package.json`

```json
{
  "name": "@reslava-loom/cli",
  "version": "0.3.0",
  "main": "dist/index.js",
  "bin": {
    "loom": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0"
  }
}
```

**File:** `packages/cli/src/index.ts`

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { statusCommand } from './commands/status';
import { validateCommand } from './commands/validate';
import { refineCommand } from './commands/refine';
import { startPlanCommand } from './commands/startPlan';
import { completeStepCommand } from './commands/completeStep';
import { summariseCommand } from './commands/summarise';

const program = new Command();

program
  .name('loom')
  .description('REslava Loom — Weave ideas into features with AI')
  .version('0.3.0');

program
  .command('status [thread-id]')
  .description('Show derived state of threads')
  .option('--verbose', 'Show detailed status')
  .option('--json', 'Output as JSON')
  .option('--tokens', 'Show token usage')
  .action(statusCommand);

program
  .command('validate [thread-id]')
  .description('Validate document integrity')
  .option('--all', 'Validate all threads')
  .option('--fix', 'Attempt to fix issues')
  .action(validateCommand);

program
  .command('refine-design <thread-id>')
  .description('Fire REFINE_DESIGN event')
  .action(refineCommand);

program
  .command('start-plan <plan-id>')
  .description('Fire START_PLAN event')
  .action(startPlanCommand);

program
  .command('complete-step <plan-id>')
  .description('Mark a plan step as done')
  .option('--step <n>', 'Step number to complete')
  .action(completeStepCommand);

program
  .command('summarise-context <thread-id>')
  .description('Generate or regenerate -ctx.md summary')
  .option('--force', 'Overwrite existing summary')
  .action(summariseCommand);

program.parse(process.argv);
```

---

## Step 2 — Implement `loom status` Command (Enhanced with Dependency Visibility)

**File:** `packages/cli/src/commands/status.ts`

The `loom status` command displays derived state for a thread or all threads. It now actively parses plan steps and evaluates the "Blocked by" column to surface dependencies and suggest the next actionable step.

### 2.1 Core Types for Step Parsing

```typescript
interface StepStatus {
  order: number;
  description: string;
  done: boolean;
  blockedBy: string[];
  isBlocked: boolean;
}

interface PlanStepDisplay extends StepStatus {
  symbol: string;      // ✅, 🔄, 🔳, 🔒
  blockerDetails: string;
}
```

### 2.2 Parsing the Steps Table from Markdown

```typescript
function parseStepsFromPlan(plan: PlanDoc): StepStatus[] {
  const content = plan.content;
  const steps: StepStatus[] = [];
  
  // Find the steps table: between "# Steps" and the next "---" or "##"
  const stepsMatch = content.match(/# Steps\n\n([\s\S]*?)(?=\n---|\n##|$)/);
  if (!stepsMatch) return steps;
  
  const table = stepsMatch[1];
  const lines = table.split('\n').filter(l => l.includes('|') && !l.includes('|---') && !l.includes('Done | #'));
  
  for (const line of lines) {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 5) continue;
    
    // Columns: Done, #, Step, Files touched, Blocked by
    const doneSymbol = cols[0];
    const order = parseInt(cols[1]);
    const description = cols[2];
    const blockedByRaw = cols[4] || '—';
    
    const done = doneSymbol === '✅';
    const blockedBy = blockedByRaw === '—' ? [] : blockedByRaw.split(',').map(s => s.trim());
    
    steps.push({ order, description, done, blockedBy, isBlocked: false });
  }
  
  return steps;
}
```

### 2.3 Evaluating Blocked Status

```typescript
function evaluateBlocked(
  step: StepStatus,
  allSteps: StepStatus[],
  allPlans: PlanDoc[]
): boolean {
  if (step.blockedBy.length === 0) return false;
  
  for (const blocker of step.blockedBy) {
    // Internal step dependency: "Step 3"
    const stepMatch = blocker.match(/^Step\s+(\d+)$/i);
    if (stepMatch) {
      const stepNum = parseInt(stepMatch[1]);
      const targetStep = allSteps.find(s => s.order === stepNum);
      if (targetStep && !targetStep.done) return true;
      continue;
    }
    
    // Cross-plan dependency: "multi-workspace-plan-001"
    if (blocker.includes('-plan-')) {
      const targetPlan = allPlans.find(p => p.id === blocker);
      if (targetPlan && targetPlan.status !== 'done') return true;
      continue;
    }
  }
  
  return false;
}
```

### 2.4 Displaying Steps with Dependency Information

```typescript
function displayPlanSteps(plan: PlanDoc, allPlans: PlanDoc[]): void {
  const steps = parseStepsFromPlan(plan);
  const evaluatedSteps = steps.map(s => ({
    ...s,
    isBlocked: evaluateBlocked(s, steps, allPlans)
  }));
  
  console.log(`\n📋 Active Plan: ${plan.id}`);
  console.log(`   Status: ${plan.status}`);
  console.log(`   Progress: ${evaluatedSteps.filter(s => s.done).length}/${steps.length} steps done\n`);
  console.log('   Steps:');
  
  for (const step of evaluatedSteps) {
    let symbol: string;
    if (step.done) symbol = '✅';
    else if (step.isBlocked) symbol = '🔒';
    else symbol = '🔳';
    
    console.log(`   ${symbol} ${step.order}. ${step.description}`);
    if (step.isBlocked && step.blockedBy.length > 0) {
      console.log(`      ⚠️ Blocked by: ${step.blockedBy.join(', ')}`);
    }
  }
  
  // Find next actionable step
  const nextStep = evaluatedSteps.find(s => !s.done && !s.isBlocked);
  if (nextStep) {
    console.log(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`);
  } else {
    const blockedSteps = evaluatedSteps.filter(s => !s.done && s.isBlocked);
    if (blockedSteps.length > 0) {
      console.log(`\n   ⚠️ All remaining steps are blocked. Resolve blockers first:`);
      for (const bs of blockedSteps) {
        console.log(`      - Step ${bs.order}: waiting for ${bs.blockedBy.join(', ')}`);
      }
    } else if (evaluatedSteps.every(s => s.done)) {
      console.log(`\n   🎉 All steps complete! Run \`loom finish-plan ${plan.id}\` to mark as done.`);
    }
  }
}
```

### 2.5 Cross-Plan Dependency Summary

```typescript
function displayCrossPlanDependencies(thread: Thread): void {
  const waitingPlans = thread.plans.filter(p => {
    if (p.status !== 'draft' && p.status !== 'active') return false;
    const steps = parseStepsFromPlan(p);
    if (steps.length === 0) return false;
    const firstStep = steps[0];
    return firstStep.blockedBy.some(b => b.includes('-plan-'));
  });
  
  if (waitingPlans.length > 0) {
    console.log('\n📋 Other Plans:');
    for (const plan of waitingPlans) {
      const steps = parseStepsFromPlan(plan);
      const blockers = steps[0]?.blockedBy.filter(b => b.includes('-plan-')) || [];
      console.log(`   - ${plan.id} (status: ${plan.status}) — Waiting for: ${blockers.join(', ')}`);
    }
  }
}
```

### 2.6 Integration into `statusCommand`

```typescript
export async function statusCommand(threadId?: string, options?: any): Promise<void> {
  const loomRoot = getActiveLoomRoot();
  
  if (threadId) {
    const thread = await loadThread(threadId);
    const status = getThreadStatus(thread);
    const phase = getThreadPhase(thread);
    
    console.log(chalk.bold(`\n🧵 Thread: ${thread.id}`));
    console.log(`   Status: ${colorStatus(status)}`);
    console.log(`   Phase:  ${phase}`);
    console.log(`   Design: ${thread.design.title} (v${thread.design.version})`);
    
    const activePlan = thread.plans.find(p => 
      p.status === 'implementing' || p.status === 'active'
    );
    
    if (activePlan) {
      displayPlanSteps(activePlan, thread.plans);
    }
    
    displayCrossPlanDependencies(thread);
    
    if (options.verbose) {
      // Show all plans
    }
  } else {
    // List all threads (existing logic)
  }
}
```

### 2.7 Testing the Enhanced Status

**Manual Test Cases:**

1. **No blockers:** All steps show 🔳. Next step suggested.
2. **Internal blocker:** Step 4 shows 🔒 and "Blocked by: Step 3".
3. **Cross-plan blocker:** First step shows 🔒 and "Blocked by: multi-workspace-plan-001".
4. **All steps done:** Suggests finishing the plan.
5. **All remaining blocked:** Shows summary of blockers.

### 2.8 Future Enhancements (Post-MVP)

- VS Code tree view icons for blocked steps (🔒).
- `loom unblocked` command to list all actionable steps across threads.
- Prevent `loom complete-step` from marking a blocked step as done (validation).

---

## Step 3 — Implement `loom validate` Command

**File:** `packages/cli/src/commands/validate.ts`

```typescript
import chalk from 'chalk';
import { loadThread } from '../../../fs/src/loadThread';
import { getActiveLoomRoot } from '../../../fs/src/utils';
import * as path from 'path';
import * as fs from 'fs-extra';

export async function validateCommand(threadId?: string, options?: any): Promise<void> {
  const loomRoot = getActiveLoomRoot();
  const threadsDir = path.join(loomRoot, 'threads');

  const validateThread = async (id: string) => {
    const thread = await loadThread(id);
    const issues: string[] = [];

    // Check design exists
    if (!thread.design) {
      issues.push('Missing primary design document');
    }

    // Check plan design_version matches
    for (const plan of thread.plans) {
      if (plan.design_version !== thread.design.version) {
        issues.push(`Plan ${plan.id} is stale (design v${thread.design.version}, plan expects v${plan.design_version})`);
      }
    }

    // Check parent_id references exist
    const ids = new Set(thread.allDocs.map(d => d.id));
    for (const doc of thread.allDocs) {
      if (doc.parent_id && !ids.has(doc.parent_id)) {
        issues.push(`Broken parent_id: ${doc.id} → ${doc.parent_id}`);
      }
    }

    return { id, issues };
  };

  if (threadId) {
    const { issues } = await validateThread(threadId);
    if (issues.length === 0) {
      console.log(chalk.green(`✅ Thread '${threadId}' is valid`));
    } else {
      console.log(chalk.red(`❌ Thread '${threadId}' has issues:`));
      issues.forEach(i => console.log(`   - ${i}`));
    }
  } else if (options.all) {
    const entries = await fs.readdir(threadsDir);
    for (const entry of entries) {
      const threadPath = path.join(threadsDir, entry);
      const stat = await fs.stat(threadPath);
      if (stat.isDirectory() && entry !== '_archive') {
        const { issues } = await validateThread(entry);
        if (issues.length === 0) {
          console.log(`${chalk.green('✅')} ${entry}`);
        } else {
          console.log(`${chalk.red('❌')} ${entry} (${issues.length} issues)`);
        }
      }
    }
  }
}
```

---

## Step 4 — Implement `loom refine-design` Command

**File:** `packages/cli/src/commands/refine.ts`

```typescript
import { runEvent } from '../../../fs/src/runEvent';

export async function refineCommand(threadId: string): Promise<void> {
  await runEvent(threadId, { type: 'REFINE_DESIGN' });
  console.log(`🧵 REFINE_DESIGN applied to thread '${threadId}'`);
  console.log(`   Design version incremented. Dependent plans marked stale.`);
}
```

---

## Step 5 — Implement `loom start-plan` Command

**File:** `packages/cli/src/commands/startPlan.ts`

```typescript
import { runEvent } from '../../../fs/src/runEvent';

export async function startPlanCommand(planId: string): Promise<void> {
  // planId format: "payment-system-plan-001"
  const threadId = planId.split('-plan-')[0];
  await runEvent(threadId, { type: 'START_PLAN', planId } as any);
  console.log(`🧵 START_PLAN applied to '${planId}'`);
}
```

---

## Step 6 — Implement `loom complete-step` Command

**File:** `packages/cli/src/commands/completeStep.ts`

```typescript
import { runEvent } from '../../../fs/src/runEvent';

export async function completeStepCommand(planId: string, options: any): Promise<void> {
  const step = parseInt(options.step, 10);
  if (isNaN(step)) {
    console.error('❌ --step <n> is required');
    process.exit(1);
  }

  const threadId = planId.split('-plan-')[0];
  await runEvent(threadId, { type: 'COMPLETE_STEP', planId, stepIndex: step - 1 } as any);
  console.log(`🧵 Step ${step} completed in '${planId}'`);
}
```

---

## Step 7 — Implement `loom summarise-context` Command

**File:** `packages/cli/src/commands/summarise.ts`

```typescript
import { loadThread } from '../../../fs/src/loadThread';
import { saveDoc } from '../../../fs/src/save';
import * as path from 'path';
import { getActiveLoomRoot } from '../../../fs/src/utils';

export async function summariseCommand(threadId: string, options: any): Promise<void> {
  const thread = await loadThread(threadId);
  const loomRoot = getActiveLoomRoot();
  const ctxPath = path.join(loomRoot, 'threads', threadId, `${threadId}-ctx.md`);

  // Build summary content
  const summary = `---
type: ctx
id: ${threadId}-ctx
title: "Context Summary — ${thread.design.title}"
status: active
created: ${new Date().toISOString().split('T')[0]}
version: 1
tags: [ctx, summary]
parent_id: ${thread.design.id}
requires_load: []
source_version: ${thread.design.version}
---

# Design Context Summary

## Problem Statement
${extractGoal(thread.design.content)}

## Key Decisions Made
${extractDecisions(thread.design.content)}

## Open Questions
${extractQuestions(thread.design.content)}

## Active Plans
${thread.plans.map(p => `- ${p.id} (status: ${p.status})`).join('\n')}
`;

  const fs = require('fs-extra');
  await fs.writeFile(ctxPath, summary);
  console.log(`🧵 Context summary written to ${ctxPath}`);
}

// Helper functions (simplified — real implementation uses AI)
function extractGoal(content: string): string {
  const match = content.match(/## Goal\n([\s\S]*?)\n##/);
  return match ? match[1].trim() : '(Not found)';
}

function extractDecisions(content: string): string {
  return '- (Manual extraction needed — AI summarisation pending)';
}

function extractQuestions(content: string): string {
  return '- (Manual extraction needed)';
}
```

---

## Step 8 — Wire All Commands into Main CLI Entry Point

**File:** `packages/cli/src/index.ts`

(Already shown in Step 1 — this step confirms all imports are correct and the program parses arguments properly.)

---

## Step 9 — Test CLI with Real Looms

**Manual Test Plan:**

1. **Setup test loom:**
   ```bash
   loom setup test
   loom switch test
   ```

2. **Create a sample thread:**
   ```bash
   mkdir -p ~/looms/test/threads/example/plans
   cp .loom/templates/design-template.md ~/looms/test/threads/example/example-design.md
   # Edit frontmatter to set proper id, status, etc.
   ```

3. **Test commands:**
   ```bash
   loom status
   loom status example --verbose
   loom validate example
   loom refine-design example
   loom summarise-context example
   ```

4. **Verify output and file changes.**

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |