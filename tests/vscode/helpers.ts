import * as fs from 'fs';
import * as path from 'path';

export const WORKSPACE_ROOT = 'j:/temp/loom';

export function ensureWorkspaceRoot(): void {
    fs.mkdirSync(path.join(WORKSPACE_ROOT, '.loom'), { recursive: true });
    fs.writeFileSync(path.join(WORKSPACE_ROOT, '.loom', 'workflow.yml'), 'version: 1\n');
    fs.mkdirSync(path.join(WORKSPACE_ROOT, 'loom'), { recursive: true });
}

export function cleanWeaves(): void {
    const dir = path.join(WORKSPACE_ROOT, 'loom');
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
}

/**
 * Seeds a weave with a single thread (threadSlug = weaveSlug for simplicity).
 * Layout:
 *   loom/{weaveSlug}/{threadSlug}/{threadSlug}-design.md
 *   loom/{weaveSlug}/{threadSlug}/plans/{planId}.md
 * planId uses weaveSlug prefix (critical invariant: planId.split('-plan-')[0] == weaveSlug).
 */
export function seedWeave(
    weaveSlug: string,
    planStatus = 'implementing',
    stepCount = 2
): { planId: string; weavePath: string; threadSlug: string; threadPath: string } {
    const weavePath = path.join(WORKSPACE_ROOT, 'loom', weaveSlug);
    const threadSlug = weaveSlug;
    const threadPath = path.join(weavePath, threadSlug);
    const planId = `${weaveSlug}-plan-001`;

    fs.mkdirSync(threadPath, { recursive: true });
    fs.writeFileSync(
        path.join(threadPath, `${threadSlug}-design.md`),
        `---\ntype: design\nid: ${threadSlug}-design\ntitle: "${weaveSlug} Design"\nstatus: active\ncreated: 2026-04-23\nversion: 1\ntags: []\nparent_id: null\nchild_ids: ["${planId}"]\nrequires_load: []\n---\n\n## Overview\nTest design.\n`
    );

    const rows = Array.from({ length: stepCount }, (_, i) =>
        `| 🔳 | ${i + 1} | Step ${i + 1} | src/ | — |`
    ).join('\n');
    fs.mkdirSync(path.join(threadPath, 'plans'), { recursive: true });
    fs.writeFileSync(
        path.join(threadPath, 'plans', `${planId}.md`),
        `---\ntype: plan\nid: ${planId}\ntitle: "Test Plan ${weaveSlug}"\nstatus: ${planStatus}\ncreated: 2026-04-23\nversion: 1\ntags: []\nparent_id: ${threadSlug}-design\nchild_ids: []\nrequires_load: []\n---\n\n## Steps\n\n| Done | # | Step | Files touched | Blocked by |\n|------|---|------|---------------|------------|\n${rows}\n`
    );

    return { planId, weavePath, threadSlug, threadPath };
}

export function seedDoneDoc(weaveSlug: string, planId: string): void {
    const threadSlug = weaveSlug;
    const threadPath = path.join(WORKSPACE_ROOT, 'loom', weaveSlug, threadSlug);
    const doneDir = path.join(threadPath, 'done');
    fs.mkdirSync(doneDir, { recursive: true });

    fs.writeFileSync(
        path.join(doneDir, `${planId}-done.md`),
        `---\ntype: done\nid: ${planId}-done\ntitle: "Done — ${planId}"\nstatus: final\ncreated: 2026-04-23\nversion: 1\ntags: []\nparent_id: ${planId}\nchild_ids: []\nrequires_load: []\n---\n\n## What was built\nTest implementation.\n`
    );
}

export function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}

export function readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
}
