import { assert } from './test-utils';
import {
    buildFeedbackUrl,
    formatFeedbackEnvironment,
    resolveFeedbackRepo,
    FEEDBACK_TEMPLATE_FILE,
    DEFAULT_FEEDBACK_REPO,
} from '../packages/core/dist/index.js';
import { getFeedbackContext } from '../packages/app/dist/index.js';

// In-tool user feedback — pure URL builder, central-sink repo resolution, and the
// app use-case's snapshot shape (counts only, no PII). Fully hermetic: no IO. The
// key invariant under test: feedback resolves to the central Loom sink, NOT the
// current project's git remote, so every install's feedback reaches the maintainer.

const SNAPSHOT = {
    loomVersion: '1.0.0',
    platform: 'linux',
    weaveCount: 2,
    threadCount: 3,
    donePlanCount: 1,
    currentRelease: '1.0.0',
};

function testBuildFeedbackUrl(): void {
    const url = buildFeedbackUrl({ repo: 'reslava/loom', snapshot: SNAPSHOT });
    assert(url.startsWith('https://github.com/reslava/loom/issues/new?'), `base url: ${url}`);
    assert(url.includes(`template=${FEEDBACK_TEMPLATE_FILE}`), 'carries template param');
    assert(url.includes('environment='), 'carries prefilled environment field');
    // The snapshot counts must be URL-encoded into the environment field.
    assert(/Weaves.*2/.test(decodeURIComponent(url)), 'environment encodes weave count');

    const env = formatFeedbackEnvironment(SNAPSHOT);
    assert(env.includes('Loom version: 1.0.0') && env.includes('Done plans: 1'), 'environment body is human-readable');
}

function testResolveFeedbackRepo(): void {
    // The central sink is the Loom repo, and it's what you get with no override —
    // regardless of the current project's git remote. This is the whole fix: every
    // install files into reslava/loom, never its own repo.
    assert(DEFAULT_FEEDBACK_REPO === 'reslava/loom', 'sink is the Loom repo');
    assert(resolveFeedbackRepo() === 'reslava/loom', 'no override → central sink');
    assert(resolveFeedbackRepo(undefined) === 'reslava/loom', 'undefined → sink');
    assert(resolveFeedbackRepo(null) === 'reslava/loom', 'null → sink');
    assert(resolveFeedbackRepo('   ') === 'reslava/loom', 'blank → sink');

    // An explicit override wins — the reuse hinge (a fork or a non-Loom tool built
    // on this mechanism points feedback at its own repo).
    assert(resolveFeedbackRepo('owner/name') === 'owner/name', 'override wins');
    assert(resolveFeedbackRepo('  owner/name  ') === 'owner/name', 'override trimmed');
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
        { getState: async () => state, platform: () => 'testos' },
    );

    assert(ctx.repo === 'owner/name', 'repo from override');
    assert(ctx.url.includes('owner/name'), 'url built for resolved repo');

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

    // No override → the central sink, and a real (non-null) url every time.
    const central = await getFeedbackContext(
        { loomVersion: '9.9.9' },
        { getState: async () => state, platform: () => 'testos' },
    );
    assert(central.repo === 'reslava/loom', 'no override → central sink repo');
    assert(central.url.includes('reslava/loom'), 'url targets the central sink');
}

async function run(): Promise<void> {
    testBuildFeedbackUrl();
    testResolveFeedbackRepo();
    await testGetFeedbackContext();
    console.log('✅ user-feedback.test.ts passed');
}

run().catch(e => { console.error('❌ user-feedback.test.ts failed:', e); process.exit(1); });
