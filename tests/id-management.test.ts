import * as path from 'path';
import * as fs from 'fs-extra';
import * as fsNative from 'fs';
import { runLoom, assert, createDesignDoc, setupHermeticLoom } from './test-utils.ts';

async function testIdManagement() {
    console.log('🧵 Running ID management tests...\n');

    const loomRoot = await setupHermeticLoom('loom-id-tests');
    const weavePath = path.join(loomRoot, 'loom', 'id-test');
    await fs.ensureDir(weavePath);

    console.log('  • Testing `loom weave idea` generates ULID...');
    let result = runLoom('weave idea "Temporary Test" --weave id-test', loomRoot);
    assert(result.exitCode === 0, `weave idea failed: ${result.stderr}`);

    const tempIdMatch = result.stdout.match(/id_[0-9A-Z]{26}/);
    assert(tempIdMatch !== null, 'ULID not found in output');
    const tempId = tempIdMatch![0];
    console.log(`    ✅ ULID generated: ${tempId}`);

    console.log('  • Testing `loom finalize` flips status to active, keeps the ULID id...');
    // The draft is created with its final slug filename + a permanent ULID id;
    // finalize only flips draft -> active. Identity (id) and filename are preserved.
    // New scheme: the idea lives in a thread (auto-named from the title) as the flat idea.md.
    const draftPath = path.join(weavePath, 'temporary-test', 'idea.md');
    assert(fsNative.existsSync(draftPath), `Draft file not at expected thread path ${draftPath}`);

    result = runLoom(`finalize ${tempId}`, loomRoot);
    assert(result.exitCode === 0, `finalize failed: ${result.stderr}`);

    // Output reports the unchanged ULID, not a re-minted slug id.
    assert(result.stdout.includes(`ID (unchanged): ${tempId}`), 'Finalize must not change the id');
    console.log(`    ✅ Finalized, id preserved: ${tempId}`);

    // Filename unchanged (no re-mint, no move), id still the ULID, status now active.
    const permPath = draftPath;
    assert(fsNative.existsSync(permPath), 'Finalized file should stay at its slug path');
    const finalizedDoc = fsNative.readFileSync(permPath, 'utf8');
    assert(finalizedDoc.includes(`id: ${tempId}`), 'Frontmatter id should remain the ULID');
    assert(finalizedDoc.includes('status: active'), 'Status should be active after finalize');
    console.log(`    ✅ Filename + ULID preserved, status active`);

    console.log('  • Testing `loom rename` changes the title only (id + filename stable)...');

    const designPath = path.join(weavePath, 'reference-test-design.md');
    await createDesignDoc(weavePath, 'reference-test', { role: 'primary', status: 'active' });

    const designContent = fsNative.readFileSync(designPath, 'utf8');
    const updatedContent = designContent.replace(
        'parent_id: null',
        `parent_id: ${tempId}`
    );
    await fs.outputFile(designPath, updatedContent);

    result = runLoom(`rename ${tempId} "Renamed Title"`, loomRoot);
    assert(result.exitCode === 0, `rename failed: ${result.stderr}`);

    // Identity is permanent: rename must NOT change the id, only the title.
    assert(result.stdout.includes(`ID (unchanged): ${tempId}`), 'Rename should not change the id');
    assert(result.stdout.includes('Title: Renamed Title'), 'Rename should report the new title');

    // The file is not moved (filename is the stable human slug, decoupled from title).
    assert(fsNative.existsSync(permPath), 'Renamed doc file should stay at its original path');

    // Frontmatter title and body H1 are both synced to the new title.
    const renamedDoc = fsNative.readFileSync(permPath, 'utf8');
    assert(renamedDoc.includes('title: "Renamed Title"') || renamedDoc.includes('title: Renamed Title'),
        'Frontmatter title not synced');
    assert(renamedDoc.includes('# Renamed Title'), 'Body H1 not synced to new title');

    // The backlink still resolves because the id never changed — nothing to rewrite.
    const updatedDesign = fsNative.readFileSync(designPath, 'utf8');
    assert(updatedDesign.includes(`parent_id: ${tempId}`), 'Backlink should still point at the unchanged id');
    console.log('    ✅ Rename changed title + H1, left id/filename/backlinks intact');

    console.log('  • Testing draft docs are renamable (id + filename stable, title mutable)...');
    result = runLoom('weave idea "Draft Test" --weave id-test', loomRoot);
    const draftIdMatch = result.stdout.match(/id_[0-9A-Z]{26}/);
    const draftId = draftIdMatch![0];

    // Draft title rename is allowed now: identity is the permanent ULID and the filename
    // is decoupled from the title, so there's nothing provisional to protect.
    result = runLoom(`rename ${draftId} "Renamed Draft"`, loomRoot);
    assert(result.exitCode === 0, `renaming a draft should succeed: ${result.stderr}`);
    assert(result.stdout.includes(`ID (unchanged): ${draftId}`), 'draft rename must keep the id');
    console.log('    ✅ Draft documents renamable, id preserved');

    await fs.remove(loomRoot);
    console.log('\n✨ All ID management tests passed!\n');
}

testIdManagement().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});