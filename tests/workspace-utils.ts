import * as path from 'path';
import * as os from 'os';
import * as fsNative from 'fs';
import { remove, ensureDir, outputFile } from 'fs-extra';
import { serializeFrontmatter } from '../packages/core/dist/index.js';

// Stable per-OS temp location so the suite runs cross-platform (Linux CI included)
// while staying in one place for manual inspection between runs.
export const WORKSPACE_ROOT = path.join(os.tmpdir(), 'loom-test-workspace');

export async function setupWorkspace(): Promise<string> {
    // Remove only loom/ so WORKSPACE_ROOT is stable for manual inspection
    await remove(path.join(WORKSPACE_ROOT, 'loom'));
    await ensureDir(path.join(WORKSPACE_ROOT, '.loom'));
    await outputFile(path.join(WORKSPACE_ROOT, '.loom', 'workflow.yml'), 'version: 1\n');
    await ensureDir(path.join(WORKSPACE_ROOT, 'loom'));
    return WORKSPACE_ROOT;
}

// seedWeave: creates a weave with a single default thread (threadSlug = weaveSlug)
export async function seedWeave(
    loomRoot: string,
    weaveSlug: string,
    options?: { planStatus?: string; steps?: number }
): Promise<{ weavePath: string; threadPath: string; planId: string }> {
    return seedWeaveWithThread(loomRoot, weaveSlug, weaveSlug, options);
}

// seedWeaveWithThread: creates a weave with a named thread (design + plan inside thread subdir)
export async function seedWeaveWithThread(
    loomRoot: string,
    weaveSlug: string,
    threadSlug: string,
    options?: { planStatus?: string; steps?: number }
): Promise<{ weavePath: string; threadPath: string; planId: string }> {
    const weavePath = path.join(loomRoot, 'loom', weaveSlug);
    const threadPath = path.join(weavePath, threadSlug);
    // Plan IDs use weaveSlug prefix so use-cases can extract weaveSlug via planId.split('-plan-')[0]
    const planId = `${weaveSlug}-plan-001`;
    const stepCount = options?.steps ?? 2;

    const designFm = serializeFrontmatter({
        type: 'design',
        id: `${threadSlug}-design`,
        title: `${threadSlug} Design`,
        status: 'active',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [planId],
        requires_load: [],
    });
    await outputFile(
        path.join(threadPath, `${threadSlug}-design.md`),
        `${designFm}\n## Overview\nTest design.\n`
    );

    const stepsRows = Array.from({ length: stepCount }, (_, i) =>
        `| 🔳 | ${i + 1} | Step ${i + 1} | src/ | — |`
    ).join('\n');
    const planFm = serializeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Test Plan ${weaveSlug}`,
        status: options?.planStatus ?? 'implementing',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: `${threadSlug}-design`,
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
// The plan ID is {weaveSlug}-{threadSlug}-plan-001 to avoid collision with the primary thread.
export async function seedThread(
    loomRoot: string,
    weaveSlug: string,
    threadSlug: string,
    options?: { planStatus?: string; steps?: number }
): Promise<{ threadPath: string; planId: string }> {
    const weavePath = path.join(loomRoot, 'loom', weaveSlug);
    const threadPath = path.join(weavePath, threadSlug);
    const planId = `${weaveSlug}-${threadSlug}-plan-001`;
    const stepCount = options?.steps ?? 1;

    const designFm = serializeFrontmatter({
        type: 'design',
        id: `${threadSlug}-design`,
        title: `${threadSlug} Design`,
        status: 'active',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [planId],
        requires_load: [],
    });
    await outputFile(
        path.join(threadPath, `${threadSlug}-design.md`),
        `${designFm}\n## Overview\nTest design for thread ${threadSlug}.\n`
    );

    const stepsRows = Array.from({ length: stepCount }, (_, i) =>
        `| 🔳 | ${i + 1} | Step ${i + 1} | src/ | — |`
    ).join('\n');
    const planFm = serializeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Test Plan ${threadSlug}`,
        status: options?.planStatus ?? 'implementing',
        created: '2026-04-24',
        version: 1,
        tags: [],
        parent_id: `${threadSlug}-design`,
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
    weaveSlug: string,
    fiberId: string
): Promise<{ fiberPath: string }> {
    const weavePath = path.join(loomRoot, 'loom', weaveSlug);
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
    weaveSlug: string,
    threadSlug: string,
    planId: string
): Promise<{ donePath: string }> {
    const donePath = path.join(loomRoot, 'loom', weaveSlug, threadSlug, 'done', `${planId}-done.md`);

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
