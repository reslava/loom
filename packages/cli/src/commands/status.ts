import chalk from 'chalk';
import { getState, GetStateInput } from '../../../app/dist';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import * as fs from 'fs-extra';
import { Weave } from '../../../core/dist';
import { getWeaveStatus, getWeavePhase, toStateSummary } from '../../../core/dist';
import { PlanDoc } from '../../../core/dist';
import { LinkIndex } from '../../../core/dist';
import { buildLinkIndex as buildIndex } from '../../../fs/dist';
import { WeaveStatus } from '../../../core/dist';
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

function parseFilterFlag(filterStr?: string): GetStateInput['weaveFilter'] | undefined {
    if (!filterStr) return undefined;
    
    const filter: GetStateInput['weaveFilter'] = {};
    const parts = filterStr.split(',');
    
    for (const part of parts) {
        const [key, value] = part.split('=');
        if (!key || !value) continue;
        
        switch (key.trim()) {
            case 'status':
                filter.status = value.split('|').map(s => s.trim()) as WeaveStatus[];
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
    weaveSlug?: string,
    options?: { verbose?: boolean; json?: boolean; tokens?: boolean; filter?: string; sort?: string }
): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        
        const weaveFilter = parseFilterFlag(options?.filter);
        const sortBy = parseSortFlag(options?.sort);
        const sortOrder = parseSortOrder(options?.sort);
        
        const state = await getState(
            { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs },
            { weaveFilter, sortBy, sortOrder }
        );

        if (options?.json) {
            console.log(JSON.stringify(state, null, 2));
            return;
        }

        if (weaveSlug) {
            const weave = state.weaves.find(w => w.id === weaveSlug);
            if (!weave) {
                console.error(chalk.red(`❌ Weave '${weaveSlug}' not found.`));
                process.exit(1);
            }

            const weaveStatus = getWeaveStatus(weave);
            const phase = getWeavePhase(weave);
            const primaryDesign = weave.threads.find(t => t.design)?.design;
            const designTitle = primaryDesign?.title || 'No design';
            const designVersion = primaryDesign?.version || 0;
            const threadCount = weave.threads.length;

            const allPlans = weave.threads.flatMap(t => t.plans);

            console.log(chalk.bold(`\n🧵 Weave: ${weave.id}`));
            console.log(`   Status:  ${colorStatus(weaveStatus)}`);
            console.log(`   Phase:   ${phase}`);
            console.log(`   Threads: ${threadCount} (primary design: ${designTitle} v${designVersion})`);
            console.log(`   Plans:   ${allPlans.length} (${allPlans.filter(p => p.status === 'done').length} done)`);
            if (weave.looseFibers.length > 0) {
                console.log(`   Loose:   ${weave.looseFibers.length} fiber(s)`);
            }

            const activePlan = allPlans.find(
                p => p.status === 'implementing' || p.status === 'active'
            );

            if (activePlan && options?.verbose) {
                const index = state.index;
                const steps = activePlan.steps || [];
                const doneCount = steps.filter(s => s.status === 'done').length;

                console.log(`\n📋 Active Plan: ${activePlan.id}`);
                console.log(`   Status: ${activePlan.status}`);
                console.log(`   Progress: ${doneCount}/${steps.length} steps done\n`);
                console.log('   Steps:');

                for (const step of steps) {
                    let symbol: string;
                    if (step.status === 'done') {
                        symbol = '✅';
                    } else if (step.status === 'cancelled') {
                        symbol = '❌';
                    } else if (step.status === 'in_progress') {
                        symbol = '🔄';
                    } else if (isStepBlocked(step, activePlan as PlanDoc, index)) {
                        symbol = '🔒';
                    } else {
                        symbol = '🔳';
                    }

                    console.log(`   ${symbol} ${step.order}. ${step.description}`);

                    if (step.status !== 'done' && step.status !== 'cancelled' && isStepBlocked(step, activePlan as PlanDoc, index)) {
                        const blockers = step.blockedBy.join(', ');
                        console.log(`      ⚠️ Blocked by: ${blockers}`);
                    }
                }

                const nextStep = findNextStep(activePlan as PlanDoc, index);
                if (nextStep) {
                    console.log(chalk.gray(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`));
                } else {
                    const blockedSteps = steps.filter(s => s.status !== 'done' && s.status !== 'cancelled' && isStepBlocked(s, activePlan as PlanDoc, index));
                    if (blockedSteps.length > 0) {
                        console.log(chalk.yellow(`\n   ⚠️ All remaining steps are blocked.`));
                    } else if (steps.every(s => s.status === 'done' || s.status === 'cancelled')) {
                        console.log(chalk.green(`\n   🎉 All steps complete!`));
                    }
                }
            }

            if (activePlan && !options?.verbose) {
                const index = state.index;
                const nextStep = findNextStep(activePlan as PlanDoc, index);
                if (nextStep) {
                    console.log(chalk.gray(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`));
                }
            }
            return;
        }

        // List all weaves
        console.log(chalk.bold(`\n🧵 Loom: ${state.loomName} (${state.mode})`));
        if (options?.filter) {
            console.log(chalk.gray(`   Filter: ${options.filter}`));
        }
        if (options?.sort) {
            console.log(chalk.gray(`   Sort: ${options.sort}`));
        }
        console.log('');
        
        if (state.weaves.length === 0) {
            console.log(chalk.yellow('No weaves found matching the criteria.'));
            return;
        }

        // Render the session-start map: the human view of the same toStateSummary
        // projection loom://state?shape=summary serves — weave + its threads, each
        // with status, active-plan pending-step count, and a stale flag.
        const summary = toStateSummary(state);
        for (const w of summary.weaves) {
            console.log(`  ${chalk.bold(w.id.padEnd(25))} ${colorStatus(w.status)}`);
            for (const t of w.threads) {
                const bits: string[] = [];
                if (t.activePlanId) bits.push(`▶ ${t.pendingStepCount} pending`);
                if (t.stale) bits.push(chalk.yellow('stale'));
                const suffix = bits.length > 0 ? chalk.gray(`  (${bits.join(', ')})`) : '';
                console.log(`     ${t.id.padEnd(28)} ${chalk.gray(t.status)}${suffix}`);
            }
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}