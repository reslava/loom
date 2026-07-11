import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc } from '../../../fs/dist';
import { resolveThreadUlid } from '../../../app/dist/utils/resolveThreadFolder';
import { moveThread } from '../../../app/dist/thread';

/**
 * `loom move-thread <weave> <thread> <target-weave>` — the CLI twin of
 * loom_move_thread. Resolves the thread folder slug → its stable th_ ULID at
 * the edge, then moves the folder; its ULID travels with it so depends_on edges
 * and doc ULIDs survive.
 */
export async function moveThreadCommand(weave: string, thread: string, targetWeave: string): Promise<void> {
    try {
        const threadUlid = await resolveThreadUlid(weave, thread, { getActiveLoomRoot, loadDoc, fs });
        const result = await moveThread(
            { fromWeaveSlug: weave, threadUlid, toWeaveSlug: targetWeave },
            { getActiveLoomRoot, loadDoc, fs },
        );
        console.log(chalk.green(`🧵 Thread moved: ${weave}/${thread} → ${targetWeave}/${thread}`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
