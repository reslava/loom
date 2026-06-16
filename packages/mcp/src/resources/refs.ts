import * as path from 'path';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadDoc } from '../../../fs/dist';

/**
 * loom://refs — list the reference docs under loom/refs/ as { id, title, file }.
 * Backs the extension's "add to requires_load" picker so it no longer reads the
 * filesystem directly (keeping vscode → mcp → app intact).
 */
export async function handleRefsResource(root: string) {
    const loomRoot = getActiveLoomRoot(root);
    const refsDir = path.join(loomRoot, 'loom', 'refs');

    let files: string[] = [];
    try {
        files = (await fs.readdir(refsDir)).filter(f => f.endsWith('.md'));
    } catch {
        files = [];
    }

    const refs: Array<{ id: string; title: string; file: string }> = [];
    for (const file of files) {
        try {
            const doc = await loadDoc(path.join(refsDir, file)) as { id?: string; title?: string };
            refs.push({
                id: doc.id ?? file.replace(/\.md$/, ''),
                title: doc.title ?? file.replace(/-reference\.md$/, ''),
                file,
            });
        } catch {
            // skip unreadable / malformed reference docs
        }
    }

    return {
        contents: [{
            uri: 'loom://refs',
            mimeType: 'application/json',
            text: JSON.stringify({ refs }, null, 2),
        }],
    };
}
