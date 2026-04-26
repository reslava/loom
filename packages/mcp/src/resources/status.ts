import * as path from 'path';
import * as fs from 'fs-extra';

export async function handleStatusResource(root: string) {
    const statusPath = path.join(root, '.loom', '_status.md');
    let content: string;

    if (await fs.pathExists(statusPath)) {
        content = await fs.readFile(statusPath, 'utf8');
    } else {
        content = '<!-- _status.md not found — Stage 2 mode or not initialised -->';
    }

    return {
        contents: [{
            uri: 'loom://status',
            mimeType: 'text/plain',
            text: content,
        }],
    };
}
