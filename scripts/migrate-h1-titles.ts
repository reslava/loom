#!/usr/bin/env ts-node
/**
 * Migration: enforce single H1 = frontmatter title, cascade-demote others.
 *
 * For every loom/**\/*.md (skip .archive/):
 *   - Ensure first non-blank line is `# ${frontmatter.title}` (insert or replace).
 *   - If any OTHER H1 exists in the body, shift ALL non-title headings by +1
 *     (H1→H2, H2→H3, ...). This preserves relative hierarchy.
 *
 * SKIPS old design docs (type: design containing a `# CHAT` section) — those
 * carry historical inline chat content and must be preserved as-is.
 *
 * SKIPS chat docs' body entirely except for the title H1 (their `## Name:`
 * structure is already correct).
 *
 * Dry-run by default. Pass --apply to write.
 *
 * Run:
 *   npx ts-node --project tests/tsconfig.json scripts/migrate-h1-titles.ts
 *   npx ts-node --project tests/tsconfig.json scripts/migrate-h1-titles.ts --apply
 */
import * as fs from 'fs';
import * as path from 'path';
const fsp = fs.promises;

const ROOT = process.cwd();
const LOOM_DIR = path.join(ROOT, 'loom');
const APPLY = process.argv.includes('--apply');

interface ParsedDoc {
    frontmatter: string;
    fmObject: Record<string, string>;
    body: string;
}

function parseDoc(content: string): ParsedDoc | null {
    if (!content.startsWith('---\n')) return null;
    const end = content.indexOf('\n---\n', 4);
    if (end === -1) return null;
    const frontmatter = content.slice(4, end);
    const body = content.slice(end + 5);
    const fmObject: Record<string, string> = {};
    for (const line of frontmatter.split('\n')) {
        const m = line.match(/^([a-z_]+):\s*(.*)$/);
        if (m) {
            let val = m[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            fmObject[m[1]] = val;
        }
    }
    return { frontmatter, fmObject, body };
}

function isInsideFence(linesBefore: string[]): boolean {
    let count = 0;
    for (const l of linesBefore) {
        if (/^```/.test(l)) count++;
    }
    return count % 2 === 1;
}

function migrateBody(body: string, title: string, isOldDesign: boolean): string {
    if (isOldDesign) {
        // Preserve everything; only ensure title H1 at top.
        return ensureTitleH1(body, title);
    }

    let result = ensureTitleH1(body, title);
    const lines = result.split('\n');

    // Find title line index (first H1).
    let titleIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        const before = lines.slice(0, i);
        if (isInsideFence(before)) continue;
        if (/^#\s+/.test(lines[i]) && !/^##/.test(lines[i])) {
            titleIdx = i;
            break;
        }
    }

    // Find the first non-title H1.
    let firstRogueIdx = -1;
    for (let i = titleIdx + 1; i < lines.length; i++) {
        const before = lines.slice(0, i);
        if (isInsideFence(before)) continue;
        if (/^#\s+/.test(lines[i]) && !/^##/.test(lines[i])) {
            firstRogueIdx = i;
            break;
        }
    }

    if (firstRogueIdx === -1) return result;

    // Shift every heading from the first rogue H1 onward by +1.
    for (let i = firstRogueIdx; i < lines.length; i++) {
        const before = lines.slice(0, i);
        if (isInsideFence(before)) continue;
        const m = lines[i].match(/^(#{1,5})(\s+.*)$/);
        if (m) {
            lines[i] = '#' + m[1] + m[2];
        }
    }
    return lines.join('\n');
}

function ensureTitleH1(body: string, title: string): string {
    const desired = `# ${title}`;
    if (!body || body.trim() === '') return `${desired}\n`;
    const lines = body.split('\n');
    let firstNonBlank = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== '') { firstNonBlank = i; break; }
    }
    if (firstNonBlank === -1) return `${desired}\n`;
    const line = lines[firstNonBlank];
    if (/^#\s+/.test(line) && !/^##/.test(line)) {
        if (line === desired) return body;
        lines[firstNonBlank] = desired;
        return lines.join('\n');
    }
    return `${desired}\n\n${body.replace(/^\n+/, '')}`;
}

async function walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (e.name === '.archive') continue;
            out.push(...await walk(p));
        } else if (e.isFile() && e.name.endsWith('.md')) {
            out.push(p);
        }
    }
    return out;
}

function diffSummary(before: string, after: string, file: string): string | null {
    if (before === after) return null;
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    const changes: string[] = [];
    const max = Math.max(beforeLines.length, afterLines.length);
    let shown = 0;
    for (let i = 0; i < max && shown < 6; i++) {
        if (beforeLines[i] !== afterLines[i]) {
            changes.push(`  L${i + 1}: - ${JSON.stringify(beforeLines[i] ?? '')}`);
            changes.push(`  L${i + 1}: + ${JSON.stringify(afterLines[i] ?? '')}`);
            shown++;
        }
    }
    return `${file}\n${changes.join('\n')}`;
}

async function main() {
    const files = await walk(LOOM_DIR);
    let changed = 0, skipped = 0, errors = 0;
    const diffs: string[] = [];

    for (const file of files) {
        try {
            const raw = await fsp.readFile(file, 'utf-8');
            const parsed = parseDoc(raw);
            if (!parsed) { skipped++; continue; }
            const title = parsed.fmObject.title;
            if (!title) { skipped++; continue; }
            const type = parsed.fmObject.type;
            const isOldDesign = type === 'design' && /\n#\s+CHAT\b/.test(parsed.body);

            const newBody = migrateBody(parsed.body, title, isOldDesign);
            if (newBody === parsed.body) continue;

            const newContent = `---\n${parsed.frontmatter}\n---\n${newBody}`;
            const d = diffSummary(raw, newContent, path.relative(ROOT, file));
            if (d) diffs.push(d);
            changed++;
            if (APPLY) await fsp.writeFile(file, newContent, 'utf-8');
        } catch (e: any) {
            console.error(`ERROR ${file}: ${e.message}`);
            errors++;
        }
    }

    console.log(`\n${APPLY ? 'APPLIED' : 'DRY-RUN'} — ${changed} would-change, ${skipped} skipped, ${errors} errors\n`);
    const sample = diffs.slice(0, 15);
    console.log(`First ${sample.length} of ${diffs.length} changed files:\n`);
    console.log(sample.join('\n\n'));
    if (diffs.length > sample.length) console.log(`\n... and ${diffs.length - sample.length} more`);
}

main().catch(e => { console.error(e); process.exit(1); });
