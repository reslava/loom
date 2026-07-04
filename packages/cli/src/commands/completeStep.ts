import chalk from 'chalk';
import { completeStep } from '../../../app/dist/completeStep';
import { loadWeave} from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';
import { saveDocs } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';

export async function completeStepCommand(planId: string, options: { step?: string }): Promise<void> {
    try {
        const step = options.step ? parseInt(options.step, 10) : undefined;
        if (step === undefined || isNaN(step)) {
            throw new Error('Step number is required. Use --step <n>');
        }

        const loomRoot = getActiveLoomRoot();
        
        // Wrapper that handles null thread
        const loadWeaveOrThrow = async (root: string, tid: string) => {
            const thread = await loadWeave(root, tid);
            if (!thread) throw new Error(`Thread '${tid}' is empty or does not exist.`);
            return thread;
        };

        const runEventBound = (tid: string, evt: any) =>
            runEvent(tid, evt, { loadWeave: loadWeaveOrThrow, saveDocs, loomRoot });

        const result = await completeStep(
            { planUlid: planId, step },
            { loadWeave: loadWeaveOrThrow, runEvent: runEventBound, loomRoot }
        );

        console.log(chalk.green(`✅ Step ${step} completed in '${planId}'`));
        if (result.autoCompleted) {
            console.log(chalk.green(`🎉 All steps completed! Plan '${planId}' is now done.`));
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