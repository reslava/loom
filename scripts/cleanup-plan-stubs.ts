/**
 * Removes empty "## Step N —" stub sections from plan documents.
 * A stub section is one whose only content is the placeholder comment
 * <!-- Detailed spec. --> (and optional whitespace). Sections that have
 * been filled in are left untouched.
 *
 * Run this after a plan is fully implemented to tidy up the duplicate
 * step descriptions that the CLI draft workflow leaves behind.
 *
 * Idempotent: re-running is safe.
 *
 * Usage:
 *   npx ts-node --project tests/tsconfig.json scripts/cleanup-plan-stubs.ts [--dry-run]
 *   npx ts-node --project tests/tsconfig.json scripts/cleanup-plan-stubs.ts --plan <plan-id> [--dry-run]
 */

import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const LOOM_ROOT = path.resolve(__dirname, '..');
const LOOM_DIR = path.join(LOOM_ROOT, 'loom');

const planArg = (() => {
    const idx = process.argv.indexOf('--plan');
    return idx !== -1 ? process.argv[idx + 1] : undefined;
})();

// Matches "## Step N — ..." sections, capturing the heading and everything
// up to the next "---" separator or "## " heading or end of string.
const STUB_SECTION = /\n## Step \d+ —[^\n]*\n\n<!-- Detailed spec\. -->\n\n---\n/g;
// Last section at end of file (no trailing ---)
const STUB_SECTION_EOF = /\n## Step \d+ —[^\n]*\n\n<!-- Detailed spec\. -->\n*$/g;

function stripStubs(content: string): { result: string; count: number } {
    let count = 0;
    let result = content
        .replace(STUB_SECTION, () => { count++; return '\n'; })
        .replace(STUB_SECTION_EOF, () => { count++; return '\n'; });
    // Collapse multiple blank lines left behind
    result = result.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
    return { result, count };
}

async function main() {
    const pattern = planArg
        ? `**/${planArg}.md`
        : '**/plans/*-plan-*.md';

    const files = await glob(pattern, { cwd: LOOM_DIR, absolute: true });
    let fixed = 0;
    let skipped = 0;

    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const { result, count } = stripStubs(content);

        if (count === 0) { skipped++; continue; }

        const rel = path.relative(LOOM_ROOT, file);
        console.log(`${DRY_RUN ? '[DRY] ' : ''}${rel}: removed ${count} stub section(s)`);

        if (!DRY_RUN) {
            await fs.writeFile(file, result, 'utf8');
        }
        fixed++;
    }

    console.log(`\nDone. Cleaned: ${fixed}, Skipped (no stubs): ${skipped}${DRY_RUN ? ' (dry run)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
