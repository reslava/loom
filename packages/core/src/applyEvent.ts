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

/**
 * Result of applying a workflow event to a weave.
 *
 * `changed` is the set of doc ids the event actually mutated. It is collected
 * here, at the orchestrator's reassignment sites — a *semantic* signal of what
 * the event changed, independent of serialisation. Callers (runEvent) persist
 * ONLY these docs, which bounds the save blast radius: a non-idempotent save
 * path can never touch a doc the event did not change. See
 * loom/core-engine/event-save-scope.
 */
export interface ApplyResult {
    weave: Weave;
    changed: string[];
}

export function applyEvent(weave: Weave, event: WorkflowEvent): ApplyResult {
    const updatedDocs = [...weave.allDocs];
    const changed = new Set<string>();
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
                changed.add(designDoc.id);
                designUpdated = true;
                updatedDesignId = designDoc.id;
                newDesignVersion = updated.version;
            } else if (
                ['ACTIVATE_DESIGN', 'CLOSE_DESIGN', 'REOPEN_DESIGN', 'FINALISE_DESIGN', 'CANCEL_DESIGN'].includes(event.type)
            ) {
                updatedDocs[i] = designReducer(designDoc, event as any);
                changed.add(designDoc.id);
            }
        }

        if (doc.type === 'plan') {
            const planDoc = doc as PlanDoc;
            const eventPlanId = (event as any).planId;
            if (eventPlanId && planDoc.id !== eventPlanId) continue;

            if (
                ['ACTIVATE_PLAN', 'START_IMPLEMENTING_PLAN', 'COMPLETE_STEP', 'UPDATE_STEP', 'REORDER_STEPS', 'FINISH_PLAN', 'BLOCK_PLAN', 'UNBLOCK_PLAN', 'CANCEL_PLAN'].includes(event.type)
            ) {
                updatedDocs[i] = planReducer(planDoc, event as any);
                changed.add(planDoc.id);
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
                    changed.add(planDoc.id);
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

    const updatedWeave: Weave = {
        id: weave.id,
        threads: updatedThreads,
        looseFibers: weave.looseFibers.map(f => updatedById.get(f.id) ?? f),
        chats: weave.chats.map(c => (updatedById.get(c.id) as ChatDoc) ?? c),
        refDocs: weave.refDocs,
        allDocs: updatedDocs,
    };

    return { weave: updatedWeave, changed: [...changed] };
}
