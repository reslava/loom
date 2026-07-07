import chalk from 'chalk';
import { completeStep } from '../../../app/dist/completeStep';
import { loadWeave} from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';
import { saveDocs } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';
import { resolvePlanUlid } from '../planArg';

export async function completeStepCommand(plan: string, options: { step?: string }): Promise<void> {
    try {
        const step = options.step ? parseInt(options.step, 10) : undefined;
        if (step === undefined || isNaN(step)) {
            throw new Error('Step number is required. Use --step <n>');
        }

        const loomRoot = getActiveLoomRoot();
        // CLI edge: resolve the friendly <plan> ref → the plan's canonical id.
        const planUlid = await resolvePlanUlid(plan);
        if (!planUlid) throw new Error(`Could not resolve '${plan}' to a plan.`);

        // Wrapper that handles null thread
        const loadWeaveOrThrow = async (root: string, tid: string) => {
            const thread = await loadWeave(root, tid);
            if (!thread) throw new Error(`Thread '${tid}' is empty or does not exist.`);
            return thread;
        };

        const runEventBound = (tid: string, evt: any) =>
            runEvent(tid, evt, { loadWeave: loadWeaveOrThrow, saveDocs, loomRoot });

        const result = await completeStep(
            { planUlid, step },
            { loadWeave: loadWeaveOrThrow, runEvent: runEventBound, loomRoot }
        );

        console.log(chalk.green(`✅ Step ${step} completed in '${planUlid}'`));
        if (result.autoCompleted) {
            console.log(chalk.green(`🎉 All steps completed! Plan '${planUlid}' is now done.`));
        } else {
            const nextStep = result.plan.steps.find(s => s.status !== 'done' && s.status !== 'cancelled');
            if (nextStep) {
                console.log(chalk.gray(`   Next step: Step ${nextStep.order} — ${nextStep.description}`));
            }
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to complete step: ${e.message}`));
        process.exit(1);
    }
}