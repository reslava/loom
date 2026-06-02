import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { generateDesignBody, serializeFrontmatter } from '../packages/core/dist/index.js';

export const TEST_ROOT = path.join(os.tmpdir(), 'loom-tests');

export function runLoom(
    args: string,
    cwd?: string
): { stdout: string; stderr: string; exitCode: number } {
    try {
        const stdout = execSync(`loom ${args}`, {
            cwd,
            encoding: 'utf8',
            stdio: 'pipe',
        });
        return { stdout, stderr: '', exitCode: 0 };
    } catch (e: any) {
        return {
            stdout: e.stdout?.toString() || '',
            stderr: e.stderr?.toString() || '',
            exitCode: e.status || 1,
        };
    }
}

export async function setupTestLoom(name: string): Promise<string> {
    const loomPath = path.join(TEST_ROOT, name);
    await fs.remove(loomPath);
    await fs.ensureDir(loomPath);
    return loomPath;
}

/**
 * Creates an isolated mono-loom workspace in a temp dir with its own `.loom/`
 * marker, and returns its root. The CLI resolves a workspace by walking up from
 * its cwd looking for a `.loom/` dir (see getActiveLoomRoot), so pass this root
 * as runLoom's `cwd` to keep CLI tests hermetic — independent of, and never
 * polluting, the developer's global `~/looms/default`.
 */
export async function setupHermeticLoom(name: string): Promise<string> {
    const loomRoot = path.join(os.tmpdir(), name);
    await fs.remove(loomRoot);
    await fs.ensureDir(path.join(loomRoot, '.loom'));
    await fs.outputFile(path.join(loomRoot, '.loom', 'workflow.yml'), 'version: 1\n');
    return loomRoot;
}

export async function cleanupTestLoom(loomPath: string): Promise<void> {
    const maxRetries = 5;
    const delayMs = 300;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            await fs.remove(loomPath);
            return;
        } catch (e: any) {
            if ((e.code === 'EBUSY' || e.code === 'EPERM') && i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
            } else {
                throw e;
            }
        }
    }
}

export async function createDesignDoc(
    weavePath: string,
    weaveId: string,
    options?: { role?: 'primary' | 'supporting'; status?: string; threadId?: string }
): Promise<void> {
    // If threadId is given, create design inside thread subdir (new layout)
    // Otherwise write as loose fiber at weave root (for legacy tests / test-3 pattern)
    const threadId = options?.threadId;
    const designId = threadId ? `${threadId}-design` : `${weaveId}-design`;
    const designPath = threadId
        ? path.join(weavePath, threadId, `${threadId}-design.md`)
        : path.join(weavePath, `${weaveId}-design.md`);
    if (threadId) await fs.ensureDir(path.join(weavePath, threadId));
    const role = options?.role || 'primary';
    const status = options?.status || 'active';

    const frontmatter = {
        type: 'design',
        id: designId,
        title: `${weaveId} Design`,
        status,
        created: new Date().toISOString().split('T')[0],
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [],
        requires_load: [],
        role,
    };

    const content = generateDesignBody(`${weaveId} Design`, 'User');
    
    const frontmatterYaml = serializeFrontmatter(frontmatter);
    const output = `${frontmatterYaml}\n${content}`;

    await fs.outputFile(designPath, output);
}

export function assertFileContains(filePath: string, expected: string): void {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(expected)) {
        throw new Error(`File ${filePath} does not contain "${expected}"`);
    }
}

export function assert(condition: boolean, message?: string): void {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

export function mockAIClient(response: string) {
    return {
        complete: async (_messages: any[]) => response,
    };
}

export async function createPlanDoc(
    weavePath: string,
    planId: string,
    options?: { status?: string; steps?: Array<{ order: number; description: string; done: boolean }>; threadId?: string }
): Promise<string> {
    // Use weaveId-prefix as threadId (critical invariant: planId.split('-plan-')[0] == weaveId)
    const threadId = options?.threadId ?? planId.split('-plan-')[0];
    const threadPath = path.join(weavePath, threadId);
    const plansDir = path.join(threadPath, 'plans');
    await fs.ensureDir(plansDir);
    const planPath = path.join(plansDir, `${planId}.md`);

    const steps = options?.steps ?? [
        { order: 1, description: 'First step', done: false, files_touched: [], blocked_by: [] },
        { order: 2, description: 'Second step', done: false, files_touched: [], blocked_by: [] },
    ];

    const stepsTable = steps.map(s =>
        `| ${s.done ? '✅' : '🔳'} | ${s.order} | ${s.description} | src/ | — |`
    ).join('\n');

    const content = `---
type: plan
id: ${planId}
title: Test Plan ${planId}
status: ${options?.status ?? 'implementing'}
created: ${new Date().toISOString().split('T')[0]}
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---

# Goal
Test plan.

## Steps
| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
${stepsTable}
`;

    await fs.outputFile(planPath, content);
    return planPath;
}