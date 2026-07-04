import * as fs from 'fs-extra';
import { loadWeave, saveDoc, saveDocs, loadDoc } from '../../fs/dist';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';
import { weavePlan } from './weavePlan';
import { completeStep } from './completeStep';
import { closePlan } from './closePlan';
import { createThread } from './thread';
import { runEvent } from './runEvent';

/**
 * Quick-ship — record already-done work as exactly one new done plan, in one call.
 *
 * It composes existing primitives only (create plan → start → complete each step →
 * close with a done record) and holds two invariants that keep it simple and honest:
 *   - It ALWAYS produces exactly one new done plan and NEVER touches an existing plan.
 *   - It NEVER implements code. It records work that is *already done*; the caller does
 *     the work (or it was done earlier in the session) before invoking quick-ship.
 * See loom/core-engine/quick-ship-plan.
 */
export interface QuickShipInput {
    weaveSlug: string;
    /** Target an existing thread by its stable th_ ULID. Mutually exclusive with `newThread`. */
    threadUlid?: string;
    /** Mint a new thread to hold the done plan. Mutually exclusive with `threadUlid`. */
    newThread?: { slug: string; title?: string };
    /** The completed work: one line, or a short list (each entry becomes one done step). */
    description: string | string[];
    /** Optional done-doc notes; defaults to a record derived from the descriptions. */
    notes?: string;
}

export interface QuickShipDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    saveDocs: typeof saveDocs;
    loadDoc: typeof loadDoc;
    fs: typeof fs;
    loomRoot: string;
}

export interface QuickShipResult {
    planId: string;
    weaveSlug: string;
    threadUlid: string;
    filePath: string;
    donePath: string;
    stepCount: number;
    createdThread: boolean;
}

/** Normalize description (string | string[]) into a validated non-empty list of step lines. */
function normalizeDescriptions(raw: string | string[]): string[] {
    const list = Array.isArray(raw) ? raw : [raw];
    const cleaned = list
        .map(d => (typeof d === 'string' ? d.trim() : ''))
        .filter(d => d !== '');
    if (cleaned.length === 0) {
        throw new Error(
            'loom_quick_ship: `description` must be a non-empty string or a non-empty array of non-empty strings.',
        );
    }
    return cleaned;
}

export async function quickShip(
    input: QuickShipInput,
    deps: QuickShipDeps,
): Promise<QuickShipResult> {
    // Target selection: exactly one of an existing threadUlid or a newThread to mint.
    const hasThreadUlid = typeof input.threadUlid === 'string' && input.threadUlid.trim() !== '';
    const hasNewThread =
        !!input.newThread && typeof input.newThread.slug === 'string' && input.newThread.slug.trim() !== '';
    if (hasThreadUlid === hasNewThread) {
        throw new Error(
            'loom_quick_ship: pass exactly one of `thread_ulid` (existing thread) or `newThread` (mint a thread).',
        );
    }

    const descriptions = normalizeDescriptions(input.description);

    // createThread keys on getActiveLoomRoot(); quick-ship runs against a fixed root.
    const getActiveLoomRoot = () => deps.loomRoot;
    let createdThread = false;
    // Downstream create use-cases reference the thread by its stable th_ ULID.
    // A minted thread yields its ULID; an existing target is passed by ULID.
    let threadUlid: string;

    if (hasNewThread) {
        const slug = input.newThread!.slug.trim();
        const { id } = await createThread(
            { weaveSlug: input.weaveSlug, threadSlug: slug, title: input.newThread!.title },
            { getActiveLoomRoot, saveDoc: deps.saveDoc, fs: deps.fs },
        );
        threadUlid = id;
        createdThread = true;
    } else {
        threadUlid = input.threadUlid!.trim();
    }

    // 1. Create the plan — steps = the descriptions (born status "active").
    const goal =
        descriptions.length === 1
            ? descriptions[0]
            : `Quick-ship record of ${descriptions.length} completed changes.`;
    const { id: planId, filePath } = await weavePlan(
        {
            weaveSlug: input.weaveSlug,
            threadUlid: threadUlid,
            goal,
            steps: descriptions.map(d => ({ description: d })),
        },
        {
            loadWeave: deps.loadWeave,
            saveDoc: deps.saveDoc,
            loadDoc: deps.loadDoc,
            fs: deps.fs,
            loomRoot: deps.loomRoot,
        },
    );

    // 2. Start the plan (active → implementing) so its steps can be completed.
    await runEvent(input.weaveSlug, { type: 'START_IMPLEMENTING_PLAN', planId } as any, {
        loadWeave: deps.loadWeave,
        saveDocs: deps.saveDocs,
        loomRoot: deps.loomRoot,
    });

    // 3. Complete every step. Completing the last step auto-finishes the plan (→ done).
    const boundRunEvent = (weaveId: string, event: WorkflowEvent) =>
        runEvent(weaveId, event, {
            loadWeave: deps.loadWeave,
            saveDocs: deps.saveDocs,
            loomRoot: deps.loomRoot,
        });
    for (let step = 1; step <= descriptions.length; step++) {
        await completeStep(
            { planUlid: planId, step },
            { loadWeave: deps.loadWeave, runEvent: boundRunEvent, loomRoot: deps.loomRoot },
        );
    }

    // 4. Write the done record (closePlan also runs FINISH_PLAN if not already auto-finished).
    const notes =
        input.notes && input.notes.trim()
            ? input.notes.trim()
            : `Quick-shipped — recorded already-completed work:\n\n` +
              descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n');
    const { donePath } = await closePlan(
        { planUlid: planId, notes },
        { loadWeave: deps.loadWeave, saveDoc: deps.saveDoc, fs: deps.fs, loomRoot: deps.loomRoot },
    );

    return {
        planId,
        weaveSlug: input.weaveSlug,
        threadUlid: threadUlid,
        filePath,
        donePath,
        stepCount: descriptions.length,
        createdThread,
    };
}
