import * as path from 'path';
import * as fs from 'fs-extra';
import { resolveDocIdOrThrow } from '../../../fs/dist';

export const promptDef = {
    name: 'refine-design',
    description: 'Load a design doc and related thread chat history, return a refinement proposal prompt.',
    arguments: [
        { name: 'designId', description: 'Design document ID', required: true },
    ],
};

export async function handle(root: string, args: Record<string, string | undefined>) {
    const designId = args['designId'];
    if (!designId) throw new Error('designId is required');

    // Primary (agent-supplied) id → suggest-on-miss.
    const { filePath } = await resolveDocIdOrThrow(root, designId);

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

    const combined = [`## design: ${designId}\n\n${designContent}`, ...chatSections].join('\n\n---\n\n');

    return {
        description: `Refine design ${designId}`,
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
