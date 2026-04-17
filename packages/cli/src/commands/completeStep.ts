import chalk from 'chalk';
import { completeStep } from '../../../app/dist/completeStep';
import { loadThread, saveThread } from '../../../fs/dist';
import { runEvent } from '../../../app/dist/runEvent';

// Bind dependencies for runEvent
const runEventBound = (threadId: string, event: any) =>
    runEvent(threadId, event, { loadThread, saveThread });

export async function completeStepCommand(planId: string, options: { step?: string }): Promise<void> {
    try {
        const step = options.step ? parseInt(options.step, 10) : undefined;
        if (step === undefined || isNaN(step)) {
            throw new Error('Step number is required. Use --step <n>');
        }

        const result = await completeStep(
            { planId, step },
            { loadThread, runEvent: runEventBound }
        );

        console.log(chalk.green(`✅ Step ${step} completed in '${planId}'`));
        
        if (result.autoCompleted) {
            console.log(chalk.green(`🎉 All steps completed! Plan '${planId}' is now done.`));
        } else {
            const nextStep = result.plan.steps.find(s => !s.done);
            if (nextStep) {
                console.log(chalk.gray(`   Next step: Step ${nextStep.order} — ${nextStep.description}`));
            }
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to complete step: ${e.message}`));
        process.exit(1);
    }
}