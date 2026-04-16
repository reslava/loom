import { PlanDoc, PlanStep } from '../entities/plan';
import { PlanEvent } from '../events/planEvents';

function today(): string {
    return new Date().toISOString().split('T')[0];
}

function assertStatus(current: string, allowed: string[], action: string): void {
    if (!allowed.includes(current)) {
        throw new Error(
            `Invalid transition: ${action} requires status ${allowed.join(' | ')}, got '${current}'`
        );
    }
}

export function planReducer(doc: PlanDoc, event: PlanEvent): PlanDoc {
    const updated = today();

    switch (event.type) {
        case 'CREATE_PLAN':
            return { ...doc, status: 'draft' };

        case 'ACTIVATE_PLAN':
            assertStatus(doc.status, ['draft'], 'ACTIVATE_PLAN');
            return { ...doc, status: 'active', updated };

        case 'START_IMPLEMENTING_PLAN':
            assertStatus(doc.status, ['active'], 'START_IMPLEMENTING_PLAN');
            return { ...doc, status: 'implementing', updated };

        case 'COMPLETE_STEP': {
            assertStatus(doc.status, ['implementing'], 'COMPLETE_STEP');
            const { stepIndex } = event;
            if (stepIndex < 0 || stepIndex >= doc.steps.length) {
                throw new Error(`Invalid step index: ${stepIndex}. Plan has ${doc.steps.length} steps.`);
            }
            const steps = doc.steps.map((step, idx) =>
                idx === stepIndex ? { ...step, done: true } : step
            );
            const allDone = steps.every(s => s.done);
            return {
                ...doc,
                steps,
                status: allDone ? 'done' : doc.status,
                updated,
            };
        }

        case 'FINISH_PLAN':
            assertStatus(doc.status, ['implementing'], 'FINISH_PLAN');
            return { ...doc, status: 'done', updated };

        case 'BLOCK_PLAN':
            assertStatus(doc.status, ['active', 'implementing'], 'BLOCK_PLAN');
            return { ...doc, status: 'blocked', updated };

        case 'UNBLOCK_PLAN':
            assertStatus(doc.status, ['blocked'], 'UNBLOCK_PLAN');
            return { ...doc, status: 'active', updated };

        case 'CANCEL_PLAN':
            assertStatus(doc.status, ['draft', 'active', 'implementing', 'blocked'], 'CANCEL_PLAN');
            return { ...doc, status: 'cancelled', updated };

        default: {
            const _exhaustive: never = event;
            throw new Error(`Unknown event type: ${(event as any).type}`);
        }
    }
}