import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { assert } from './test-utils';
import { buildFeedbackUrl, formatFeedbackEnvironment, FEEDBACK_TEMPLATE_FILE } from '../packages/core/dist/index.js';
import { parseGitHubRepo, resolveFeedbackRepo } from '../packages/fs/dist/index.js';
import { getFeedbackContext } from '../packages/app/dist/index.js';

// In-tool user feedback — pure URL builder, repo resolution, and the app
// use-case's snapshot shape (counts only, no PII). All hermetic: the only IO is
// a git-remote read against a throwaway non-repo dir to prove the null branch.

const SNAPSHOT = {
    loomVersion: '1.0.0',
    platform: 'linux',
    weaveCount: 2,
    threadCount: 3,
    donePlanCount: 1,
    currentRelease: '1.0.0',
};

function testBuildFeedbackUrl(): void {
    // No repo → null (callers show a "set feedback.repo" message, not a broken link).
    assert(buildFeedbackUrl({ repo: null, snapshot: SNAPSHOT }) === null, 'null repo → null url');

    const url = buildFeedbackUrl({ repo: 'reslava/loom', snapshot: SNAPSHOT })!;
    assert(url.startsWith('https://github.com/reslava/loom/issues/new?'), `base url: ${url}`);
    assert(url.includes(`template=${FEEDBACK_TEMPLATE_FILE}`), 'carries template param');
    assert(url.includes('environment='), 'carries prefilled environment field');
    // The snapshot counts must be URL-encoded into the environment field.
    assert(/Weaves.*2/.test(decodeURIComponent(url)), 'environment encodes weave count');

    const env = formatFeedbackEnvironment(SNAPSHOT);
    assert(env.includes('Loom version: 1.0.0') && env.includes('Done plans: 1'), 'environment body is human-readable');
}

function testParseGitHubRepo(): void {
    assert(parseGitHubRepo('https://github.com/reslava/loom.git') === 'reslava/loom', 'https .git');
    assert(parseGitHubRepo('https://github.com/reslava/loom') === 'reslava/loom', 'https no .git');
    assert(parseGitHubRepo('git@github.com:reslava/loom.git') === 'reslava/loom', 'scp-style ssh');
    assert(parseGitHubRepo('ssh://git@github.com/reslava/loom.git') === 'reslava/loom', 'ssh url');
    assert(parseGitHubRepo('https://gitlab.com/x/y.git') === null, 'non-github → null');
}

async function testResolveFeedbackRepo(): Promise<void> {
    assert(resolveFeedbackRepo({ override: 'owner/name' }) === 'owner/name', 'override wins');
    assert(resolveFeedbackRepo({ override: '  owner/name  ' }) === 'owner/name', 'override trimmed');

    // No override + a non-git directory → null (git remote read fails, caught).
    const tmp = path.join(os.tmpdir(), `loom-feedback-nogit-${Date.now()}`);
    await fs.ensureDir(tmp);
    try {
        assert(resolveFeedbackRepo({ cwd: tmp }) === null, 'no remote → null');
    } finally {
        await fs.remove(tmp);
    }
}

async function testGetFeedbackContext(): Promise<void> {
    const state: any = {
        weaves: [
            {
                id: 'w1',
                threads: [
                    { id: 't1', plans: [{ id: 'p1', status: 'done', actual_release: '1.2.0', title: 'P1', steps: [] }], dones: [], allDocs: [], manifest: null, idea: null },
                    { id: 't2', plans: [{ id: 'p2', status: 'implementing', title: 'P2', steps: [] }], dones: [], allDocs: [], manifest: null, idea: null },
                ],
            },
        ],
        archivedThreads: [],
    };

    const ctx = await getFeedbackContext(
        { loomVersion: '9.9.9', repoOverride: 'owner/name' },
        {
            getState: async () => state,
            resolveFeedbackRepo: (opts?: { override?: string | null }) => opts?.override ?? null,
            platform: () => 'testos',
        },
    );

    assert(ctx.repo === 'owner/name', 'repo from override');
    assert(ctx.url !== null && ctx.url.includes('owner/name'), 'url built for resolved repo');

    const s = ctx.snapshot;
    assert(s.loomVersion === '9.9.9', 'reports passed loom version');
    assert(s.platform === 'testos', 'reports injected platform');
    assert(s.weaveCount === 1, 'weave count');
    assert(s.threadCount === 2, 'thread count');
    assert(s.donePlanCount === 1, 'done plan count');
    assert(s.currentRelease === '1.2.0', 'current release from buildRoadmap');

    // Non-PII guard: the snapshot carries EXACTLY these six count/version keys —
    // no paths, titles, or doc content ever leak in.
    const keys = Object.keys(s).sort();
    assert(
        JSON.stringify(keys) === JSON.stringify(['currentRelease', 'donePlanCount', 'loomVersion', 'platform', 'threadCount', 'weaveCount']),
        `snapshot keys are counts-only: ${keys.join(',')}`,
    );

    // Unresolved repo → null repo AND null url.
    const noRepo = await getFeedbackContext(
        { loomVersion: '9.9.9' },
        { getState: async () => state, resolveFeedbackRepo: () => null, platform: () => 'testos' },
    );
    assert(noRepo.repo === null && noRepo.url === null, 'unresolved repo → null repo + url');
}

async function run(): Promise<void> {
    testBuildFeedbackUrl();
    testParseGitHubRepo();
    await testResolveFeedbackRepo();
    await testGetFeedbackContext();
    console.log('✅ user-feedback.test.ts passed');
}

run().catch(e => { console.error('❌ user-feedback.test.ts failed:', e); process.exit(1); });
