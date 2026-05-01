import * as vscode from 'vscode';
import * as cp from 'child_process';
import { promisify } from 'util';
import { TreeNode } from '../tree/treeProvider';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';

const exec = promisify(cp.exec);

interface PlanStep {
    order: number;
    description: string;
    done: boolean;
    blockedBy: string[];
}

async function isClaudeInstalled(): Promise<boolean> {
    try {
        const cmd = process.platform === 'win32' ? 'where claude' : 'which claude';
        await exec(cmd);
        return true;
    } catch {
        return false;
    }
}

function isDoable(step: PlanStep, allSteps: PlanStep[], pickedNumbers: Set<number>): boolean {
    if (step.done) return false;
    for (const blocker of step.blockedBy) {
        const n = parseInt(blocker, 10);
        if (Number.isNaN(n)) continue;
        const blockerStep = allSteps.find(s => s.order === n);
        if (!blockerStep) continue;
        if (blockerStep.done) continue;
        if (pickedNumbers.has(n)) continue;
        return false;
    }
    return true;
}

function topoSort(stepNumbers: number[], allSteps: PlanStep[]): number[] {
    const set = new Set(stepNumbers);
    const result: number[] = [];
    const remaining = new Set(stepNumbers);
    while (remaining.size > 0) {
        let progressed = false;
        for (const n of Array.from(remaining)) {
            const step = allSteps.find(s => s.order === n);
            if (!step) { remaining.delete(n); continue; }
            const blockersInPick = step.blockedBy
                .map(b => parseInt(b, 10))
                .filter(b => !Number.isNaN(b) && set.has(b) && remaining.has(b));
            if (blockersInPick.length === 0) {
                result.push(n);
                remaining.delete(n);
                progressed = true;
            }
        }
        if (!progressed) {
            // Cycle or impossible — fall back to sorted order so we at least produce something deterministic.
            for (const n of Array.from(remaining).sort((a, b) => a - b)) result.push(n);
            break;
        }
    }
    return result;
}

async function pickStepNumbers(plan: PlanDoc): Promise<number[] | undefined> {
    const allSteps: PlanStep[] = (plan.steps ?? []).map(s => ({
        order: s.order,
        description: s.description,
        done: s.done,
        blockedBy: s.blockedBy ?? [],
    }));

    const notDone = allSteps.filter(s => !s.done);
    if (notDone.length === 0) {
        vscode.window.showInformationMessage('All steps are already done.');
        return undefined;
    }

    const empty = new Set<number>();
    const nextDoable = notDone.find(s => isDoable(s, allSteps, empty));
    const allDoableNumbers = topoSort(notDone.map(s => s.order), allSteps);

    type Mode = 'next' | 'all' | 'pick';
    interface ModeItem extends vscode.QuickPickItem { mode: Mode; }

    const modeItems: ModeItem[] = [
        {
            mode: 'next',
            label: '$(play) Next doable step',
            description: nextDoable ? `Step ${nextDoable.order} — ${nextDoable.description}` : 'no doable step',
            alwaysShow: true,
        },
        {
            mode: 'all',
            label: '$(run-all) All doable steps',
            description: `${allDoableNumbers.length} step${allDoableNumbers.length === 1 ? '' : 's'}: ${allDoableNumbers.join(', ')}`,
            alwaysShow: true,
        },
        {
            mode: 'pick',
            label: '$(list-selection) Pick steps…',
            description: 'multi-select',
            alwaysShow: true,
        },
    ];

    const modeChoice = await vscode.window.showQuickPick(modeItems, {
        title: `Do Step(s) — ${plan.title}`,
        placeHolder: 'Choose how many steps to run in this Claude session',
    });
    if (!modeChoice) return undefined;

    if (modeChoice.mode === 'next') {
        if (!nextDoable) {
            vscode.window.showInformationMessage('No doable step right now (all not-done steps are blocked).');
            return undefined;
        }
        return [nextDoable.order];
    }
    if (modeChoice.mode === 'all') {
        if (allDoableNumbers.length === 0) {
            vscode.window.showInformationMessage('No doable steps right now.');
            return undefined;
        }
        return allDoableNumbers;
    }

    interface StepItem extends vscode.QuickPickItem { order: number; }
    const stepItems: StepItem[] = notDone.map(s => {
        const blockerLabel = s.blockedBy.length > 0 ? ` · blocked by ${s.blockedBy.join(', ')}` : '';
        return {
            order: s.order,
            label: `Step ${s.order}`,
            description: s.description,
            detail: blockerLabel ? blockerLabel.trim() : undefined,
        };
    });

    const picks = await vscode.window.showQuickPick(stepItems, {
        title: `Pick steps to run — ${plan.title}`,
        placeHolder: 'Select one or more steps. Blocked steps are allowed only if their blockers are also picked.',
        canPickMany: true,
    });
    if (!picks || picks.length === 0) return undefined;

    const pickedNumbers = new Set(picks.map(p => p.order));
    for (const p of picks) {
        const step = allSteps.find(s => s.order === p.order)!;
        if (!isDoable(step, allSteps, pickedNumbers)) {
            const missing = step.blockedBy
                .map(b => parseInt(b, 10))
                .filter(b => !Number.isNaN(b))
                .filter(b => {
                    const blocker = allSteps.find(s => s.order === b);
                    return blocker && !blocker.done && !pickedNumbers.has(b);
                });
            vscode.window.showErrorMessage(
                `Step ${p.order} is blocked by step${missing.length === 1 ? '' : 's'} ${missing.join(', ')}. Include ${missing.length === 1 ? 'it' : 'them'} in your pick or run ${missing.length === 1 ? 'it' : 'them'} first.`
            );
            return undefined;
        }
    }

    return topoSort(picks.map(p => p.order), allSteps);
}

function buildPrompt(planId: string, stepNumbers: number[]): string {
    if (stepNumbers.length === 1) {
        return `Use the loom MCP server. Call loom_do_step with planId="${planId}" and stepNumber=${stepNumbers[0]} to get the brief. Implement the step using your tools. After implementation, call loom_append_done with your notes, then loom_complete_step. Show me what you did.`;
    }
    const list = JSON.stringify(stepNumbers);
    return `Use the loom MCP server to implement multiple plan steps in one session, preserving context across them. Plan id: "${planId}". Step numbers in dependency order: ${list}. Implement ONLY these steps — do not implement any other steps even if they appear not-done in the plan summary or seem like prerequisites. If a step cannot be completed without an unlisted step, stop and report the issue instead of resolving it yourself. For each step number in this exact order: (1) call loom_do_step with planId and stepNumber, (2) implement the step using your tools, (3) call loom_append_done with your notes for that step, (4) call loom_complete_step for that step. Then move to the next number without exiting. If any step fails, stop and report which step failed and why — do not skip ahead. Summarise what you did per step at the end.`;
}

export async function doStepCommand(node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const plan = node?.doc as PlanDoc | undefined;
    if (!plan || plan.type !== 'plan') {
        vscode.window.showErrorMessage('Select a plan node to use Do Step.');
        return;
    }

    if (plan.status !== 'implementing') {
        vscode.window.showErrorMessage(`Plan must be "implementing" to use Do Step. Current status: ${plan.status}`);
        return;
    }

    const stepNumbers = await pickStepNumbers(plan);
    if (!stepNumbers || stepNumbers.length === 0) return;

    if (!(await isClaudeInstalled())) {
        const action = await vscode.window.showErrorMessage(
            'Claude Code CLI not found on PATH. DoStep launches Claude Code in a terminal — install it first.',
            'Open Install Page'
        );
        if (action === 'Open Install Page') {
            vscode.env.openExternal(vscode.Uri.parse('https://docs.anthropic.com/claude-code'));
        }
        return;
    }

    const prompt = buildPrompt(plan.id, stepNumbers);

    const terminal = vscode.window.createTerminal({
        name: `Loom: ${plan.title}`,
        cwd: root,
    });
    terminal.show();
    terminal.sendText(`claude ${JSON.stringify(prompt)}`);
}
