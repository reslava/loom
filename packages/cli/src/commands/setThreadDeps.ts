import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { resolveThreadUlid } from '../../../app/dist/utils/resolveThreadFolder';
import { setThreadDeps } from '../../../app/dist/thread';

/**
 * `loom set-thread-deps <weave> <thread> [deps...]` — the CLI twin of
 * loom_set_thread_deps (the roadmap dependency graph). Each dep is a th_ ULID or
 * a `weave/thread` (or bare `thread`, same weave) slug ref, resolved to a ULID
 * at the edge. Passing no deps clears the list. Refused on a cycle / unknown target.
 */
export async function setThreadDepsCommand(weave: string, thread: string, deps: string[]): Promise<void> {
    try {
        const threadUlid = await resolveThreadUlid(weave, thread, { getActiveLoomRoot, loadDoc, fs });
        const dependsOn: string[] = [];
        for (const dep of deps ?? []) {
            if (/^th_/i.test(dep)) { dependsOn.push(dep); continue; }
            const [w, t] = dep.includes('/') ? dep.split('/') : [weave, dep];
            dependsOn.push(await resolveThreadUlid(w, t, { getActiveLoomRoot, loadDoc, fs }));
        }
        const result = await setThreadDeps(
            { threadUlid, dependsOn },
            { getActiveLoomRoot, saveDoc, loadDoc, fs },
        );
        console.log(chalk.green(`✅ Dependencies set for ${weave}/${thread} (${dependsOn.length}).`));
        console.log(chalk.gray(`   ${JSON.stringify(result)}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
