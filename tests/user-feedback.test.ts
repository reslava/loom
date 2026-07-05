import { assert } from './test-utils';
import {
    buildFeedbackUrl,
    formatFeedbackEnvironment,
    FEEDBACK_TEMPLATE_FILE,
    FEEDBACK_REPO,
} from '../packages/core/dist/index.js';
import { getFeedbackContext } from '../packages/app/dist/index.js';

// In-tool user feedback — pure URL builder + the app use-case's snapshot shape
// (counts only, no PII). Fully hermetic: no IO. The invariant under test: feedback
// always targets the fixed Loom sink (FEEDBACK_REPO), with no override of any kind —
// a user can never point Loom feedback at their own repo.

const SNAPSHOT = {
    loomVersion: '1.0.0',
    platform: 'linux',
    weaveCount: 2,
    threadCount: 3,
    donePlanCount: 1,
    currentRelease: '1.0.0',
};

function testBuildFeedbackUrl(): void {
    assert(FEEDBACK_REPO === 'reslava/loom', 'sink is the Loom repo');

    const url = buildFeedbackUrl({ repo: FEEDBACK_REPO, snapshot: SNAPSHOT });
    assert(url.startsWith('https://github.com/reslava/loom/issues/new?'), `base url: ${url}`);
    assert(url.includes(`template=${FEEDBACK_TEMPLATE_FILE}`), 'carries template param');
    assert(url.includes('environment='), 'carries prefilled environment field');
    // The snapshot counts must be URL-encoded into the environment field.
    assert(/Weaves.*2/.test(decodeURIComponent(url)), 'environment encodes weave count');

    const env = formatFeedbackEnvironment(SNAPSHOT);
    assert(env.includes('Loom version: 1.0.0') && env.includes('Done plans: 1'), 'environment body is human-readable');
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
        { loomVersion: '9.9.9' },
        { getState: async () => state, platform: () => 'testos' },
    );

    // Always the Loom sink — no input can redirect it.
    assert(ctx.repo === 'reslava/loom', 'repo is the fixed Loom sink');
    assert(ctx.url.includes('reslava/loom'), 'url targets the Loom sink');

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
}

async function run(): Promise<void> {
    testBuildFeedbackUrl();
    await testGetFeedbackContext();
    console.log('✅ user-feedback.test.ts passed');
}

run().catch(e => { console.error('❌ user-feedback.test.ts failed:', e); process.exit(1); });
