import * as fs from 'fs-extra';
import * as path from 'path';
import { loadWeave } from '../../fs/dist';
import { saveDoc, loadDoc } from '../../fs/dist';
import { generateDocId, generatePlanId } from '../../core/dist/idUtils';
import { createBaseFrontmatter } from '../../core/dist/frontmatterUtils';
import { PlanDoc, DesignDoc, PlanStep, serializePlanBody, slugifyStepId } from '../../core/dist';
import { lockedReqVersion } from './req';
import { ensureThreadManifest } from './thread';

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

export interface WeavePlanInput {
    weaveId: string;
    title?: string;
    goal?: string;
    /** Structured ordered steps. The plan is born frontmatter-native (Loom owns the table).
     *  Typed `| string` because a malformed agent tool-call can deliver the array
     *  JSON-encoded; {@link coerceSteps} parses/validates it at the use-case boundary. */
    steps?: PlanStepInput[] | string;
    parentId?: string;
    threadId?: string;
}

export interface WeavePlanDeps {
    loadWeave: (loomRoot: string, weaveId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    loadDoc: typeof loadDoc;
    fs: typeof fs;
    loomRoot: string;
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
    return stepsInput.map((s, i) => {
        const description = s.description ?? '';
        const title = (s.title && s.title.trim()) ? s.title.trim() : description;
        return {
            id: slugifyStepId(title || description, taken),
            order: i + 1,
            status: 'pending' as const,
            title,
            description,
            files_touched: s.files ?? [],
            blockedBy: s.blockedBy ?? [],
            satisfies: s.satisfies ?? [],
            ...(s.detail && s.detail.trim() ? { detail: s.detail } : {}),
        };
    });
}

export async function weavePlan(
    input: WeavePlanInput,
    deps: WeavePlanDeps
): Promise<{ id: string; filePath: string }> {
    // Validate the agent's input at the use-case boundary so every delivery layer
    // (CLI, MCP, extension) inherits the guard: reject wire-marker body leaks and
    // coerce/validate steps. A corrupt plan must error, never persist + return success.
    assertNoWireLeak('goal', input.goal);
    assertNoWireLeak('title', input.title);
    const steps = coerceSteps(input.steps);

    const weavePath = path.join(deps.loomRoot, 'loom', input.weaveId);

    if (input.threadId) {
        const threadPath = path.join(weavePath, input.threadId);
        const plansDir = path.join(threadPath, 'plans');
        await deps.fs.ensureDir(plansDir);

        // Filename uses thread-scoped counter: {threadId}-plan-NNN
        const existingFiles = await deps.fs.readdir(plansDir).catch(() => [] as string[]);
        const existingPlanIds = existingFiles
            .filter(f => f.endsWith('.md'))
            .map(f => f.replace(/\.md$/, ''));

        const planTitle = input.title || `${input.threadId} Plan`;
        const planFilename = generatePlanId(input.threadId, existingPlanIds);
        const planId = generateDocId('plan');

        // Resolve parent from the design's actual frontmatter id (not a convention string).
        let parentId: string | null = input.parentId ?? null;
        if (!parentId) {
            const designPath = path.join(threadPath, `${input.threadId}-design.md`);
            if (await deps.fs.pathExists(designPath).catch(() => false)) {
                const design = await deps.loadDoc(designPath) as DesignDoc;
                parentId = design.id;
            }
        }

        const planSteps: PlanStep[] = buildStructuredSteps(steps);
        const body = serializePlanBody(planSteps, { goal: input.goal });
        const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, parentId);
        // Stamp the locked req version this plan was built against (req-staleness baseline).
        const reqV = await lockedReqVersion(deps.loomRoot, input.weaveId, input.threadId, { loadDoc: deps.loadDoc, fs: deps.fs });
        const doc: PlanDoc = {
            ...baseFrontmatter,
            type: 'plan',
            status: 'active',
            design_version: 1,
            target_version: '0.1.0',
            steps: planSteps,
            content: body,
            ...(reqV !== undefined ? { req_version: reqV } : {}),
        } as PlanDoc;
        // Plans are born frontmatter-native so the saver persists the steps block.
        (doc as any)._stepsFromFrontmatter = true;

        const filePath = path.join(plansDir, `${planFilename}.md`);
        await deps.saveDoc(doc, filePath);
        // Auto-scaffold the thread manifest (first-create seam) so the thread is on the roadmap.
        await ensureThreadManifest(input.weaveId, input.threadId, planTitle, {
            getActiveLoomRoot: () => deps.loomRoot,
            saveDoc: deps.saveDoc,
            fs: deps.fs,
        });
        return { id: planId, filePath };
    }

    await deps.fs.ensureDir(weavePath);
    let weave = await deps.loadWeave(deps.loomRoot, input.weaveId);
    if (!weave) {
        weave = { id: input.weaveId, threads: [], looseFibers: [], chats: [], allDocs: [] };
    }

    const planTitle = input.title || `${input.weaveId} Plan`;
    const existingPlanIds = weave.threads.flatMap((t: any) => t.plans.map((p: any) => p.id));
    const planFilename = generatePlanId(input.weaveId, existingPlanIds);
    const planId = generateDocId('plan');

    const planSteps: PlanStep[] = buildStructuredSteps(steps);
    const body = serializePlanBody(planSteps, { goal: input.goal });
    const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, input.parentId ?? null);
    const doc: PlanDoc = {
        ...baseFrontmatter,
        type: 'plan',
        status: 'draft',
        design_version: 1,
        target_version: '0.1.0',
        steps: planSteps,
        content: body,
    } as PlanDoc;
    (doc as any)._stepsFromFrontmatter = true;

    const plansDir = path.join(weavePath, 'plans');
    await deps.fs.ensureDir(plansDir);
    const filePath = path.join(plansDir, `${planFilename}.md`);
    await deps.saveDoc(doc, filePath);
    return { id: planId, filePath };
}
