import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { existsSync } from 'fs';
import { setupTestLoom, cleanupTestLoom, runLoom, assert, TEST_ROOT } from './test-utils.ts';

async function testMultiLoom() {
    console.log('🧵 Running multi‑loom tests...\n');

    const timestamp = Date.now();
    const loomA = `test-loom-a-${timestamp}`;
    const loomB = `test-loom-b-${timestamp}`;

    // neutral dir: no .loom/ — required for all multi-loom commands
    const neutralPath = TEST_ROOT;
    await fs.ensureDir(neutralPath);

    // paths where setup will create the looms
    const loomAPath = path.join(os.homedir(), 'looms', loomA);
    const loomBPath = path.join(os.homedir(), 'looms', loomB);

    // --- Multi-loom commands ---

    // 1. Create loom-a (auto-activated)
    console.log(`  • Testing \`loom setup ${loomA}\`...`);
    let result = runLoom(`setup ${loomA}`, neutralPath);
    assert(result.exitCode === 0, `loom setup failed: ${result.stderr}`);
    assert(result.stdout.includes('created and activated'), 'Missing activation message');
    console.log('    ✅ loom setup works');

    // 2. Create loom-b without switching
    console.log(`  • Testing \`loom setup ${loomB} --no-switch\`...`);
    result = runLoom(`setup ${loomB} --no-switch`, neutralPath);
    assert(result.exitCode === 0, `loom setup --no-switch failed: ${result.stderr}`);
    assert(result.stdout.includes('created'), 'Missing created message');
    console.log('    ✅ loom setup --no-switch works');

    // 3. List looms — both present, loom-a active
    console.log('  • Testing `loom list`...');
    result = runLoom('list', neutralPath);
    assert(result.exitCode === 0, `loom list failed: ${result.stderr}`);
    assert(result.stdout.includes(loomA), `${loomA} missing from list`);
    assert(result.stdout.includes(loomB), `${loomB} missing from list`);
    assert(result.stdout.includes('★'), 'Active loom indicator missing');
    console.log('    ✅ loom list works');

    // 4. Current — loom-a is active
    console.log('  • Testing `loom current`...');
    result = runLoom('current', neutralPath);
    assert(result.exitCode === 0, `loom current failed: ${result.stderr}`);
    assert(result.stdout.includes(loomA), `Expected ${loomA} to be current`);
    console.log('    ✅ loom current works');

    // 5. Switch to loom-b
    console.log(`  • Testing \`loom switch ${loomB}\`...`);
    result = runLoom(`switch ${loomB}`, neutralPath);
    assert(result.exitCode === 0, `loom switch failed: ${result.stderr}`);
    assert(result.stdout.includes('Switched to loom'), 'Missing switch message');
    console.log('    ✅ loom switch works');

    // 6. Current — loom-b is now active
    console.log('  • Testing `loom current` after switch...');
    result = runLoom('current', neutralPath);
    assert(result.exitCode === 0, `loom current failed: ${result.stderr}`);
    assert(result.stdout.includes(loomB), `Expected ${loomB} to be current`);
    console.log('    ✅ loom current reflects switch');

    // 7. Switch to non-existent loom (should fail)
    console.log('  • Testing `loom switch does-not-exist` (expected to fail)...');
    result = runLoom('switch does-not-exist', neutralPath);
    assert(result.exitCode !== 0, 'Should have failed for non-existent loom');
    console.log('    ✅ Correctly rejected invalid switch');

    // --- Mono-loom guard ---

    // 8. loom switch is rejected inside a mono-loom project
    console.log('  • Testing `loom switch` inside mono-loom (expected to fail)...');
    const monoLoomPath = await setupTestLoom('mono-loom-guard');
    runLoom('init', monoLoomPath); // creates .loom/ inside
    result = runLoom(`switch ${loomA}`, monoLoomPath);
    assert(result.exitCode !== 0, 'Should have rejected switch inside mono-loom project');
    console.log('    ✅ loom switch correctly blocked inside mono-loom project');

    // --- loom init (mono-loom) ---

    // 9. loom init creates workspace dirs
    console.log('  • Testing `loom init`...');
    const initPath = await setupTestLoom('mono-loom-init');
    result = runLoom('init', initPath);
    assert(result.exitCode === 0, `loom init failed: ${result.stderr}`);
    assert(result.stdout.includes('initialized'), 'Missing initialized message');
    assert(existsSync(path.join(initPath, '.loom')), '.loom dir not created');
    assert(existsSync(path.join(initPath, 'loom')), 'loom dir not created');
    assert(existsSync(path.join(initPath, 'loom', 'refs')), 'loom/refs dir not created');
    console.log('    ✅ loom init creates correct directory structure');

    // --- Cleanup ---
    console.log('  • Cleaning up...');
    await Promise.all([
        cleanupTestLoom(monoLoomPath).catch(() => {}),
        cleanupTestLoom(initPath).catch(() => {}),
        fs.remove(loomAPath).catch(() => {}),
        fs.remove(loomBPath).catch(() => {}),
    ]);

    console.log('\n✨ All multi‑loom tests passed!\n');
}

testMultiLoom().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});
