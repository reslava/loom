import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { runLoom, assert, createDesignDoc } from './test-utils';

async function testIdManagement() {
    console.log('🧵 Running ID management tests...\n');

    const globalLoomPath = path.join(os.homedir(), 'looms', 'default');
    const threadPath = path.join(globalLoomPath, 'threads', 'id-test');
    
    // Clean up any previous test remnants completely
    await fs.remove(threadPath);
    await fs.ensureDir(threadPath);

    // 1. Test temporary ID generation
    console.log('  • Testing `loom weave idea` generates temporary ID...');
    process.chdir(globalLoomPath);
    let result = runLoom('weave idea "Temporary Test" --thread id-test');
    assert(result.exitCode === 0, `weave idea failed: ${result.stderr}`);
    
    const tempIdMatch = result.stdout.match(/new-\d+-idea/);
    assert(tempIdMatch !== null, 'Temporary ID not found in output');
    const tempId = tempIdMatch![0];
    console.log(`    ✅ Temporary ID generated: ${tempId}`);

    // 2. Test finalize generates permanent ID
    console.log('  • Testing `loom finalize` generates permanent ID...');
    result = runLoom(`finalize ${tempId}`);
    assert(result.exitCode === 0, `finalize failed: ${result.stderr}`);
    
    // Extract the generated permanent ID from output
    const newIdMatch = result.stdout.match(/New ID: ([a-z0-9-]+)/);
    assert(newIdMatch !== null, 'Could not parse new ID from output');
    const permanentId = newIdMatch![1];
    console.log(`    ✅ Finalized to: ${permanentId}`);
    
    const permPath = path.join(threadPath, `${permanentId}.md`);
    assert(fs.existsSync(permPath), `Permanent file not created at ${permPath}`);
    
    const oldPath = path.join(threadPath, `${tempId}.md`);
    assert(!fs.existsSync(oldPath), 'Temporary file not removed');
    console.log(`    ✅ Permanent file created`);

    // 3. Test rename command
    console.log('  • Testing `loom rename` updates ID and references...');
    
    // Create a second document that references the first
    const designPath = path.join(threadPath, 'reference-test-design.md');
    await createDesignDoc(threadPath, 'reference-test', { role: 'primary', status: 'active' });
    
    // Manually update the design to reference the idea in its child_ids
    const designContent = await fs.readFile(designPath, 'utf8');
    const updatedContent = designContent.replace(
        'child_ids: []',
        `child_ids: [${permanentId}]`
    );
    await fs.writeFile(designPath, updatedContent);
    
    // Rename the idea
    result = runLoom(`rename ${permanentId} "Renamed Title"`);
    assert(result.exitCode === 0, `rename failed: ${result.stderr}`);
    
    // Extract the new ID from output
    const renamedIdMatch = result.stdout.match(/New ID: ([a-z0-9-]+)/);
    assert(renamedIdMatch !== null, 'Could not parse renamed ID');
    const renamedId = renamedIdMatch![1];
    
    assert(result.stdout.includes('Updated 1 reference'), 'Reference count mismatch');
    
    // Verify the referencing document was updated
    const updatedDesign = await fs.readFile(designPath, 'utf8');
    assert(updatedDesign.includes(`child_ids: [${renamedId}]`), 'Reference not updated in design');
    console.log('    ✅ Rename updated references correctly');

    // 4. Test that draft documents cannot be renamed
    console.log('  • Testing draft rejection...');
    result = runLoom('weave idea "Draft Test" --thread id-test');
    const draftIdMatch = result.stdout.match(/new-\d+-idea/);
    const draftId = draftIdMatch![0];
    
    result = runLoom(`rename ${draftId} "Should Fail"`);
    assert(result.exitCode !== 0, 'Should not allow renaming draft');
    assert(result.stderr.includes('Draft documents cannot be renamed'), 'Wrong error message');
    console.log('    ✅ Draft documents rejected');

    // Clean up
    await fs.remove(threadPath);
    console.log('\n✨ All ID management tests passed!\n');
}

testIdManagement().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});