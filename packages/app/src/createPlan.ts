import * as fs from 'fs-extra';
import * as path from 'path';
import { loadWeave } from '../../fs/dist';
import { saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, generatePlanId } from '../../core/dist/idUtils';
import { nextOrdinal, planFileName } from '../../core/dist/docNaming';
import { createBaseFrontmatter } from '../../core/dist/frontmatterUtils';
import { PlanDoc, DesignDoc, IdeaDoc, PlanStep, serializePlanBody, slugifyStepId, resolveBlockedByIds } from '../../core/dist';
import { lockedReqVersion } from './req';
import { resolveThreadFolder } from './utils/resolveThreadFolder';

/** One structured step as supplied to create a plan. `title`/`detail` seed the body
 *  view (`### Step N` sections) but are not persisted to frontmatter (body owns prose). */
export interface PlanStepInput {
    description: string;
    title?: string;
    files?: string[];
    blockedBy?: string[];
    satisfies?: string[];
    detail?: string;
}

export interface CreatePlanInput {
    weaveSlug: string;
    title?: string;
    goal?: string;
    /** Structured ordered steps. The plan is born frontmatter-native (Loom owns the table).
     *  Typed `| string` because a malformed agent tool-call can deliver the array
     *  JSON-encoded; {@link coerceSteps} parses/validates it at the use-case boundary. */
    steps?: PlanStepInput[] | string;
    parentUlid?: string;
    threadUlid?: string;
}

export interface CreatePlanDeps {
    loadWeave: (loomRoot: string, weaveSlug: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fs;
    loomRoot: string;
}

/**
 * The current version (and id) of a thread's design doc — a plan's `design_version`
 * staleness baseline. Returns undefined when the thread has no design (a weave-root
 * plan, or a plan minted before a design exists), so callers fall back to the floor.
 *
 * Mirrors {@link lockedReqVersion}: a downstream creator reads the LIVE parent version
 * at write time instead of hardcoding a constant. Stamping a constant `1` is the bug
 * this exists to prevent — every plan would be born "stale" against a design long past v1.
 */
export async function parentDesignVersion(
    threadPath: string,
    threadSlug: string,
    deps: { loadDoc: typeof loadDoc; fs: typeof fs },
): Promise<{ version: number; id: string } | undefined> {
    // Dual-read: canonical design.md first, legacy {threadSlug}-design.md second.
    const designPath = [path.join(threadPath, 'design.md'), path.join(threadPath, `${threadSlug}-design.md`)]
        .find(p => fs.existsSync(p));
    if (!designPath) return undefined;
    const design = (await deps.loadDoc(designPath)) as DesignDoc;
    return { version: design.version, id: design.id };
}

/**
 * The current version (and id) of a thread's idea doc — a design's `idea_version`
 * staleness baseline. Returns undefined when the thread has no idea. Sibling of
 * {@link parentDesignVersion}, one level up the chain (design <- idea).
 */
export async function parentIdeaVersion(
    threadPath: string,
    threadSlug: string,
    deps: { loadDoc: typeof loadDoc; fs: typeof fs },
): Promise<{ version: number; id: string } | undefined> {
    // Dual-read: canonical idea.md first, legacy {threadSlug}-idea.md second.
    const ideaPath = [path.join(threadPath, 'idea.md'), path.join(threadPath, `${threadSlug}-idea.md`)]
        .find(p => fs.existsSync(p));
    if (!ideaPath) return undefined;
    const idea = (await deps.loadDoc(ideaPath)) as IdeaDoc;
    return { version: idea.version, id: idea.id };
}

/**
 * Tool-call wire markers that must never appear in a plan's `goal`/`title`.
 * When an agent emits a malformed tool call, the harness can shove the raw
 * function-call XML (e.g. `</goal>`, `<parameter name="steps">…`) into a string
 * argument; serialized verbatim it corrupts the plan body. Their presence is a
 * positive signal of a malformed call, never legitimate prose.
 */
const WIRE_MARKER = /<\/?(?:antml:)?(?:goal|parameter|invoke|function_calls)\b/i;

/** Throw if a free-text plan field carries tool-call wire markers (malformed call). */
function assertNoWireLeak(field: string, value: string | undefined): void {
    if (value && WIRE_MARKER.test(value)) {
        throw new Error(
            `loom_create_plan: "${field}" contains tool-call wire markers ` +
            `(e.g. </goal>, <parameter …>). The call was malformed and would corrupt ` +
            `the plan — re-issue it with clean field values and a structured "steps" array.`
        );
    }
}

/**
 * Normalize the `steps` argument at the use-case boundary into a validated array.
 * A malformed agent call can deliver `steps` JSON-encoded as a string (cast
 * `as any[]` at the tool layer hides it); coerce a string via JSON.parse, then
 * hard-reject anything that is not an array of step objects with a non-empty
 * `description`. Never silently degrade a non-empty input to `[]`.
 */
function coerceSteps(raw: PlanStepInput[] | string | undefined): PlanStepInput[] {
    if (raw === undefined || raw === null) return [];
    let steps: unknown = raw;
    if (typeof steps === 'string') {
        const trimmed = steps.trim();
        if (trimmed === '') return [];
        try {
            steps = JSON.parse(trimmed);
        } catch (e) {
            throw new Error(
                `loom_create_plan: "steps" arrived as an unparseable string, not an array ` +
                `(JSON parse failed: ${(e as Error).message}). Pass steps as a structured array.`
            );
        }
    }
    if (!Array.isArray(steps)) {
        throw new Error(`loom_create_plan: "steps" must be an array of step objects, got ${typeof steps}.`);
    }
    steps.forEach((s, i) => {
        if (typeof s !== 'object' || s === null || Array.isArray(s)) {
            throw new Error(
                `loom_create_plan: step ${i + 1} is not an object ` +
                `(got ${Array.isArray(s) ? 'array' : typeof s}).`
            );
        }
        const desc = (s as { description?: unknown }).description;
        if (typeof desc !== 'string' || desc.trim() === '') {
            throw new Error(`loom_create_plan: step ${i + 1} is missing a non-empty "description".`);
        }
    });
    return steps as PlanStepInput[];
}

/** Build canonical PlanSteps from structured create input (born frontmatter-native). */
function buildStructuredSteps(stepsInput: PlanStepInput[]): PlanStep[] {
    const taken = new Set<string>();
    // Pass 1: assign every step's stable id by order — blockedBy resolves against these.
    const withIds = stepsInput.map((s, i) => {
        const description = s.description ?? '';
        const title = (s.title && s.title.trim()) ? s.title.trim() : description;
        return { s, order: i + 1, description, title, id: slugifyStepId(title || description, taken) };
    });
    const orderedStepIds = withIds.map(w => w.id);
    // Pass 2: build steps, normalizing each blockedBy to stable slug ids (ordinals → the
    // id at that position; slugs / plan-ids pass through; out-of-range throws; self-block
    // rejected). Persisting ids (never ordinals) keeps the graph reorder-safe.
    return withIds.map(({ s, order, description, title, id }) => ({
        id,
        order,
        status: 'pending' as const,
        title,
        description,
        files_touched: s.files ?? [],
        blockedBy: resolveBlockedByIds(s.blockedBy, orderedStepIds, id),
        satisfies: s.satisfies ?? [],
        ...(s.detail && s.detail.trim() ? { detail: s.detail } : {}),
    }));
}

export async function createPlan(
    input: CreatePlanInput,
    deps: CreatePlanDeps
): Promise<{ id: string; filePath: string }> {
    // Validate the agent's input at the use-case boundary so every delivery layer
    // (CLI, MCP, extension) inherits the guard: reject wire-marker body leaks and
    // coerce/validate steps. A corrupt plan must error, never persist + return success.
    assertNoWireLeak('goal', input.goal);
    assertNoWireLeak('title', input.title);
    const steps = coerceSteps(input.steps);

    // Invariant: every doc lives in a thread, referenced by its stable th_ ULID.
    // Weave-root plan creation is retired — a thread_ulid is required.
    if (!input.threadUlid) {
        throw new Error('Cannot create a plan: a thread_ulid is required. Create the thread first (createThread) and pass its returned thread_ulid.');
    }

    {
        // Resolve the thread by its stable ULID → folder (never fabricates). Path
        // helpers below stay slug-based; resolution lives here at the boundary.
        const { threadSlug, threadPath } = await resolveThreadFolder(input.weaveSlug, input.threadUlid, {
            getActiveLoomRoot: () => deps.loomRoot,
            loadDoc: deps.loadDoc,
            fs: deps.fs,
        });
        const plansDir = path.join(threadPath, 'plans');
        await deps.fs.ensureDir(plansDir);

        // Canonical flat plan filename: plan-NNN.md (thread-local ordinal, gaps preserved).
        // nextOrdinal recognises both new (plan-NNN.md) and legacy ({threadSlug}-plan-NNN.md) names.
        const existingFiles = await deps.fs.readdir(plansDir).catch(() => [] as string[]);

        const planTitle = input.title || `${threadSlug} Plan`;
        const planFilename = planFileName(nextOrdinal(existingFiles, 'plan'));
        const planId = generateDocId('plan');

        // Read the thread design once: it supplies both the parent link (when not
        // given explicitly) and the design_version staleness baseline. Reading the
        // LIVE version here is the fix — a plan must be born current against its design,
        // never stamped a constant 1 (which made every plan a false-positive stale).
        const design = await parentDesignVersion(threadPath, threadSlug, { loadDoc: deps.loadDoc, fs: deps.fs });
        const parentId: string | null = input.parentUlid ?? design?.id ?? null;

        const planSteps: PlanStep[] = buildStructuredSteps(steps);
        const body = serializePlanBody(planSteps, { goal: input.goal });
        const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, parentId);
        // Stamp the locked req version this plan was built against (req-staleness baseline).
        const reqV = await lockedReqVersion(deps.loomRoot, input.weaveSlug, threadSlug, { loadDoc: deps.loadDoc, fs: deps.fs });
        const doc: PlanDoc = {
            ...baseFrontmatter,
            type: 'plan',
            status: 'active',
            design_version: design?.version ?? 1,
            target_version: '0.1.0',
            steps: planSteps,
            content: body,
            ...(reqV !== undefined ? { req_version: reqV } : {}),
        } as PlanDoc;
        // Plans are born frontmatter-native so the saver persists the steps block.
        (doc as any)._stepsFromFrontmatter = true;

        const filePath = path.join(plansDir, planFilename);
        await deps.saveDoc(doc, filePath);
        return { id: planId, filePath };
    }
}
