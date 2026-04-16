import { IdeaDoc } from '../entities/idea';
import { IdeaEvent } from '../events/ideaEvents';

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

export function ideaReducer(doc: IdeaDoc, event: IdeaEvent): IdeaDoc {
    const updated = today();

    switch (event.type) {
        case 'ACTIVATE_IDEA':
            assertStatus(doc.status, ['draft'], 'ACTIVATE_IDEA');
            return { ...doc, status: 'active', updated };

        case 'COMPLETE_IDEA':
            assertStatus(doc.status, ['active'], 'COMPLETE_IDEA');
            return { ...doc, status: 'done', updated };

        case 'CANCEL_IDEA':
            assertStatus(doc.status, ['draft', 'active'], 'CANCEL_IDEA');
            return { ...doc, status: 'cancelled', updated };

        default: {
            const _exhaustive: never = event;
            throw new Error(`Unknown event type: ${(event as any).type}`);
        }
    }
}