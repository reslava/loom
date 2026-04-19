import chalk from 'chalk';
import { getState, GetStateInput } from '../../../app/dist';
import { getActiveLoomRoot, loadThread, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist';
import * as fs from 'fs-extra';
import { Thread } from '../../../core/dist';
import { getThreadStatus, getThreadPhase } from '../../../core/dist';
import { PlanDoc } from '../../../core/dist';
import { LinkIndex } from '../../../core/dist';
import { buildLinkIndex as buildIndex } from '../../../fs/dist';
import { ThreadStatus } from '../../../core/dist';
import { isStepBlocked, findNextStep } from '../../../core/dist';

function colorStatus(status: string): string {
    switch (status) {
        case 'DONE': return chalk.green(status);
        case 'IMPLEMENTING': return chalk.blue(status);
        case 'ACTIVE': return chalk.yellow(status);
        case 'CANCELLED': return chalk.red(status);
        default: return status;
    }
}

function parseFilterFlag(filterStr?: string): GetStateInput['threadFilter'] | undefined {
    if (!filterStr) return undefined;
    
    const filter: GetStateInput['threadFilter'] = {};
    const parts = filterStr.split(',');
    
    for (const part of parts) {
        const [key, value] = part.split('=');
        if (!key || !value) continue;
        
        switch (key.trim()) {
            case 'status':
                filter.status = value.split('|').map(s => s.trim()) as ThreadStatus[];
                break;
            case 'phase':
                filter.phase = value.split('|').map(s => s.trim());
                break;
            case 'id':
                filter.idPattern = value.trim();
                break;
        }
    }
    
    return Object.keys(filter).length > 0 ? filter : undefined;
}

function parseSortFlag(sortStr?: string): GetStateInput['sortBy'] {
    if (!sortStr) return undefined;
    const sortBy = sortStr.split(':')[0].trim();
    return sortBy === 'id' ? 'id' : undefined;
}

function parseSortOrder(sortStr?: string): GetStateInput['sortOrder'] {
    if (!sortStr) return undefined;
    const parts = sortStr.split(':');
    return parts.length > 1 && parts[1].trim() === 'desc' ? 'desc' : 'asc';
}

export async function statusCommand(
    threadId?: string,
    options?: { verbose?: boolean; json?: boolean; tokens?: boolean; filter?: string; sort?: string }
): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        
        const threadFilter = parseFilterFlag(options?.filter);
        const sortBy = parseSortFlag(options?.sort);
        const sortOrder = parseSortOrder(options?.sort);
        
        const state = await getState(
            { getActiveLoomRoot, loadThread, buildLinkIndex, registry, fs },
            { threadFilter, sortBy, sortOrder }
        );

        if (options?.json) {
            console.log(JSON.stringify(state, null, 2));
            return;
        }

        if (threadId) {
            const thread = state.threads.find(t => t.id === threadId);
            if (!thread) {
                console.error(chalk.red(`❌ Thread '${threadId}' not found.`));
                process.exit(1);
            }

            const threadStatus = getThreadStatus(thread);
            const phase = getThreadPhase(thread);

            console.log(chalk.bold(`\n🧵 Thread: ${thread.id}`));
            console.log(`   Status: ${colorStatus(threadStatus)}`);
            console.log(`   Phase:  ${phase}`);
            console.log(`   Design: ${thread.design.title} (v${thread.design.version})`);
            console.log(`   Plans:  ${thread.plans.length} (${thread.plans.filter(p => p.status === 'done').length} done)`);

            const activePlan = thread.plans.find(
                p => p.status === 'implementing' || p.status === 'active'
            );

            if (activePlan && options?.verbose) {
                const index = state.index;  // <-- Use the index from state
                const steps = activePlan.steps || [];
                const doneCount = steps.filter(s => s.done).length;

                console.log(`\n📋 Active Plan: ${activePlan.id}`);
                console.log(`   Status: ${activePlan.status}`);
                console.log(`   Progress: ${doneCount}/${steps.length} steps done\n`);
                console.log('   Steps:');

                for (const step of steps) {
                    let symbol: string;
                    if (step.done) {
                        symbol = '✅';
                    } else if (isStepBlocked(step, activePlan as PlanDoc, index)) {
                        symbol = '🔒';
                    } else {
                        symbol = '🔳';
                    }

                    console.log(`   ${symbol} ${step.order}. ${step.description}`);
                    
                    if (!step.done && isStepBlocked(step, activePlan as PlanDoc, index)) {
                        const blockers = step.blockedBy.join(', ');
                        console.log(`      ⚠️ Blocked by: ${blockers}`);
                    }
                }

                const nextStep = findNextStep(activePlan as PlanDoc, index);
                if (nextStep) {
                    console.log(chalk.gray(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`));
                } else {
                    const blockedSteps = steps.filter(s => !s.done && isStepBlocked(s, activePlan as PlanDoc, index));
                    if (blockedSteps.length > 0) {
                        console.log(chalk.yellow(`\n   ⚠️ All remaining steps are blocked.`));
                    } else if (steps.every(s => s.done)) {
                        console.log(chalk.green(`\n   🎉 All steps complete!`));
                    }
                }
            }

            if (activePlan && !options?.verbose) {
                const index = state.index;  // <-- Use the index from state
                const nextStep = findNextStep(activePlan as PlanDoc, index);
                if (nextStep) {
                    console.log(chalk.gray(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`));
                }
            }
            return;
        }

        // List all threads
        console.log(chalk.bold(`\n🧵 Loom: ${state.loomName} (${state.mode})`));
        if (options?.filter) {
            console.log(chalk.gray(`   Filter: ${options.filter}`));
        }
        if (options?.sort) {
            console.log(chalk.gray(`   Sort: ${options.sort}`));
        }
        console.log('');
        
        if (state.threads.length === 0) {
            console.log(chalk.yellow('No threads found matching the criteria.'));
            return;
        }

        for (const t of state.threads) {
            const threadStatus = getThreadStatus(t);
            console.log(`  ${t.id.padEnd(25)} ${colorStatus(threadStatus)}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}