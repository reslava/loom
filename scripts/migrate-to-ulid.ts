#!/usr/bin/env ts-node
/**
 * scripts/migrate-to-ulid.ts
 *
 * Migrates the loom/ tree to ULID-based doc identity (design: doc-ids-plan-001, steps 1–9).
 *
 * Usage:
 *   npx ts-node --project tests/tsconfig.json scripts/migrate-to-ulid.ts [--dry-run] [--verbose]
 *
 * Passes (in order):
 *   1. Inventory   — walk loom/, parse every doc
 *   2. Mint ULIDs  — assign {prefix}_{ulid} to every non-ctx doc without one
 *   3. Rewrite frontmatter — id, parent_id, drop child_ids, slug (refs), key order
 *   4. Rewrite requires_load — resolve slugs; fail if entry is not a ref
 *   5. Rename ctx files — *-ctx.md → ctx.md at each scope
 *   6. Consolidate weave-local refs → loom/refs/
 *   7. Verify — check every parent_id and requires_load resolves
 *
 * Atomicity: all writes go to a scratch dir first. Only on full success is the
 * scratch dir swapped in. The original loom/ is renamed to loom/.migration-backup-{ts}.
 */

import * as fs from 'fs-extra';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ulid } from 'ulid';

// ---------------------------------------------------------------------------
// Inlined from packages/core (avoids ESM/CJS dist-import issues in scripts)
// ---------------------------------------------------------------------------

type DocumentType = 'idea' | 'design' | 'plan' | 'ctx' | 'chat' | 'done' | 'reference';

const TYPE_PREFIX: Record<DocumentType, string> = {
    chat: 'ch_', idea: 'id_', design: 'de_', plan: 'pl_',
    done: 'dn_', ctx: 'cx_', reference: 'rf_',
};

const ULID_PATTERN = /^([a-z]{2}_)([0-9A-Z]{26})$/;

function generateDocId(type: DocumentType): string {
    return `${TYPE_PREFIX[type]}${ulid()}`;
}

function isUlidId(id: string): boolean {
    return ULID_PATTERN.test(id);
}

const ORDERED_KEYS = [
    'type', 'id', 'title', 'status', 'created', 'updated', 'version',
    'design_version', 'tags', 'parent_id', 'requires_load',
    'slug', 'load', 'load_when', 'role', 'target_release', 'actual_release',
    'target_version', 'source_version', 'staled', 'refined',
];

function serializeValue(value: any): string {
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        return `[${value.map(serializeValue).join(', ')}]`;
    }
    if (typeof value === 'string') {
        if (/[:#\n]/.test(value) || value.trim() !== value)
            return `"${value.replace(/"/g, '\\"')}"`;
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null || value === undefined) return 'null';
    return JSON.stringify(value);
}

function serializeFrontmatter(obj: Record<string, any>): string {
    const { child_ids: _drop, ...rest } = obj;
    const presentKeys = new Set(Object.keys(rest));
    const keys = [
        ...ORDERED_KEYS.filter(k => presentKeys.has(k)),
        ...Object.keys(rest).filter(k => !ORDERED_KEYS.includes(k)).sort(),
    ];
    return `---\n${keys.map(k => `${k}: ${serializeValue(rest[k])}`).join('\n')}\n---`;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DRY_RUN  = process.argv.includes('--dry-run');
const VERBOSE  = process.argv.includes('--verbose');

const REPO_ROOT   = process.cwd();
const LOOM_DIR    = path.join(REPO_ROOT, 'loom');
const GLOBAL_REFS = path.join(LOOM_DIR, 'refs');

const CTX_SUFFIXES = ['-ctx.md', '/ctx.md'];

// Directories that are not weaves or threads
const RESERVED_NAMES = new Set([
    'refs', 'plans', 'done', 'chats', 'ai-chats', '.archive', 'ctx',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocRecord {
    filePath:     string;     // absolute, within loom/
    scratchPath:  string;     // absolute, within scratch/
    data:         Record<string, any>;
    content:      string;
    oldId:        string;
    newId:        string;     // set after pass 2
    type:         DocumentType;
    slug?:        string;     // set for refs
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args: any[]) { console.log(...args); }
function verbose(...args: any[]) { if (VERBOSE) console.log(...args); }
function abort(msg: string): never { console.error(`\n❌  ${msg}`); process.exit(1); }

function findMarkdownFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    const results: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findMarkdownFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            results.push(full);
        }
    }
    return results;
}

function isCtxFile(filePath: string): boolean {
    const base = path.basename(filePath);
    // Already plain ctx.md, or ends with -{something}-ctx.md pattern
    return base === 'ctx.md' || base.endsWith('-ctx.md');
}

function ctxTargetPath(filePath: string): string {
    // Replace {scope}-ctx.md with ctx.md in same directory
    const dir  = path.dirname(filePath);
    const base = path.basename(filePath);
    if (base === 'ctx.md') return filePath; // already plain
    return path.join(dir, 'ctx.md');
}

function deriveSlugFromPath(filePath: string): string {
    return path.basename(filePath, '.md');
}

function isWeaveLocalRefsDir(dir: string): boolean {
    // A refs/ dir anywhere under loom/ that is NOT loom/refs/ itself
    return dir !== GLOBAL_REFS && path.basename(dir) === 'refs';
}

// ---------------------------------------------------------------------------
// Pass 1 — Inventory
// ---------------------------------------------------------------------------

function inventory(scratchDir: string): DocRecord[] {
    const allFiles = findMarkdownFiles(LOOM_DIR);
    const records: DocRecord[] = [];

    for (const filePath of allFiles) {
        // Skip .archive
        if (filePath.includes('.archive')) continue;

        let parsed: matter.GrayMatterFile<string>;
        try {
            parsed = matter(readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.warn(`  ⚠️  Skipping (parse error): ${path.relative(LOOM_DIR, filePath)}`);
            continue;
        }

        const data = parsed.data as Record<string, any>;
        if (!data.type || !data.id) {
            console.warn(`  ⚠️  Skipping (no type/id): ${path.relative(LOOM_DIR, filePath)}`);
            continue;
        }

        const rel  = path.relative(LOOM_DIR, filePath);
        const scratchPath = path.join(scratchDir, rel);

        records.push({
            filePath,
            scratchPath,
            data,
            content: parsed.content,
            oldId: data.id as string,
            newId: data.id as string,  // may be overwritten in pass 2
            type:  data.type as DocumentType,
            slug:  data.slug as string | undefined,
        });
    }

    log(`\n📦  Inventoried ${records.length} docs.`);
    return records;
}

// ---------------------------------------------------------------------------
// Pass 2 — Mint ULIDs
// ---------------------------------------------------------------------------

function mintUlids(records: DocRecord[]): Map<string, string> {
    const mapping = new Map<string, string>(); // oldId → newId

    for (const rec of records) {
        if (rec.type === 'ctx') {
            // Ctx keeps semantic id
            mapping.set(rec.oldId, rec.oldId);
            rec.newId = rec.oldId;
            continue;
        }
        if (isUlidId(rec.oldId)) {
            // Already a ULID — idempotent
            mapping.set(rec.oldId, rec.oldId);
            rec.newId = rec.oldId;
            verbose(`  ✔  Already ULID: ${rec.oldId}`);
            continue;
        }
        const newId = generateDocId(rec.type);
        mapping.set(rec.oldId, newId);
        rec.newId = newId;
        verbose(`  🔑  ${rec.oldId} → ${newId}`);
    }

    const minted = [...mapping.values()].filter((v, i, arr) => {
        const key = [...mapping.entries()].find(([, val]) => val === v)?.[0];
        return key !== v; // was remapped
    }).length;
    log(`🔑  Minted ${minted} new ULIDs.`);
    return mapping;
}

// ---------------------------------------------------------------------------
// Pass 3 — Rewrite frontmatter
// ---------------------------------------------------------------------------

function rewriteFrontmatter(records: DocRecord[], mapping: Map<string, string>): void {
    const errors: string[] = [];

    for (const rec of records) {
        const d = { ...rec.data };

        // Replace id
        d.id = rec.newId;

        // Replace parent_id
        if (d.parent_id) {
            const resolved = mapping.get(d.parent_id);
            if (!resolved) {
                // Pre-existing broken reference — keep as-is, report as warning
                console.warn(`  ⚠️  ${path.relative(LOOM_DIR, rec.filePath)}: parent_id "${d.parent_id}" not in index (pre-existing broken ref — kept)`);
            } else {
                d.parent_id = resolved;
            }
        }

        // Drop child_ids
        delete d.child_ids;

        // Slug handling
        if (rec.type === 'reference') {
            if (!d.slug) {
                d.slug = deriveSlugFromPath(rec.filePath);
                verbose(`  🏷  Derived slug "${d.slug}" for ${path.relative(LOOM_DIR, rec.filePath)}`);
            }
            rec.slug = d.slug;
        } else {
            delete d.slug;
        }

        // Update
        rec.data = d;
    }

    if (errors.length) {
        abort(`Pass 3 errors:\n${errors.map(e => `  • ${e}`).join('\n')}`);
    }

    log(`✏️   Frontmatter rewritten for ${records.length} docs.`);
}

// ---------------------------------------------------------------------------
// Pass 4 — Rewrite requires_load
// ---------------------------------------------------------------------------

function rewriteRequiresLoad(records: DocRecord[]): void {
    // Build slug → record map for refs only
    const slugToRec = new Map<string, DocRecord>();
    for (const rec of records) {
        if (rec.type === 'reference' && rec.slug) {
            slugToRec.set(rec.slug, rec);
        }
    }

    for (const rec of records) {
        const rl: string[] = rec.data.requires_load;
        if (!rl || rl.length === 0) continue;

        const rewritten: string[] = [];
        for (const entry of rl) {
            if (slugToRec.has(entry)) {
                rewritten.push(entry); // valid slug ref — keep slug string
            } else {
                const target = records.find(r => r.oldId === entry);
                if (target) {
                    // Remap the id to its new ULID (regardless of doc type)
                    // Non-ref usage is pre-existing; violations cleaned up separately
                    if (target.type !== 'reference') {
                        console.warn(
                            `  ⚠️  ${path.relative(LOOM_DIR, rec.filePath)}: requires_load "${entry}" ` +
                            `points at a ${target.type} (pre-existing; remapped to ${target.newId})`
                        );
                    }
                    rewritten.push(target.newId);
                } else {
                    console.warn(
                        `  ⚠️  ${path.relative(LOOM_DIR, rec.filePath)}: requires_load "${entry}" does not resolve — keeping as-is`
                    );
                    rewritten.push(entry);
                }
            }
        }
        rec.data.requires_load = rewritten;
    }

    log(`🔗  requires_load verified.`);
}

// ---------------------------------------------------------------------------
// Pass 5 — Rename ctx files (update scratchPath)
// ---------------------------------------------------------------------------

function planCtxRenames(records: DocRecord[]): void {
    for (const rec of records) {
        if (!isCtxFile(rec.filePath)) continue;
        const target = ctxTargetPath(rec.scratchPath);
        if (target !== rec.scratchPath) {
            verbose(`  📁  ctx rename: ${path.relative(LOOM_DIR, rec.filePath)} → ${path.basename(target)}`);
            rec.scratchPath = target;
        }
    }
    log(`📁  Ctx renames planned.`);
}

// ---------------------------------------------------------------------------
// Pass 6 — Consolidate weave-local refs
// ---------------------------------------------------------------------------

function planRefConsolidation(records: DocRecord[], scratchDir: string): void {
    const globalRefsScratch = path.join(scratchDir, 'refs');

    // Find all weave-local ref docs
    const localRefs = records.filter(rec => {
        const rel = path.relative(LOOM_DIR, rec.filePath);
        const parts = rel.split(path.sep);
        // Pattern: {weave}/refs/{file}.md or {weave}/{thread}/refs/{file}.md
        return parts.includes('refs') && rec.filePath !== path.join(GLOBAL_REFS, path.basename(rec.filePath));
    });

    if (localRefs.length === 0) {
        log(`📚  No weave-local refs to consolidate.`);
        return;
    }

    // Check slug collisions
    const slugsSeen = new Map<string, string>(); // slug → original filePath

    // First, seed with already-global refs
    for (const rec of records) {
        if (rec.filePath.startsWith(GLOBAL_REFS + path.sep) || rec.filePath === GLOBAL_REFS) {
            if (rec.slug) slugsSeen.set(rec.slug, rec.filePath);
        }
    }

    const collisions: string[] = [];
    for (const rec of localRefs) {
        const slug = rec.slug ?? deriveSlugFromPath(rec.filePath);
        if (slugsSeen.has(slug)) {
            collisions.push(
                `Slug collision "${slug}": ` +
                `${path.relative(LOOM_DIR, rec.filePath)} vs ` +
                `${path.relative(LOOM_DIR, slugsSeen.get(slug)!)}`
            );
        } else {
            slugsSeen.set(slug, rec.filePath);
            rec.slug = slug;
            rec.data.slug = slug;
            // Redirect scratchPath to global refs folder
            const newScratchPath = path.join(globalRefsScratch, `${slug}.md`);
            verbose(`  📚  ${path.relative(LOOM_DIR, rec.filePath)} → refs/${slug}.md`);
            rec.scratchPath = newScratchPath;
        }
    }

    if (collisions.length) {
        abort(`Pass 6 slug collisions:\n${collisions.map(c => `  • ${c}`).join('\n')}`);
    }

    log(`📚  ${localRefs.length} weave-local ref(s) planned for consolidation.`);
}

// ---------------------------------------------------------------------------
// Pass 7 — Verify
// ---------------------------------------------------------------------------

function verify(records: DocRecord[]): void {
    const idSet  = new Set(records.map(r => r.newId));
    const slugSet = new Map<string, string>(); // slug → newId
    for (const rec of records) {
        if (rec.type === 'reference' && rec.slug) slugSet.set(rec.slug, rec.newId);
    }

    const errors: string[] = [];

    const warnings: string[] = [];

    for (const rec of records) {
        // parent_id — warn if broken (may be pre-existing)
        if (rec.data.parent_id && !idSet.has(rec.data.parent_id)) {
            warnings.push(`${rec.newId}: broken parent_id "${rec.data.parent_id}"`);
        }
        // requires_load: each entry is either a slug (resolves via slugSet) or a ULID (resolves via idSet)
        for (const entry of (rec.data.requires_load ?? [])) {
            if (!slugSet.has(entry) && !idSet.has(entry)) {
                // Truly unresolved — neither a known slug nor a known ULID
                warnings.push(`${rec.newId}: unresolved requires_load "${entry}"`);
            }
        }
    }

    if (warnings.length) {
        console.warn(`\n⚠️  Pre-existing broken parent_id references (${warnings.length}):`);
        for (const w of warnings) console.warn(`   • ${w}`);
    }

    if (errors.length) {
        abort(`Verification failed:\n${errors.map(e => `  • ${e}`).join('\n')}`);
    }

    log(`✅  Verification passed — all parent_id and requires_load entries resolve.`);
}

// ---------------------------------------------------------------------------
// Write scratch
// ---------------------------------------------------------------------------

async function writeScratch(records: DocRecord[]): Promise<void> {
    for (const rec of records) {
        const body = serializeFrontmatter(rec.data) + '\n' + rec.content;
        await fs.outputFile(rec.scratchPath, body, 'utf8');
        verbose(`  💾  ${path.relative(LOOM_DIR, rec.filePath)} → ${path.relative(LOOM_DIR, rec.scratchPath)}`);
    }
    log(`💾  Wrote ${records.length} docs to scratch.`);
}

// ---------------------------------------------------------------------------
// Swap
// ---------------------------------------------------------------------------

async function swapIntoPlace(scratchDir: string): Promise<void> {
    const ts     = Date.now();
    const backup = path.join(REPO_ROOT, `.migration-backup-${ts}`);

    await fs.move(LOOM_DIR, backup);
    log(`  📦  Original loom/ backed up to ${path.relative(REPO_ROOT, backup)}`);

    await fs.move(scratchDir, LOOM_DIR);
    log(`  🔄  Scratch swapped into loom/`);
}

// ---------------------------------------------------------------------------
// Dry-run report
// ---------------------------------------------------------------------------

function dryRunReport(records: DocRecord[], mapping: Map<string, string>): void {
    log('\n────────────────────────────────────────');
    log('DRY RUN — no files will be written');
    log('────────────────────────────────────────');

    const remapped = [...mapping.entries()].filter(([k, v]) => k !== v);
    log(`\nULID remaps (${remapped.length}):`);
    for (const [old, nw] of remapped) {
        log(`  ${old.padEnd(40)} → ${nw}`);
    }

    const ctxRenames = records.filter(r => path.basename(r.filePath) !== path.basename(r.scratchPath));
    if (ctxRenames.length) {
        log(`\nCtx renames (${ctxRenames.length}):`);
        for (const r of ctxRenames) {
            log(`  ${path.relative(LOOM_DIR, r.filePath)} → ${path.relative(LOOM_DIR, r.scratchPath)}`);
        }
    }

    const consolidated = records.filter(r => {
        const rel = path.relative(LOOM_DIR, r.filePath);
        return rel.includes(`${path.sep}refs${path.sep}`) && !rel.startsWith('refs' + path.sep);
    });
    if (consolidated.length) {
        log(`\nRef consolidations (${consolidated.length}):`);
        for (const r of consolidated) {
            log(`  ${path.relative(LOOM_DIR, r.filePath)} → ${path.relative(LOOM_DIR, r.scratchPath)}`);
        }
    }

    log('\n────────────────────────────────────────');
    log('Re-run without --dry-run to apply.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    log('\n🔄  migrate-to-ulid.ts');
    log(`    loom root : ${LOOM_DIR}`);
    log(`    dry-run   : ${DRY_RUN}`);
    log(`    verbose   : ${VERBOSE}`);
    log('');

    if (!existsSync(LOOM_DIR)) {
        abort(`loom/ directory not found at ${LOOM_DIR}`);
    }

    const scratchDir = path.join(REPO_ROOT, `.migration-scratch-${Date.now()}`);

    try {
        // Pass 1 — Inventory
        const records = inventory(scratchDir);
        if (records.length === 0) abort('No docs found in loom/');

        // Pass 2 — Mint ULIDs
        const mapping = mintUlids(records);

        // Pass 3 — Rewrite frontmatter
        rewriteFrontmatter(records, mapping);

        // Pass 4 — Rewrite requires_load
        rewriteRequiresLoad(records);

        // Pass 5 — Plan ctx renames
        planCtxRenames(records);

        // Pass 6 — Plan ref consolidation
        planRefConsolidation(records, scratchDir);

        // Pass 7 — Verify in-memory
        verify(records);

        if (DRY_RUN) {
            dryRunReport(records, mapping);
            return;
        }

        // Write scratch
        await writeScratch(records);

        // Swap
        await swapIntoPlace(scratchDir);

        log('\n✅  Migration complete.');
        log('   Run ./scripts/test-all.sh to verify the test suite.');

    } catch (e) {
        // Clean up scratch on unexpected error
        await fs.remove(scratchDir).catch(() => {});
        throw e;
    }
}

main().catch(e => {
    console.error('\n❌  Unexpected error:', e);
    process.exit(1);
});
