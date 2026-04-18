import * as path from 'path';
import * as fs from 'fs-extra';
import * as fsNative from 'fs';
import * as os from 'os';
import { runLoom, assert } from './test-utils.ts';

async function testWeaveWorkflow() {
    console.log('🧵 Running weave workflow tests...\n');

    const globalLoomPath = path.join(os.homedir(), 'looms', 'default');
    const threadPath = path.join(globalLoomPath, 'threads', 'workflow-test');
    
    // Clean up any previous test remnants
    await fs.remove(threadPath);
    await fs.ensureDir(threadPath);
    process.chdir(globalLoomPath);

    // ============================================================================
    // 1. Weave Idea
    // ============================================================================
    console.log('  • Testing `loom weave idea`...');
    let result = runLoom('weave idea "Workflow Test" --thread workflow-test');
    assert(result.exitCode === 0, `weave idea failed: ${result.stderr}`);
    
    const tempIdMatch = result.stdout.match(/new-\d+-idea/);
    assert(tempIdMatch !== null, 'Temporary ID not found in output');
    const tempId = tempIdMatch![0];
    console.log(`    ✅ Idea created with temp ID: ${tempId}`);
    
    // Verify the temporary file exists
    const tempIdeaPath = path.join(threadPath, `${tempId}.md`);
    assert(fsNative.existsSync(tempIdeaPath), 'Temporary idea file not created');

    // ============================================================================
    // 2. Weave Design (auto‑finalizes idea)
    // ============================================================================
    console.log('  • Testing `loom weave design` with auto‑finalize...');
    result = runLoom('weave design workflow-test');
    assert(result.exitCode === 0, `weave design failed: ${result.stderr}`);
    
    // Verify auto‑finalize message
    assert(result.stdout.includes('Idea auto-finalized'), 'Auto‑finalize message missing');
    
    // Extract design ID
    const designIdMatch = result.stdout.match(/ID: ([a-z0-9-]+)/);
    assert(designIdMatch !== null, 'Design ID not found in output');
    const designId = designIdMatch![1];
    console.log(`    ✅ Design created with ID: ${designId}`);
    
    // Verify idea was finalized (temp file removed, permanent file created)
    const permanentIdeaPath = path.join(threadPath, 'workflow-test-idea.md');
    assert(fsNative.existsSync(permanentIdeaPath), 'Permanent idea file not created');
    assert(!fsNative.existsSync(tempIdeaPath), 'Temporary idea file not removed');
    
    // Verify design file exists
    const designPath = path.join(threadPath, `${designId}.md`);
    assert(fsNative.existsSync(designPath), 'Design file not created');
    
    // Verify design has parent_id pointing to idea
    const designContent = fsNative.readFileSync(designPath, 'utf8');
    assert(designContent.includes('parent_id: workflow-test-idea'), 'Design parent_id not set to idea');

    // ============================================================================
    // 3. Weave Plan (auto‑finalizes design)
    // ============================================================================
    console.log('  • Testing `loom weave plan` with auto‑finalize...');
    result = runLoom('weave plan workflow-test');
    assert(result.exitCode === 0, `weave plan failed: ${result.stderr}`);
    
    // Verify auto‑finalize message
    assert(result.stdout.includes('Design auto-finalized'), 'Auto‑finalize message missing');
    
    // Extract plan ID
    const planIdMatch = result.stdout.match(/ID: ([a-z0-9-]+)/);
    assert(planIdMatch !== null, 'Plan ID not found in output');
    const planId = planIdMatch![1];
    console.log(`    ✅ Plan created with ID: ${planId}`);
    
    // Verify design status was updated to 'done'
    const updatedDesignContent = fsNative.readFileSync(designPath, 'utf8');
    assert(updatedDesignContent.includes('status: done'), 'Design status not updated to done');
    
    // Verify plan file exists
    const planPath = path.join(threadPath, 'plans', `${planId}.md`);
    assert(fsNative.existsSync(planPath), 'Plan file not created');
    
    // Verify plan has parent_id pointing to design
    const planContent = fsNative.readFileSync(planPath, 'utf8');
    assert(planContent.includes(`parent_id: ${designId}`), 'Plan parent_id not set to design');

    // ============================================================================
    // 4. Verify Thread Status
    // ============================================================================
    console.log('  • Verifying thread status...');
    result = runLoom('status workflow-test --verbose');
    assert(result.exitCode === 0, `status failed: ${result.stderr}`);
    assert(result.stdout.includes('Status: ACTIVE'), 'Thread status should be ACTIVE');
    assert(result.stdout.includes('Phase:  planning'), 'Thread phase should be planning');
    assert(result.stdout.includes('Workflow Test (v1)'), 'Design version not shown');
    assert(result.stdout.includes('Plans:  1 (0 done)'), 'Plan count not shown correctly');
    console.log('    ✅ Thread status verified');

    // ============================================================================
    // Cleanup
    // ============================================================================
    await fs.remove(threadPath);
    console.log('\n✨ All weave workflow tests passed!\n');
}

testWeaveWorkflow().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});