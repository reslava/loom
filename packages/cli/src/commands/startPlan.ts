import chalk from 'chalk';
import { runEvent } from '../../../app/dist/runEvent';
import { loadWeave} from '../../../fs/dist';
import { saveDocs } from '../../../fs/dist';
import { getActiveLoomRoot, resolveWeaveSlugForPlan } from '../../../fs/dist';
import { resolvePlanUlid } from '../planArg';

export async function startPlanCommand(plan: string): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        // CLI edge: resolve the friendly [plan] ref → the plan's canonical id.
        const planUlid = await resolvePlanUlid(plan);
        if (!planUlid) throw new Error(`Could not resolve '${plan}' to a plan.`);
        const weaveSlug = await resolveWeaveSlugForPlan(loomRoot, planUlid);

        const loadWeaveOrThrow = async (root: string, tid: string) => {
            const thread = await loadWeave(root, tid);
            if (!thread) throw new Error(`Thread '${tid}' is empty or does not exist.`);
            return thread;
        };

        const weave = await loadWeaveOrThrow(loomRoot, weaveSlug);
        const planDoc = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === planUlid);

        if (!planDoc) {
            throw new Error(`Plan '${planUlid}' not found in weave '${weaveSlug}'`);
        }

        const runEventWithDeps = (tid: string, evt: any) =>
            runEvent(tid, evt, { loadWeave: loadWeaveOrThrow, saveDocs, loomRoot });

        if (planDoc.status === 'draft') {
            await runEventWithDeps(weaveSlug, { type: 'ACTIVATE_PLAN', planId: planUlid });
            console.log(chalk.gray(`   Plan activated (draft → active)`));
        }

        await runEventWithDeps(weaveSlug, { type: 'START_IMPLEMENTING_PLAN', planId: planUlid });
        console.log(chalk.green(`🧵 START_PLAN applied to '${planUlid}'`));
        console.log(chalk.gray(`   Plan status changed to implementing.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to start plan: ${e.message}`));
        process.exit(1);
    }
}
