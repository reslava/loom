import { assert } from './test-utils.ts';
import { parseReq, checkReqCoverage, isReqSatisfied } from '../packages/core/dist/index.js';

function step(order: number, satisfies: string[]): any {
    return { order, description: `step ${order}`, status: 'pending', files_touched: [], blockedBy: [], satisfies };
}

const REQ = parseReq([
    '### ✅ Included',
    '- `IN1` Registration.',
    '- `IN2` Login.',
    '### ❌ Excluded',
    '- `EX1` Social login.',
    '### ⛓ Constraints',
    '- `C1` TypeScript only.',
].join('\n'));

async function run() {
    console.log('🔁 Running req-coverage tests...\n');

    // ── fully covered, no violations → satisfied ──
    console.log('  • every Included cited, no excluded → satisfied...');
    {
        const cov = checkReqCoverage(REQ, [step(1, ['IN1', 'C1']), step(2, ['IN2'])]);
        assert(cov.uncovered.length === 0, 'nothing uncovered');
        assert(cov.excludedViolations.length === 0, 'no excluded violations');
        assert(cov.unknownCitations.length === 0, 'no unknown citations');
        assert(isReqSatisfied(cov) === true, 'coverage is satisfied');
        console.log('    ✅ satisfied; constraint citation allowed and not "uncovered"');
    }

    // ── an Included with no covering step → uncovered ──
    console.log('  • dropped Included → uncovered...');
    {
        const cov = checkReqCoverage(REQ, [step(1, ['IN1'])]);
        assert(cov.uncovered.length === 1 && cov.uncovered[0].id === 'IN2', 'IN2 must be uncovered');
        assert(isReqSatisfied(cov) === false, 'not satisfied when an Included is dropped');
        console.log('    ✅ IN2 flagged uncovered');
    }

    // ── a step citing an Excluded id → violation ──
    console.log('  • citing an Excluded id → violation...');
    {
        const cov = checkReqCoverage(REQ, [step(1, ['IN1']), step(2, ['IN2', 'EX1'])]);
        assert(cov.excludedViolations.length === 1, 'one excluded violation');
        assert(cov.excludedViolations[0].id === 'EX1' && cov.excludedViolations[0].stepOrder === 2, 'EX1 cited by step 2');
        assert(isReqSatisfied(cov) === false, 'not satisfied with an excluded violation');
        console.log('    ✅ EX1 citation flagged on step 2');
    }

    // ── a dangling citation → unknown ──
    console.log('  • citing an unknown id → unknownCitations...');
    {
        const cov = checkReqCoverage(REQ, [step(1, ['IN1', 'IN2', 'IN9'])]);
        assert(cov.unknownCitations.length === 1 && cov.unknownCitations[0].id === 'IN9', 'IN9 is an unknown citation');
        assert(isReqSatisfied(cov) === false, 'not satisfied with a dangling citation');
        console.log('    ✅ IN9 flagged unknown');
    }

    console.log('\n✅ req-coverage tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
