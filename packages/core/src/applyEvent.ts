import { Weave } from './entities/weave';
import { Thread } from './entities/thread';
import { WorkflowEvent } from './events/workflowEvent';
import { IdeaDoc } from './entities/idea';
import { DesignDoc } from './entities/design';
import { PlanDoc } from './entities/plan';
import { DoneDoc } from './entities/done';
import { ChatDoc } from './entities/chat';
import { Document } from './entities/document';
import { designReducer } from './reducers/designReducer';
import { planReducer } from './reducers/planReducer';

export function applyEvent(weave: Weave, event: WorkflowEvent): Weave {
    const updatedDocs = [...weave.allDocs];
    let designUpdated = false;
    let updatedDesignId: string | null = null;
    let newDesignVersion: number | null = null;

    for (let i = 0; i < updatedDocs.length; i++) {
        const doc = updatedDocs[i];

        if (doc.type === 'design') {
            const designDoc = doc as DesignDoc;
            if (event.type === 'REFINE_DESIGN') {
                const updated = designReducer(designDoc, event);
                updatedDocs[i] = updated;
                designUpdated = true;
                updatedDesignId = designDoc.id;
                newDesignVersion = updated.version;
            } else if (
                ['ACTIVATE_DESIGN', 'CLOSE_DESIGN', 'REOPEN_DESIGN', 'FINALISE_DESIGN', 'CANCEL_DESIGN'].includes(event.type)
            ) {
                updatedDocs[i] = designReducer(designDoc, event as any);
            }
        }

        if (doc.type === 'plan') {
            const planDoc = doc as PlanDoc;
            const eventPlanId = (event as any).planId;
            if (eventPlanId && planDoc.id !== eventPlanId) continue;

            if (
                ['ACTIVATE_PLAN', 'START_IMPLEMENTING_PLAN', 'COMPLETE_STEP', 'FINISH_PLAN', 'BLOCK_PLAN', 'UNBLOCK_PLAN', 'CANCEL_PLAN'].includes(event.type)
            ) {
                updatedDocs[i] = planReducer(planDoc, event as any);
            }
        }
    }

    // Mark child plans stale if their parent design was refined
    if (designUpdated && updatedDesignId && newDesignVersion) {
        for (let i = 0; i < updatedDocs.length; i++) {
            const doc = updatedDocs[i];
            if (doc.type === 'plan') {
                const planDoc = doc as PlanDoc;
                if (planDoc.parent_id === updatedDesignId) {
                    updatedDocs[i] = {
                        ...planDoc,
                        staled: true,
                        updated: new Date().toISOString().split('T')[0],
                    };
                }
            }
        }
    }

    const updatedById = new Map<string, Document>(updatedDocs.map(d => [d.id, d]));

    const updatedThreads: Thread[] = weave.threads.map(thread => ({
        ...thread,
        idea: thread.idea ? updatedById.get(thread.idea.id) as IdeaDoc | undefined : undefined,
        design: thread.design ? updatedById.get(thread.design.id) as DesignDoc | undefined : undefined,
        plans: thread.plans.map(p => (updatedById.get(p.id) as PlanDoc) ?? p),
        dones: thread.dones.map(d => (updatedById.get(d.id) as DoneDoc) ?? d),
        chats: thread.chats.map(c => (updatedById.get(c.id) as ChatDoc) ?? c),
        allDocs: thread.allDocs.map(d => updatedById.get(d.id) ?? d),
    }));

    return {
        id: weave.id,
        threads: updatedThreads,
        looseFibers: weave.looseFibers.map(f => updatedById.get(f.id) ?? f),
        chats: weave.chats.map(c => (updatedById.get(c.id) as ChatDoc) ?? c),
        refDocs: weave.refDocs,
        allDocs: updatedDocs,
    };
}
