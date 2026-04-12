#!/usr/bin/env node
/**
 * Reslava Docs Migration Script
 *
 * Reads a migration plan JSON file and executes the file moves/renames.
 * Does NOT modify file content—use an AI agent for frontmatter updates.
 */

const fs = require('fs-extra');
const path = require('path');

// Configuration
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
//const WORKSPACE_ROOT = 'J:\src\reslava-workflow-vsix\workflow-design.md';
const MIGRATION_PLAN_PATH = path.join(WORKSPACE_ROOT, '.wf/migration-plan.json');
const BACKUP_DIR = path.join(WORKSPACE_ROOT, '_backup', new Date().toISOString().replace(/[:.]/g, '-'));

async function backupFile(filePath) {
    const dest = path.join(BACKUP_DIR, path.relative(WORKSPACE_ROOT, filePath));
    await fs.ensureDir(path.dirname(dest));
    await fs.copy(filePath, dest);
    console.log(`  📦 Backed up: ${path.relative(WORKSPACE_ROOT, filePath)}`);
}

async function migrate() {
    console.log('🚀 Starting Reslava docs migration...\n');

    // 1. Check for plan file
    if (!await fs.pathExists(MIGRATION_PLAN_PATH)) {
        console.error(`❌ Migration plan not found at: ${MIGRATION_PLAN_PATH}`);
        console.error('   Please create a JSON plan file with the following structure:');
        console.error('   {');
        console.error('     "operations": [');
        console.error('       { "action": "move", "source": "designs/old.md", "dest": "features/core-engine/design.md" },');
        console.error('       { "action": "delete", "source": "ideas/old-idea.md" }');
        console.error('     ]');
        console.error('   }');
        process.exit(1);
    }

    const plan = await fs.readJson(MIGRATION_PLAN_PATH);

    // 2. Create backup directory
    await fs.ensureDir(BACKUP_DIR);
    console.log(`💾 Backup directory: ${BACKUP_DIR}\n`);

    // 3. Execute operations
    for (const op of plan.operations) {
        const sourcePath = path.join(WORKSPACE_ROOT, op.source);
        const destPath = op.dest ? path.join(WORKSPACE_ROOT, op.dest) : null;

        if (!await fs.pathExists(sourcePath)) {
            console.warn(`⚠️  Source not found, skipping: ${op.source}`);
            continue;
        }

        switch (op.action) {
            case 'move':
                await backupFile(sourcePath);
                await fs.ensureDir(path.dirname(destPath));
                await fs.move(sourcePath, destPath, { overwrite: true });
                console.log(`  ✅ MOVED: ${op.source} → ${op.dest}`);
                break;

            case 'copy':
                await fs.ensureDir(path.dirname(destPath));
                await fs.copy(sourcePath, destPath, { overwrite: true });
                console.log(`  📋 COPIED: ${op.source} → ${op.dest}`);
                break;

            case 'delete':
                await backupFile(sourcePath);
                await fs.remove(sourcePath);
                console.log(`  🗑️  DELETED: ${op.source}`);
                break;

            default:
                console.warn(`  ❓ Unknown action: ${op.action}`);
        }
    }

    console.log('\n✨ Migration complete!');
    console.log(`   Review changes and then run 'rm -rf ${BACKUP_DIR}' to clean up backup.`);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});