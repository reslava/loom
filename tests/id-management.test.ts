import * as path from 'path';
import * as fs from 'fs-extra';
import * as fsNative from 'fs';
import * as os from 'os';
import { runLoom, assert, createDesignDoc } from './test-utils.ts';

async function testIdManagement() {
    console.log('🧵 Running ID management tests...\n');

    const globalLoomPath = path.join(os.homedir(), 'looms', 'default');
    const weavePath = path.join(globalLoomPath, 'loom', 'id-test');
    
    await fs.remove(weavePath);
    await fs.ensureDir(weavePath);

    console.log('  • Testing `loom weave idea` generates temporary ID...');
    process.chdir(globalLoomPath);
    let result = runLoom('weave idea "Temporary Test" --weave id-test --loose');
    assert(result.exitCode === 0, `weave idea failed: ${result.stderr}`);
    
    const tempIdMatch = result.stdout.match(/new-\d+-idea/);
    assert(tempIdMatch !== null, 'Temporary ID not found in output');
    const tempId = tempIdMatch![0];
    console.log(`    ✅ Temporary ID generated: ${tempId}`);

    console.log('  • Testing `loom finalize` generates permanent ID...');
    result = runLoom(`finalize ${tempId}`);
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
        'child_ids: []',
        `child_ids: [${permanentId}]`
    );
    await fs.outputFile(designPath, updatedContent);
    
    result = runLoom(`rename ${permanentId} "Renamed Title"`);
    assert(result.exitCode === 0, `rename failed: ${result.stderr}`);
    
    const renamedIdMatch = result.stdout.match(/New ID: ([a-z0-9-]+)/);
    assert(renamedIdMatch !== null, 'Could not parse renamed ID');
    const renamedId = renamedIdMatch![1];
    
    assert(result.stdout.includes('Updated 1 reference'), 'Reference count mismatch');
    
    const updatedDesign = fsNative.readFileSync(designPath, 'utf8');
    assert(updatedDesign.includes(`child_ids: [${renamedId}]`), 'Reference not updated in design');
    console.log('    ✅ Rename updated references correctly');

    console.log('  • Testing draft rejection...');
    result = runLoom('weave idea "Draft Test" --weave id-test --loose');
    const draftIdMatch = result.stdout.match(/new-\d+-idea/);
    const draftId = draftIdMatch![0];
    
    result = runLoom(`rename ${draftId} "Should Fail"`);
    assert(result.exitCode !== 0, 'Should not allow renaming draft');
    assert(result.stderr.includes('Draft documents cannot be renamed'), 'Wrong error message');
    console.log('    ✅ Draft documents rejected');

    await fs.remove(weavePath);
    console.log('\n✨ All ID management tests passed!\n');
}

testIdManagement().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});