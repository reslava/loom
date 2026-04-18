import { PlanDoc } from '../../src/entities/plan';
import { filterPlansByStaleness, filterPlansByTargetVersion, filterPlansWithBlockedSteps } from '../../src/filters/planFilters';

describe('planFilters', () => {
    const mockPlans: PlanDoc[] = [
        { id: 'plan-1', staled: true, target_version: '1.0', steps: [] } as PlanDoc,
        { id: 'plan-2', staled: false, target_version: '2.0', steps: [{ order: 1, done: false, blockedBy: ['step-1'] }] } as PlanDoc,
        { id: 'plan-3', staled: false, target_version: '1.0', steps: [{ order: 1, done: true }] } as PlanDoc,
    ];

    describe('filterPlansByStaleness', () => {
        it('should filter stale plans', () => {
            const result = filterPlansByStaleness(mockPlans, true);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('plan-1');
        });

        it('should filter non-stale plans', () => {
            const result = filterPlansByStaleness(mockPlans, false);
            expect(result).toHaveLength(2);
        });
    });

    describe('filterPlansByTargetVersion', () => {
        it('should filter by target version', () => {
            const result = filterPlansByTargetVersion(mockPlans, '1.0');
            expect(result).toHaveLength(2);
        });
    });

    describe('filterPlansWithBlockedSteps', () => {
        it('should return only plans with blocked steps', () => {
            const result = filterPlansWithBlockedSteps(mockPlans);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('plan-2');
        });
    });
});