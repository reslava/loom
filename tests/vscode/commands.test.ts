import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { WORKSPACE_ROOT, cleanWeaves, seedWeave, fileExists } from './helpers';

// Relative imports resolved at runtime from tests/vscode/out/ (3 levels up to repo root)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadWeave, saveWeave } = require('../../../packages/fs/dist/index.js') as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { completeStep } = require('../../../packages/app/dist/completeStep.js') as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runEvent } = require('../../../packages/app/dist/runEvent.js') as any;

function makeLoadWeave(loomRoot: string) {
    return async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' not found`);
        return w;
    };
}

function makeRunEvent(root: string) {
    return (weaveId: string, event: any) =>
        runEvent(weaveId, event, { loadWeave: makeLoadWeave(root), saveWeave, loomRoot: root });
}

suite('completeStep Command (Extension Host)', () => {
    setup(() => {
        cleanWeaves();
    });

    test('completeStep marks step done in file', async () => {
        const weaveId = 'cmd-test-1';
        const { planId } = seedWeave(weaveId, 'implementing', 2);

        const loomRoot = WORKSPACE_ROOT;
        const result = await completeStep(
            { planId, step: 1 },
            { loadWeave: makeLoadWeave(loomRoot), runEvent: makeRunEvent(loomRoot), loomRoot }
        );

        assert.strictEqual(result.plan.steps[0].done, true, 'Step 1 must be marked done');
        assert.strictEqual(result.autoCompleted, false, 'Plan must not auto-complete after step 1 of 2');

        // Verify the file on disk reflects the change
        const planPath = path.join(WORKSPACE_ROOT, 'weaves', weaveId, 'plans', `${planId}.md`);
        assert.ok(fileExists(planPath), 'Plan file must still exist');
        const content = fs.readFileSync(planPath, 'utf8');
        assert.ok(content.includes('✅'), 'Plan file must contain a done step marker');
    });

    test('completing all steps sets autoCompleted=true and plan status=done', async () => {
        const weaveId = 'cmd-test-2';
        const { planId } = seedWeave(weaveId, 'implementing', 1);

        const loomRoot = WORKSPACE_ROOT;
        const result = await completeStep(
            { planId, step: 1 },
            { loadWeave: makeLoadWeave(loomRoot), runEvent: makeRunEvent(loomRoot), loomRoot }
        );

        assert.strictEqual(result.autoCompleted, true, 'Single-step plan must auto-complete');
        assert.strictEqual(result.plan.status, 'done', 'Plan status must be "done"');

        // completeStep does NOT move the file — that is closePlan's job.
        // The file stays in plans/ but is updated with status: done and ✅ step.
        const planPath = path.join(WORKSPACE_ROOT, 'weaves', weaveId, 'plans', `${planId}.md`);
        assert.ok(fileExists(planPath), 'Plan file must still be in plans/ after auto-complete');
        const content = fs.readFileSync(planPath, 'utf8');
        assert.ok(content.includes('status: done'), 'Plan file must have status: done');
        assert.ok(content.includes('✅'), 'Plan file must show all steps done');
    });
});
