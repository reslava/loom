import * as fs from 'fs-extra';
import { findDocumentById } from '../../../fs/dist';

export const toolDef = {
    name: 'loom_append_to_chat',
    description: 'Append a new message to an existing chat document. Use this tool to add messages to Loom chats — do not edit chat files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Chat document id' },
            role: { type: 'string', enum: ['AI', 'Rafa'], description: 'Message author role' },
            body: { type: 'string', description: 'Message body (markdown)' },
        },
        required: ['id', 'role', 'body'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    const role = args['role'] as string;
    const body = args['body'] as string;

    const filePath = await findDocumentById(root, id);
    if (!filePath) {
        throw new Error(`Chat document not found: ${id}`);
    }

    const existing = await fs.readFile(filePath, 'utf8');
    const appended = `${existing}\n\n## ${role}:\n\n${body}`;
    await fs.writeFile(filePath, appended, 'utf8');

    return { content: [{ type: 'text' as const, text: JSON.stringify({ id, filePath }) }] };
}
