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
    let result = runLoom('weave idea "Temporary Test" --weave id-test --loose', loomRoot);
    assert(result.exitCode === 0, `weave idea failed: ${result.stderr}`);

    const tempIdMatch = result.stdout.match(/id_[0-9A-Z]{26}/);
    assert(tempIdMatch !== null, 'ULID not found in output');
    const tempId = tempIdMatch![0];
    console.log(`    ✅ ULID generated: ${tempId}`);

    console.log('  • Testing `loom finalize` generates permanent ID...');
    result = runLoom(`finalize ${tempId}`, loomRoot);
    assert(result.exitCode === 0, `finalize failed: ${result.stderr}`);
    
    const newIdMatch = result.stdout.match(/New ID: ([a-z0-9-]+)/);
    assert(newIdMatch !== null, 'Could not parse new ID from output');
    const permanentId = newIdMatch![1];
    console.log(`    ✅ Finalized to: ${permanentId}`);
    
    const permPath = path.join(weavePath, `${permanentId}.md`);
    assert(fsNative.existsSync(permPath), `Permanent file not created at ${permPath}`);
    
    const oldPath = path.join(weavePath, `${tempId}.md`);
    assert(!fsNative.existsSync(oldPath), 'Temporary file not removed');
    console.log(`    ✅ Permanent file created`);

    console.log('  • Testing `loom rename` updates ID and references...');
    
    const designPath = path.join(weavePath, 'reference-test-design.md');
    await createDesignDoc(weavePath, 'reference-test', { role: 'primary', status: 'active' });
    
    const designContent = fsNative.readFileSync(designPath, 'utf8');
    const updatedContent = designContent.replace(
        'parent_id: null',
        `parent_id: ${permanentId}`
    );
    await fs.outputFile(designPath, updatedContent);
    
    result = runLoom(`rename ${permanentId} "Renamed Title"`, loomRoot);
    assert(result.exitCode === 0, `rename failed: ${result.stderr}`);
    
    const renamedIdMatch = result.stdout.match(/New ID: ([a-z0-9-]+)/);
    assert(renamedIdMatch !== null, 'Could not parse renamed ID');
    const renamedId = renamedIdMatch![1];
    
    assert(result.stdout.includes('Updated 1 reference'), 'Reference count mismatch');
    
    const updatedDesign = fsNative.readFileSync(designPath, 'utf8');
    assert(updatedDesign.includes(`parent_id: ${renamedId}`), 'Reference not updated in design');
    console.log('    ✅ Rename updated references correctly');

    console.log('  • Testing draft rejection...');
    result = runLoom('weave idea "Draft Test" --weave id-test --loose', loomRoot);
    const draftIdMatch = result.stdout.match(/id_[0-9A-Z]{26}/);
    const draftId = draftIdMatch![0];
    
    result = runLoom(`rename ${draftId} "Should Fail"`, loomRoot);
    assert(result.exitCode !== 0, 'Should not allow renaming draft');
    assert(result.stderr.includes('Draft documents cannot be renamed'), 'Wrong error message');
    console.log('    ✅ Draft documents rejected');

    await fs.remove(loomRoot);
    console.log('\n✨ All ID management tests passed!\n');
}

testIdManagement().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});