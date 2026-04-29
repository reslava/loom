/**
 * Prepends canonical `type: chat` frontmatter to every chat file that currently lacks it.
 * Idempotent: skips files that already start with `---`.
 *
 * Usage:
 *   npx ts-node --project tests/tsconfig.json scripts/migrate-chat-frontmatter.ts [--dry-run]
 */

import fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const LOOM_ROOT = path.resolve(__dirname, '..');
const LOOM_DIR = path.join(LOOM_ROOT, 'loom');

function toTitle(id: string): string {
    return id
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function gitCreatedDate(filePath: string): string {
    try {
        const rel = path.relative(LOOM_ROOT, filePath).replace(/\\/g, '/');
        const out = execSync(`git log --follow --format="%as" -- "${rel}"`, {
            cwd: LOOM_ROOT,
            encoding: 'utf8',
        }).trim();
        const lines = out.split('\n').filter(Boolean);
        return lines[lines.length - 1] ?? new Date().toISOString().slice(0, 10);
    } catch {
        return new Date().toISOString().slice(0, 10);
    }
}

function buildFrontmatter(id: string, title: string, created: string): string {
    return [
        '---',
        'type: chat',
        `id: ${id}`,
        `title: "${title}"`,
        'status: active',
        `created: ${created}`,
        'version: 1',
        'tags: []',
        'parent_id: null',
        'child_ids: []',
        'requires_load: []',
        '---',
        '',
    ].join('\n');
}

async function main() {
    const pattern = path.join(LOOM_DIR, '**/*-chat*.md').replace(/\\/g, '/');
    const files = await glob(pattern);

    let migrated = 0;
    let skipped = 0;

    for (const filePath of files.sort()) {
        const content = await fs.readFile(filePath, 'utf8');
        if (content.startsWith('---')) {
            console.log(`SKIP (has frontmatter): ${path.relative(LOOM_ROOT, filePath)}`);
            skipped++;
            continue;
        }

        const id = path.basename(filePath, '.md');
        const title = toTitle(id);
        const created = gitCreatedDate(filePath);
        const fm = buildFrontmatter(id, title, created);

        if (DRY_RUN) {
            console.log(`DRY-RUN: ${path.relative(LOOM_ROOT, filePath)}`);
            console.log(fm);
        } else {
            await fs.writeFile(filePath, fm + content, 'utf8');
            console.log(`MIGRATED: ${path.relative(LOOM_ROOT, filePath)}`);
        }
        migrated++;
    }

    console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
}

main().catch(err => { console.error(err); process.exit(1); });
