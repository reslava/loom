import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { assert } from './test-utils.ts';
import {
    createTelemetry,
    resolveConsent,
    consentFromEnv,
    buildCommonProps,
    detectCI,
    NoopTelemetry,
    PostHogTelemetry,
    getOrCreateInstallId,
    defaultConfigDir,
    TelemetryClient,
    TelemetryProps,
} from '../packages/telemetry/dist';
import {
    trackWorkspaceActivated,
    trackSessionStarted,
    trackDocGenerated,
    trackDocRefined,
    trackPlanStarted,
    trackStepCompleted,
    trackPlanDone,
    trackError,
    trackCommandInvoked,
} from '../packages/app/dist/telemetry/events';
import { emitToolSuccess, emitToolError } from '../packages/mcp/dist/telemetryDispatch';

// A capturing sink — records track() calls so we can assert the exact event names
// and prove the props are content-free.
class Recorder implements TelemetryClient {
    events: Array<{ event: string; props?: TelemetryProps }> = [];
    track(event: string, props?: TelemetryProps): void {
        this.events.push({ event, props });
    }
    async flush(): Promise<void> {
        /* no-op */
    }
    last(): { event: string; props?: TelemetryProps } {
        return this.events[this.events.length - 1];
    }
}

const SCALAR = new Set(['string', 'number', 'boolean']);

function assertContentFree(props: TelemetryProps | undefined): void {
    if (!props) return;
    for (const [k, v] of Object.entries(props)) {
        assert(SCALAR.has(typeof v), `prop ${k} must be a scalar, got ${typeof v}`);
    }
}

async function run() {
    console.log('📡 Running telemetry tests...\n');

    // --- Consent gate ---------------------------------------------------------
    {
        assert(resolveConsent({ enabled: false, surface: 'cli', loomVersion: '1', apiKey: 'k' }) === false, 'disabled → no consent');
        assert(resolveConsent({ enabled: true, surface: 'cli', loomVersion: '1' }) === false, 'no key → no consent');
        assert(resolveConsent({ enabled: true, surface: 'cli', loomVersion: '1', apiKey: 'k' }) === true, 'enabled + key → consent');
        console.log('  ✅ resolveConsent');
    }

    // --- consentFromEnv (opt-in semantics) ------------------------------------
    {
        assert(consentFromEnv({}) === false, 'unset → false');
        assert(consentFromEnv({ LOOM_TELEMETRY: '0' }) === false, '"0" → false');
        assert(consentFromEnv({ LOOM_TELEMETRY: 'false' }) === false, '"false" → false');
        assert(consentFromEnv({ LOOM_TELEMETRY: '1' }) === true, '"1" → true');
        assert(consentFromEnv({ LOOM_TELEMETRY: 'true' }) === true, '"true" → true');
        assert(consentFromEnv({ LOOM_TELEMETRY: 'on' }) === true, '"on" → true');
        console.log('  ✅ consentFromEnv');
    }

    // --- createTelemetry returns Noop unless fully opted in -------------------
    {
        const off = createTelemetry({ enabled: false, surface: 'cli', loomVersion: '1', apiKey: 'k' });
        assert(off instanceof NoopTelemetry, 'disabled → NoopTelemetry');
        const noKey = createTelemetry({ enabled: true, surface: 'cli', loomVersion: '1' });
        assert(noKey instanceof NoopTelemetry, 'no key → NoopTelemetry');
        // track/flush on Noop never throw
        off.track('anything', { a: 1 });
        await off.flush();
        console.log('  ✅ createTelemetry Noop gating');
    }

    // --- createTelemetry(enabled + key) builds a real client + mints install id
    {
        const dir = path.join(os.tmpdir(), `loom-telemetry-test-${Date.now()}`);
        fs.rmSync(dir, { recursive: true, force: true });
        const client = createTelemetry({ enabled: true, surface: 'agent', loomVersion: '9.9.9', apiKey: 'phc_test', configDir: dir });
        assert(client instanceof PostHogTelemetry, 'enabled + key → PostHogTelemetry');
        const idFile = path.join(dir, 'telemetry.json');
        assert(fs.existsSync(idFile), 'install id persisted only after opt-in');
        const id1 = getOrCreateInstallId(dir);
        const id2 = getOrCreateInstallId(dir);
        assert(id1 === id2 && id1.length >= 32, 'install id is stable across reads');
        // track must never throw; flush with an empty queue resolves without network
        client.track('workspace_activated');
        assert(typeof (client as PostHogTelemetry).flush === 'function', 'flush exists');
        fs.rmSync(dir, { recursive: true, force: true });
        console.log('  ✅ PostHog client construction + identity');
    }

    // --- defaultConfigDir honours LOOM_CONFIG_DIR ----------------------------
    {
        assert(defaultConfigDir({ LOOM_CONFIG_DIR: '/tmp/x' }) === '/tmp/x', 'LOOM_CONFIG_DIR wins');
        console.log('  ✅ defaultConfigDir override');
    }

    // --- common props are content-free ---------------------------------------
    {
        const props = buildCommonProps({ surface: 'extension', loomVersion: '1.2.3', env: { CI: '1' } });
        assert(props.surface === 'extension' && props.loom_version === '1.2.3', 'surface + version present');
        assert(props.is_ci === true, 'is_ci from CI env');
        assert(detectCI({}) === false && detectCI({ GITHUB_ACTIONS: 'true' }) === true, 'detectCI');
        const keys = Object.keys(props).sort().join(',');
        assert(keys === 'is_ci,loom_version,os,surface', `only the 4 common keys, got ${keys}`);
        assertContentFree(props);
        console.log('  ✅ buildCommonProps content-free');
    }

    // --- taxonomy: event names + props, all content-free ----------------------
    {
        const r = new Recorder();
        trackWorkspaceActivated(r); assert(r.last().event === 'workspace_activated', 'workspace_activated');
        trackSessionStarted(r); assert(r.last().event === 'session_started', 'session_started');
        trackDocGenerated(r, 'idea'); assert(r.last().event === 'doc_generated' && r.last().props?.type === 'idea', 'doc_generated{idea}');
        trackDocRefined(r, 'design'); assert(r.last().event === 'doc_refined' && r.last().props?.type === 'design', 'doc_refined{design}');
        trackPlanStarted(r); assert(r.last().event === 'plan_started', 'plan_started');
        trackStepCompleted(r); assert(r.last().event === 'step_completed' && r.last().props?.had_error === false, 'step_completed');
        trackPlanDone(r); assert(r.last().event === 'plan_done', 'plan_done');
        trackError(r, 'loom_create_idea', 'TypeError'); assert(r.last().event === 'error' && r.last().props?.error_class === 'TypeError', 'error{error_class}');
        trackCommandInvoked(r, 'loom_create_idea'); assert(r.last().event === 'command_invoked' && r.last().props?.command === 'loom_create_idea', 'command_invoked');
        for (const e of r.events) assertContentFree(e.props);
        console.log('  ✅ taxonomy mapping + content-free');
    }

    // --- MCP dispatch mapping -------------------------------------------------
    {
        const r = new Recorder();
        emitToolSuccess(r, 'loom_create_idea');
        assert(r.events[0].event === 'command_invoked' && r.events[0].props?.command === 'loom_create_idea', 'success → command_invoked first');
        assert(r.events[1].event === 'doc_generated' && r.events[1].props?.type === 'idea', 'loom_create_idea → doc_generated{idea}');

        const r2 = new Recorder();
        emitToolSuccess(r2, 'loom_complete_step');
        assert(r2.events.some(e => e.event === 'step_completed'), 'loom_complete_step → step_completed');

        const r3 = new Recorder();
        emitToolSuccess(r3, 'loom_close_plan');
        assert(r3.events.some(e => e.event === 'plan_done'), 'loom_close_plan → plan_done');

        const r4 = new Recorder();
        emitToolSuccess(r4, 'loom_find_doc'); // no loop mapping
        assert(r4.events.length === 1 && r4.events[0].event === 'command_invoked', 'unmapped tool → only command_invoked');

        const r5 = new Recorder();
        emitToolError(r5, 'loom_create_plan', new TypeError('boom'));
        assert(r5.last().event === 'error' && r5.last().props?.error_class === 'TypeError', 'error class = constructor name');
        assert(JSON.stringify(r5.last().props).indexOf('boom') === -1, 'error message (content) never sent');

        const r6 = new Recorder();
        emitToolError(r6, 'loom_x', 'a string, not an Error');
        assert(r6.last().props?.error_class === 'UnknownError', 'non-Error → UnknownError');
        console.log('  ✅ MCP dispatch mapping');
    }

    console.log('\n✅ All telemetry tests passed');
}

run().catch(e => { console.error('❌ telemetry test failed:', e); process.exit(1); });
