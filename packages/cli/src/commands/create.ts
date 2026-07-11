import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc, loadWeave } from '../../../fs/dist';
import { resolveThreadUlid } from '../../../app/dist/utils/resolveThreadFolder';
import { createThread } from '../../../app/dist/thread';
import { createIdea } from '../../../app/dist/createIdea';
import { createDesign } from '../../../app/dist/createDesign';
import { createPlan } from '../../../app/dist/createPlan';
import { chatNew } from '../../../app/dist/chatNew';
import { createReq } from '../../../app/dist/req';
import { createWeave } from '../../../app/dist/weave';
import { createReference } from '../../../app/dist/createReference';

function fail(e: any): never {
    console.error(chalk.red(`❌ ${e.message}`));
    process.exit(1);
}

/**
 * Resolve an EXISTING thread (folder slug or `th_` ULID) → its ULID. NEVER creates
 * one — the create commands are thread-first, mirroring the MCP write path. A missing
 * thread is a hard error that points at the explicit `loom create thread`.
 */
async function requireThreadUlid(weaveSlug: string, threadRef: string): Promise<string> {
    if (/^th_/i.test(threadRef)) return threadRef;
    try {
        return await resolveThreadUlid(weaveSlug, threadRef, { getActiveLoomRoot, loadDoc, fs });
    } catch {
        throw new Error(
            `Thread '${weaveSlug}/${threadRef}' not found. Create it first:  loom create thread ${weaveSlug} ${threadRef}`
        );
    }
}

export async function createThreadCommand(weave: string, thread: string, options: { title?: string }): Promise<void> {
    try {
        const { id } = await createThread(
            { weaveSlug: weave, threadSlug: thread, title: options.title },
            { getActiveLoomRoot, saveDoc, fs },
        );
        console.log(chalk.green(`🧵 Thread created: ${weave}/${thread}`));
        console.log(chalk.gray(`   ULID: ${id}`));
    } catch (e) { fail(e); }
}

export async function createIdeaCommand(weave: string, thread: string, title: string): Promise<void> {
    try {
        const threadUlid = await requireThreadUlid(weave, thread);
        const result = await createIdea(
            { title, weaveSlug: weave, threadUlid },
            { getActiveLoomRoot, saveDoc, loadDoc, fs },
        );
        console.log(chalk.green(`💡 Idea created at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e) { fail(e); }
}

export async function createDesignCommand(weave: string, thread: string, options: { title?: string }): Promise<void> {
    try {
        const threadUlid = await requireThreadUlid(weave, thread);
        const result = await createDesign(
            { weaveSlug: weave, title: options.title, threadUlid },
            { getActiveLoomRoot, saveDoc, loadDoc, fs },
        );
        if (result.autoFinalized) console.log(chalk.gray(`   Idea auto-finalized`));
        console.log(chalk.green(`📐 Design created at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e) { fail(e); }
}

export async function createPlanCommand(weave: string, thread: string, options: { title?: string; goal?: string }): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const threadUlid = await requireThreadUlid(weave, thread);
        const result = await createPlan(
            { weaveSlug: weave, title: options.title, goal: options.goal, threadUlid },
            { loadWeave, saveDoc, loadDoc, fs, loomRoot },
        );
        console.log(chalk.green(`📋 Plan created at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e) { fail(e); }
}

export async function createReqCommand(weave: string, thread: string, options: { title?: string }): Promise<void> {
    try {
        const threadUlid = await requireThreadUlid(weave, thread);
        const result = await createReq(
            { weaveSlug: weave, threadUlid, title: options.title },
            { getActiveLoomRoot, saveDoc, loadDoc, fs },
        );
        console.log(chalk.green(`📑 Req created at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e) { fail(e); }
}

export async function createChatCommand(
    weave: string | undefined,
    thread: string | undefined,
    options: { title?: string; refs?: boolean },
): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        let input: { weaveSlug: string; threadUlid: string | undefined; title?: string };
        if (options.refs) {
            input = { weaveSlug: 'refs', threadUlid: undefined, title: options.title };
        } else {
            if (!weave || !thread) {
                throw new Error('A thread chat needs <weave> and <thread> (or pass --refs for a refs chat).');
            }
            const threadUlid = await requireThreadUlid(weave, thread);
            input = { weaveSlug: weave, threadUlid, title: options.title };
        }
        const result = await chatNew(input, { saveDoc, loadDoc, fs, loomRoot });
        console.log(chalk.green(`💬 Chat created at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e) { fail(e); }
}

export async function createReferenceCommand(title: string, options: { description?: string }): Promise<void> {
    try {
        const result = await createReference(
            { title, description: options.description },
            { getActiveLoomRoot: () => getActiveLoomRoot(), fs },
        );
        console.log(chalk.green(`📚 Reference created at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}  slug: ${result.slug}`));
    } catch (e) { fail(e); }
}

export async function createWeaveCommand(slug: string): Promise<void> {
    try {
        await createWeave(
            { weaveSlug: slug },
            { getActiveLoomRoot: () => getActiveLoomRoot(), fs },
        );
        console.log(chalk.green(`🧶 Weave created: loom/${slug}`));
    } catch (e) { fail(e); }
}
