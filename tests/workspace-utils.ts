import * as path from 'path';
import * as fsNative from 'fs';
import { remove, ensureDir, outputFile } from 'fs-extra';
import { serializeFrontmatter } from '../packages/core/dist/index.js';

export const WORKSPACE_ROOT = 'j:/temp/loom';

export async function setupWorkspace(): Promise<string> {
    // Remove only loom/ so j:/temp/loom is stable for manual inspection
    await remove(path.join(WORKSPACE_ROOT, 'loom'));
    await ensureDir(path.join(WORKSPACE_ROOT, '.loom'));
    await outputFile(path.join(WORKSPACE_ROOT, '.loom', 'workflow.yml'), 'version: 1\n');
    await ensureDir(path.join(WORKSPACE_ROOT, 'loom'));
    return WORKSPACE_ROOT;
}

// seedWeave: creates a weave with a single default thread (threadId = weaveId)
export async function seedWeave(
    loomRoot: string,
    weaveId: string,
    options?: { planStatus?: string; steps?: number }
): Promise<{ weavePath: string; threadPath: string; planId: string }> {
    return seedWeaveWithThread(loomRoot, weaveId, weaveId, options);
}

// seedWeaveWithThread: creates a weave with a named thread (design + plan inside thread subdir)
export async function seedWeaveWithThread(
    loomRoot: string,
    weaveId: string,
    threadId: string,
    options?: { planStatus?: string; steps?: number }
): Promise<{ weavePath: string; threadPath: string; planId: string }> {
    const weavePath = path.join(loomRoot, 'loom', weaveId);
    const threadPath = path.join(weavePath, threadId);
    // Plan IDs use weaveId prefix so use-cases can extract weaveId via planId.split('-plan-')[0]
    const planId = `${weaveId}-plan-001`;
    const stepCount = options?.steps ?? 2;

    const designFm = serializeFrontmatter({
        type: 'design',
        id: `${threadId}-design`,
        title: `${threadId} Design`,
        status: 'active',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [planId],
        requires_load: [],
    });
    await outputFile(
        path.join(threadPath, `${threadId}-design.md`),
        `${designFm}\n## Overview\nTest design.\n`
    );

    const stepsRows = Array.from({ length: stepCount }, (_, i) =>
        `| 🔳 | ${i + 1} | Step ${i + 1} | src/ | — |`
    ).join('\n');
    const planFm = serializeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Test Plan ${weaveId}`,
        status: options?.planStatus ?? 'implementing',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: `${threadId}-design`,
        child_ids: [],
        requires_load: [],
    });
    const planDoc = `${planFm}
## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
${stepsRows}
`;
    await outputFile(path.join(threadPath, 'plans', `${planId}.md`), planDoc);

    return { weavePath, threadPath, planId };
}

// seedThread: adds an additional thread (design + plan) to an existing weave directory.
// The plan ID is {weaveId}-{threadId}-plan-001 to avoid collision with the primary thread.
export async function seedThread(
    loomRoot: string,
    weaveId: string,
    threadId: string,
    options?: { planStatus?: string; steps?: number }
): Promise<{ threadPath: string; planId: string }> {
    const weavePath = path.join(loomRoot, 'loom', weaveId);
    const threadPath = path.join(weavePath, threadId);
    const planId = `${weaveId}-${threadId}-plan-001`;
    const stepCount = options?.steps ?? 1;

    const designFm = serializeFrontmatter({
        type: 'design',
        id: `${threadId}-design`,
        title: `${threadId} Design`,
        status: 'active',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [planId],
        requires_load: [],
    });
    await outputFile(
        path.join(threadPath, `${threadId}-design.md`),
        `${designFm}\n## Overview\nTest design for thread ${threadId}.\n`
    );

    const stepsRows = Array.from({ length: stepCount }, (_, i) =>
        `| 🔳 | ${i + 1} | Step ${i + 1} | src/ | — |`
    ).join('\n');
    const planFm = serializeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Test Plan ${threadId}`,
        status: options?.planStatus ?? 'implementing',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: `${threadId}-design`,
        child_ids: [],
        requires_load: [],
    });
    const planDoc = `${planFm}
## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
${stepsRows}
`;
    await outputFile(path.join(threadPath, 'plans', `${planId}.md`), planDoc);

    return { threadPath, planId };
}

// seedLooseFiber: writes a loose .md idea doc at the weave root (not inside any thread).
export async function seedLooseFiber(
    loomRoot: string,
    weaveId: string,
    fiberId: string
): Promise<{ fiberPath: string }> {
    const weavePath = path.join(loomRoot, 'loom', weaveId);
    const fiberPath = path.join(weavePath, `${fiberId}.md`);

    const fm = serializeFrontmatter({
        type: 'idea',
        id: fiberId,
        title: `${fiberId} idea`,
        status: 'draft',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [],
        requires_load: [],
    });
    await outputFile(fiberPath, `${fm}\nLoose fiber idea.\n`);

    return { fiberPath };
}

// seedDoneInThread: writes a minimal done doc inside {thread}/done/.
export async function seedDoneInThread(
    loomRoot: string,
    weaveId: string,
    threadId: string,
    planId: string
): Promise<{ donePath: string }> {
    const donePath = path.join(loomRoot, 'loom', weaveId, threadId, 'done', `${planId}-done.md`);

    const fm = serializeFrontmatter({
        type: 'done',
        id: `${planId}-done`,
        title: `Done — ${planId}`,
        status: 'final',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: planId,
        child_ids: [],
        requires_load: [],
    });
    await outputFile(donePath, `${fm}\n## What was built\nSeeded done doc.\n`);

    return { donePath };
}

export function fileExists(filePath: string): boolean {
    return fsNative.existsSync(filePath);
}

export function readFile(filePath: string): string {
    return fsNative.readFileSync(filePath, 'utf8');
}
