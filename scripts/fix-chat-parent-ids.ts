/**
 * Clears parent_id from chat documents where it is set to a folder/thread name
 * rather than a valid doc ID (ULID format). Chats derive their scope from their
 * file path, not from parent_id.
 *
 * Idempotent: skips chats that already have parent_id: null.
 *
 * Usage:
 *   npx ts-node --project tests/tsconfig.json scripts/fix-chat-parent-ids.ts [--dry-run]
 */

import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const LOOM_ROOT = path.resolve(__dirname, '..');
const LOOM_DIR = path.join(LOOM_ROOT, 'loom');

// ULID-style doc IDs: {prefix}_{26-char-base32}
const ULID_DOC_ID = /^[a-z]+_[0-9A-Z]{26}$/;

function isValidDocId(id: string): boolean {
    return ULID_DOC_ID.test(id);
}

async function main() {
    const files = await glob('**/*-chat-*.md', { cwd: LOOM_DIR, absolute: true });
    let fixed = 0;
    let skipped = 0;

    for (const file of files) {
        const raw = await fs.readFile(file, 'utf8');
        // Normalize line endings
        const content = raw.replace(/\r\n/g, '\n');

        // Only process files with YAML frontmatter
        if (!content.startsWith('---\n')) { skipped++; continue; }

        // Extract type and parent_id from frontmatter with simple regex
        const typeMatch = content.match(/\ntype:\s*(\S+)/);
        const parentMatch = content.match(/\nparent_id:\s*(.+)/);

        if (!typeMatch || typeMatch[1] !== 'chat') { skipped++; continue; }

        const parentRaw = parentMatch ? parentMatch[1].trim() : 'null';
        if (parentRaw === 'null' || parentRaw === '') { skipped++; continue; }
        if (isValidDocId(parentRaw)) { skipped++; continue; }

        const rel = path.relative(LOOM_ROOT, file);
        console.log(`${DRY_RUN ? '[DRY] ' : ''}Fixing: ${rel}  (parent_id: ${parentRaw} → null)`);

        if (!DRY_RUN) {
            const fixed_content = raw.replace(
                /(\nparent_id:\s*)(.+)/,
                '$1null'
            );
            await fs.writeFile(file, fixed_content, 'utf8');
        }
        fixed++;
    }

    console.log(`\nDone. Fixed: ${fixed}, Skipped: ${skipped}${DRY_RUN ? ' (dry run — no files written)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
