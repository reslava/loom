import { loadWeave } from '../../fs/dist';
import { applyEvent } from '../../core/dist/applyEvent';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';
import { Weave } from '../../core/dist/entities/weave';

export interface RunEventDeps {
    loadWeave: (loomRoot: string, weaveSlug: string) => Promise<Weave>;
    /**
     * Persist only the documents whose ids are in `docIds`. Wired to fs `saveDocs`
     * so a single workflow event rewrites exactly the docs it changed — never the
     * whole weave. See loom/core-engine/event-save-scope.
     */
    saveDocs: (loomRoot: string, weave: Weave, docIds: string[]) => Promise<void>;
    loomRoot: string;
}

export async function runEvent(
    weaveSlug: string,
    event: WorkflowEvent,
    deps: RunEventDeps
): Promise<Weave> {
    const weave = await deps.loadWeave(deps.loomRoot, weaveSlug);
    const { weave: updatedWeave, changed } = applyEvent(weave, event);
    await deps.saveDocs(deps.loomRoot, updatedWeave, changed);
    return updatedWeave;
}