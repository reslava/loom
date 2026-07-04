import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import { setThreadDeps } from '../../../app/dist/thread';

export const toolDef = {
    name: 'loom_set_thread_deps',
    description:
        "Set a thread's hard `depends_on` edges on its `thread.md` (the roadmap dependency graph). Targets are other threads' `th_` ULIDs. The write is REFUSED if it would introduce a cycle, target an unknown thread, or make the thread depend on itself — validation at write time so the read-model rarely renders a broken graph. Identifies the thread by its `th_` ULID. Use this tool — do not edit weave files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            thread_ulid: { type: 'string', description: "The thread's th_ ULID (its thread.md id)" },
            depends_on: { type: 'array', items: { type: 'string' }, description: 'th_ ULIDs this thread depends on (replaces the existing list)' },
        },
        required: ['thread_ulid', 'depends_on'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await setThreadDeps(
        { threadUlid: args['thread_ulid'] as string, dependsOn: (args['depends_on'] as string[] | undefined) ?? [] },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), saveDoc, loadDoc, fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
