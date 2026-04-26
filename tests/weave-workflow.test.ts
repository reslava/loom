import * as path from 'path';
import * as fs from 'fs-extra';
import * as fsNative from 'fs';
import * as os from 'os';
import { runLoom, assert } from './test-utils.ts';

async function testWeaveWorkflow() {
    console.log('🧵 Running weave workflow tests...\n');

    const globalLoomPath = path.join(os.homedir(), 'looms', 'default');
    const weavePath = path.join(globalLoomPath, 'loom', 'workflow-test');
    
    await fs.remove(weavePath);
    await fs.ensureDir(weavePath);
    process.chdir(globalLoomPath);

    console.log('  • Testing `loom weave idea`...');
    let result = runLoom('weave idea "Workflow Test" --weave workflow-test');
    assert(result.exitCode === 0, `weave idea failed: ${result.stderr}`);
    
    const tempIdMatch = result.stdout.match(/new-\d+-idea/);
    assert(tempIdMatch !== null, 'Temporary ID not found in output');
    const tempId = tempIdMatch![0];
    console.log(`    ✅ Idea created with temp ID: ${tempId}`);
    
    const tempIdeaPath = path.join(weavePath, `${tempId}.md`);
    assert(fsNative.existsSync(tempIdeaPath), 'Temporary idea file not created');

    console.log('  • Testing `loom weave design` with auto‑finalize...');
    result = runLoom('weave design workflow-test');
    assert(result.exitCode === 0, `weave design failed: ${result.stderr}`);
    
    assert(result.stdout.includes('Idea auto-finalized'), 'Auto‑finalize message missing');
    
    const designIdMatch = result.stdout.match(/ID: ([a-z0-9-]+)/);
    assert(designIdMatch !== null, 'Design ID not found in output');
    const designId = designIdMatch![1];
    console.log(`    ✅ Design created with ID: ${designId}`);
    
    const permanentIdeaPath = path.join(weavePath, 'workflow-test-idea.md');
    assert(fsNative.existsSync(permanentIdeaPath), 'Permanent idea file not created');
    assert(!fsNative.existsSync(tempIdeaPath), 'Temporary idea file not removed');
    
    const designPath = path.join(weavePath, `${designId}.md`);
    assert(fsNative.existsSync(designPath), 'Design file not created');
    
    const designContent = fsNative.readFileSync(designPath, 'utf8');
    assert(designContent.includes('parent_id: workflow-test-idea'), 'Design parent_id not set to idea');

    console.log('  • Testing `loom weave plan` (anchor-free)...');
    result = runLoom('weave plan workflow-test');
    assert(result.exitCode === 0, `weave plan failed: ${result.stderr}`);

    const planIdMatch = result.stdout.match(/ID: ([a-z0-9-]+)/);
    assert(planIdMatch !== null, 'Plan ID not found in output');
    const planId = planIdMatch![1];
    console.log(`    ✅ Plan created with ID: ${planId}`);

    // Anchor-free: design is NOT auto-finalized when a plan is created
    const updatedDesignContent = fsNative.readFileSync(designPath, 'utf8');
    assert(!updatedDesignContent.includes('status: done'), 'Design should not be auto-finalized by weavePlan');

    const planPath = path.join(weavePath, 'plans', `${planId}.md`);
    assert(fsNative.existsSync(planPath), 'Plan file not created');

    // Anchor-free: plan has no parent_id by default (user links manually)
    const planContent = fsNative.readFileSync(planPath, 'utf8');
    assert(planContent.includes('parent_id: null'), 'Plan should have null parent_id in anchor-free mode');

    console.log('  • Verifying weave status...');
    result = runLoom('status workflow-test --verbose');
    assert(result.exitCode === 0, `status failed: ${result.stderr}`);
    assert(result.stdout.includes('Status: ACTIVE'), 'Weave status should be ACTIVE');
    assert(result.stdout.includes('Phase:  planning'), 'Weave phase should be planning');
    assert(result.stdout.includes('Designs: 1'), 'Design count not shown correctly');
    assert(result.stdout.includes('Plans:  1 (0 done)'), 'Plan count not shown correctly');
    console.log('    ✅ Weave status verified');

    await fs.remove(weavePath);
    console.log('\n✨ All weave workflow tests passed!\n');
}

testWeaveWorkflow().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});