import * as path from 'path';
import * as fs from 'fs-extra';
import { resolveDocIdOrThrow } from '../../../fs/dist';

export const promptDef = {
    name: 'refine-design',
    description: 'Load a design doc and related thread chat history, return a refinement proposal prompt.',
    arguments: [
        { name: 'designUlid', description: 'Design document ULID', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const designUlid = args['designUlid'];
    if (!designUlid) throw new Error('designUlid is required');

    // Primary (agent-supplied) id → suggest-on-miss.
    const { filePath } = await resolveDocIdOrThrow(root, designUlid);

    const designContent = await fs.readFile(filePath, 'utf8');

    // Load chats from the thread-level chats dir (sibling of the design file)
    const threadDir = path.dirname(filePath);
    const chatsDir = path.join(threadDir, 'chats');
    const chatSections: string[] = [];

    if (await fs.pathExists(chatsDir)) {
        const chatFiles = (await fs.readdir(chatsDir))
            .filter(f => f.endsWith('.md'))
            .sort();
        for (const f of chatFiles) {
            const content = await fs.readFile(path.join(chatsDir, f), 'utf8');
            chatSections.push(`## chat: ${path.basename(f, '.md')}\n\n${content}`);
        }
    }

    const combined = [`## design: ${designUlid}\n\n${designContent}`, ...chatSections].join('\n\n---\n\n');

    return {
        description: `Refine design ${designUlid}`,
        messages: [
            { role: 'user' as const, content: { type: 'text' as const, text: combined } },
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: 'Review the design document and chat history. Propose concrete refinements, clarifications, or additions to improve the design.',
                },
            },
        ],
    };
}
