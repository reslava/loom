import chalk from 'chalk';
import { status } from '../../../app/dist/status';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import { loadThread } from '../../../fs/dist/loadThread';
import { buildLinkIndex } from '../../../fs/dist/buildLinkIndex';
import * as fs from 'fs-extra';

function colorStatus(status: string): string {
    switch (status) {
        case 'DONE': return chalk.green(status);
        case 'IMPLEMENTING': return chalk.blue(status);
        case 'ACTIVE': return chalk.yellow(status);
        case 'CANCELLED': return chalk.red(status);
        default: return status;
    }
}

export async function statusCommand(
    threadId?: string,
    options?: { verbose?: boolean; json?: boolean; tokens?: boolean }
): Promise<void> {
    try {
        const result = await status(
            { threadId, verbose: options?.verbose, json: options?.json, tokens: options?.tokens },
            { getActiveLoomRoot, loadThread, buildLinkIndex, fs }
        );

        if (result.single) {
            const r = result.single;
            if (options?.json) {
                console.log(JSON.stringify(r, null, 2));
                return;
            }

            console.log(chalk.bold(`\n🧵 Thread: ${r.id}`));
            console.log(`   Status: ${colorStatus(r.status)}`);
            console.log(`   Phase:  ${r.phase}`);
            console.log(`   Design: ${r.designTitle} (v${r.designVersion})`);
            console.log(`   Plans:  ${r.planCount} (${r.plansDone} done)`);

            if (r.activePlan && options?.verbose) {
                const p = r.activePlan;
                console.log(`\n📋 Active Plan: ${p.id}`);
                console.log(`   Status: ${p.status}`);
                console.log(`   Progress: ${p.stepsDone}/${p.stepsTotal} steps done\n`);
                console.log('   Steps:');
                for (const step of p.steps) {
                    let symbol: string;
                    if (step.done) symbol = '✅';
                    else if (step.isBlocked) symbol = '🔒';
                    else symbol = '🔳';
                    console.log(`   ${symbol} ${step.order}. ${step.description}`);
                    if (step.isBlocked) {
                        console.log(`      ⚠️ Blocked by: ${step.blockedBy.join(', ')}`);
                    }
                }
                if (p.nextStep) {
                    console.log(chalk.gray(`\n   💡 Next step: Step ${p.nextStep.order} — ${p.nextStep.description}`));
                }
            }

            if (r.activePlan && !options?.verbose && r.activePlan.nextStep) {
                console.log(chalk.gray(`\n   💡 Next step: Step ${r.activePlan.nextStep.order} — ${r.activePlan.nextStep.description}`));
            }
            return;
        }

        if (result.list) {
            if (options?.json) {
                console.log(JSON.stringify(result.list, null, 2));
                return;
            }
            if (result.list.length === 0) {
                console.log(chalk.yellow('No threads found.'));
                return;
            }
            console.log(chalk.bold('\n🧵 Threads\n'));
            for (const t of result.list) {
                console.log(`  ${t.id.padEnd(25)} ${colorStatus(t.status)}`);
            }
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}