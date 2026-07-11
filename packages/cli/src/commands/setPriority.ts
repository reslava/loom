import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { resolveThreadUlid } from '../../../app/dist/utils/resolveThreadFolder';
import { setThreadPriority } from '../../../app/dist/thread';

/**
 * `loom set-priority <weave> <thread> <priority>` — the CLI twin of
 * loom_set_priority (the drag-reorder write). Lower = earlier among the slack
 * the dependency graph leaves free; never overrides a hard depends_on edge.
 */
export async function setPriorityCommand(weave: string, thread: string, priority: string): Promise<void> {
    try {
        const value = Number(priority);
        if (!Number.isFinite(value)) throw new Error(`Priority must be a number, got '${priority}'.`);
        const threadUlid = await resolveThreadUlid(weave, thread, { getActiveLoomRoot, loadDoc, fs });
        const result = await setThreadPriority(
            { threadUlid, priority: value },
            { getActiveLoomRoot, saveDoc, loadDoc, fs },
        );
        console.log(chalk.green(`✅ Priority set to ${value} for ${weave}/${thread}.`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
