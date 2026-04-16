import { DesignDoc } from '../entities/design';
import { DesignEvent } from '../events/designEvents';

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

export function designReducer(doc: DesignDoc, event: DesignEvent): DesignDoc {
    const updated = today();

    switch (event.type) {
        case 'CREATE_DESIGN':
            return { ...doc, status: 'draft' };

        case 'ACTIVATE_DESIGN':
            assertStatus(doc.status, ['draft'], 'ACTIVATE_DESIGN');
            return { ...doc, status: 'active', updated };

        case 'CLOSE_DESIGN':
            assertStatus(doc.status, ['active'], 'CLOSE_DESIGN');
            return { ...doc, status: 'closed', updated };

        case 'REOPEN_DESIGN':
            assertStatus(doc.status, ['closed'], 'REOPEN_DESIGN');
            return { ...doc, status: 'active', updated };

        case 'REFINE_DESIGN':
            assertStatus(doc.status, ['active', 'closed', 'done'], 'REFINE_DESIGN');
            return {
                ...doc,
                status: 'active',
                version: doc.version + 1,
                refined: true,
                updated,
            };

        case 'FINALISE_DESIGN':
            assertStatus(doc.status, ['active'], 'FINALISE_DESIGN');
            return { ...doc, status: 'done', updated };

        case 'CANCEL_DESIGN':
            assertStatus(doc.status, ['draft', 'active', 'closed'], 'CANCEL_DESIGN');
            return { ...doc, status: 'cancelled', updated };

        default: {
            const _exhaustive: never = event;
            throw new Error(`Unknown event type: ${(event as any).type}`);
        }
    }
}