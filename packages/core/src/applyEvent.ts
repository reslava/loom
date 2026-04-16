import { Thread, WorkflowEvent, DesignDoc, PlanDoc } from './types';
import { designReducer } from './reducers/designReducer';
import { planReducer } from './reducers/planReducer';

/**
 * Applies a workflow event to a thread, updating documents and handling cross-document effects.
 * This is a pure function that returns a new Thread object.
 */
export function applyEvent(thread: Thread, event: WorkflowEvent): Thread {
    const updatedDocs = [...thread.allDocs];
    let designUpdated = false;
    let newDesignVersion: number | null = null;

    // 1. Apply the event to the appropriate document(s)
    for (let i = 0; i < updatedDocs.length; i++) {
        const doc = updatedDocs[i];

        // Design events
        if (doc.type === 'design') {
            const designDoc = doc as DesignDoc;
            if (event.type === 'REFINE_DESIGN' && designDoc.id === thread.design.id) {
                const updated = designReducer(designDoc, event);
                updatedDocs[i] = updated;
                designUpdated = true;
                newDesignVersion = updated.version;
            } else if (
                ['ACTIVATE_DESIGN', 'CLOSE_DESIGN', 'REOPEN_DESIGN', 'FINALISE_DESIGN', 'CANCEL_DESIGN'].includes(event.type) &&
                designDoc.id === thread.design.id
            ) {
                updatedDocs[i] = designReducer(designDoc, event as any);
            }
        }

        // Plan events
        if (doc.type === 'plan') {
            const planDoc = doc as PlanDoc;
            const eventPlanId = (event as any).planId;                       
            
            if (eventPlanId && planDoc.id !== eventPlanId) {                
                continue;
            }

            if (['ACTIVATE_PLAN', 'START_IMPLEMENTING_PLAN', 'COMPLETE_STEP', 'FINISH_PLAN', 'BLOCK_PLAN', 'UNBLOCK_PLAN', 'CANCEL_PLAN'].includes(event.type)) {                
                updatedDocs[i] = planReducer(planDoc, event as any);
            }
        }
    }

    // 2. Cross-document effects: REFINE_DESIGN marks child plans stale
    if (designUpdated && newDesignVersion) {
        for (let i = 0; i < updatedDocs.length; i++) {
            const doc = updatedDocs[i];
            if (doc.type === 'plan') {
                const planDoc = doc as PlanDoc;
                if (planDoc.parent_id === thread.design.id) {
                    updatedDocs[i] = {
                        ...planDoc,
                        staled: true,
                        updated: new Date().toISOString().split('T')[0],
                    };
                }
            }
        }
    }

    // 3. Rebuild thread from updated documents
    const design = updatedDocs.find(d => d.type === 'design' && d.role === 'primary') as DesignDoc;
    const idea = updatedDocs.find(d => d.type === 'idea');
    const plans = updatedDocs.filter(d => d.type === 'plan') as PlanDoc[];
    const contexts = updatedDocs.filter(d => d.type === 'ctx');
    const supportingDesigns = updatedDocs.filter(d => d.type === 'design' && d.role === 'supporting') as DesignDoc[];

    return {
        ...thread,
        idea: idea as any,
        design,
        supportingDesigns,
        plans,
        contexts: contexts as any,
        allDocs: updatedDocs,
    };
}