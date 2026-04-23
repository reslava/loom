import * as path from 'path';
import * as fsNative from 'fs';
import { remove, ensureDir, outputFile } from 'fs-extra';
import { serializeFrontmatter } from '../packages/core/dist/index.js';

export const WORKSPACE_ROOT = 'j:/temp/loom';

export async function setupWorkspace(): Promise<string> {
    // Remove only weaves/ so j:/temp/loom is stable for manual inspection
    await remove(path.join(WORKSPACE_ROOT, 'weaves'));
    await ensureDir(path.join(WORKSPACE_ROOT, '.loom'));
    await outputFile(path.join(WORKSPACE_ROOT, '.loom', 'workflow.yml'), 'version: 1\n');
    await ensureDir(path.join(WORKSPACE_ROOT, 'weaves'));
    return WORKSPACE_ROOT;
}

export async function seedWeave(
    loomRoot: string,
    weaveId: string,
    options?: { planStatus?: string; steps?: number }
): Promise<{ weavePath: string; planId: string }> {
    const weavePath = path.join(loomRoot, 'weaves', weaveId);
    const planId = `${weaveId}-plan-001`;
    const stepCount = options?.steps ?? 2;

    // Design doc
    const designFm = serializeFrontmatter({
        type: 'design',
        id: `${weaveId}-design`,
        title: `${weaveId} Design`,
        status: 'active',
        created: '2026-04-23',
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [planId],
        requires_load: [],
    });
    await outputFile(
        path.join(weavePath, `${weaveId}-design.md`),
        `${designFm}\n## Overview\nTest design.\n`
    );

    // Plan doc
    const stepsRows = Array.from({ length: stepCount }, (_, i) =>
        `| 🔳 | ${i + 1} | Step ${i + 1} | src/ | — |`
    ).join('\n');
    const planFm = serializeFrontmatter({
        type: 'plan',
        id: planId,
        title: `Test Plan ${weaveId}`,
        status: options?.planStatus ?? 'implementing',
        created: '2026-04-23',
        version: 1,
        tags: [],
        parent_id: `${weaveId}-design`,
        child_ids: [],
        requires_load: [],
    });
    const planDoc = `${planFm}
## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
${stepsRows}
`;
    await outputFile(path.join(weavePath, 'plans', `${planId}.md`), planDoc);

    return { weavePath, planId };
}

export function fileExists(filePath: string): boolean {
    return fsNative.existsSync(filePath);
}

export function readFile(filePath: string): string {
    return fsNative.readFileSync(filePath, 'utf8');
}
