import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { runLoom, assert, setupHermeticLoom } from './test-utils.ts';

// Round-trips the CLI twins of the human tree-management MCP tools (Plan A of the
// cli-management-command-parity thread) against a hermetic workspace, driven end
// to end through the globally-linked `loom` binary — exercising the slug→ULID edge
// resolution, not just the app use-cases.

function idFromStdout(stdout: string): string {
    const m = stdout.match(/ID:\s*(\S+)/);
    if (!m) throw new Error(`No "ID:" line in output:\n${stdout}`);
    return m[1];
}

async function run() {
    console.log('🧵 Running CLI tree-management command tests...\n');
    const loomRoot = await setupHermeticLoom('loom-tree-mgmt-tests');
    const loomDir = path.join(loomRoot, 'loom');

    // Scaffold: two weaves, several threads (all via the CLI itself).
    assert(runLoom('create weave demo', loomRoot).exitCode === 0, 'create weave demo');
    assert(runLoom('create weave demo2', loomRoot).exitCode === 0, 'create weave demo2');
    for (const t of ['t1', 't2', 'tmove', 'tarch', 'tdel']) {
        assert(runLoom(`create thread demo ${t}`, loomRoot).exitCode === 0, `create thread ${t}`);
    }
    console.log('    ✅ scaffolded demo/demo2 weaves + threads');

    // set-priority
    let r = runLoom('set-priority demo t1 42', loomRoot);
    assert(r.exitCode === 0 && r.stdout.includes('42'), `set-priority: ${r.stderr}`);
    console.log('    ✅ loom set-priority');

    // set-thread-deps (t1 → t2, same weave)
    r = runLoom('set-thread-deps demo t1 t2', loomRoot);
    assert(r.exitCode === 0 && r.stdout.includes('(1)'), `set-thread-deps: ${r.stderr}`);
    console.log('    ✅ loom set-thread-deps');

    // move-thread (tmove: demo → demo2)
    r = runLoom('move-thread demo tmove demo2', loomRoot);
    assert(r.exitCode === 0, `move-thread: ${r.stderr}`);
    assert(await fs.pathExists(path.join(loomDir, 'demo2', 'tmove')), 'tmove should now be under demo2');
    assert(!(await fs.pathExists(path.join(loomDir, 'demo', 'tmove'))), 'tmove should no longer be under demo');
    console.log('    ✅ loom move-thread');

    // archive + restore (tarch)
    r = runLoom('archive demo tarch', loomRoot);
    assert(r.exitCode === 0, `archive: ${r.stderr}`);
    assert(await fs.pathExists(path.join(loomDir, '.archive', 'demo', 'tarch')), 'tarch should be archived');
    assert(!(await fs.pathExists(path.join(loomDir, 'demo', 'tarch'))), 'tarch should leave its live path');
    r = runLoom('restore demo tarch', loomRoot);
    assert(r.exitCode === 0, `restore: ${r.stderr}`);
    assert(await fs.pathExists(path.join(loomDir, 'demo', 'tarch')), 'tarch should be restored');
    console.log('    ✅ loom archive + restore');

    // delete guard: no --yes in a non-TTY aborts and keeps the folder
    r = runLoom('delete demo tdel', loomRoot);
    assert(r.exitCode === 0 && /aborted/i.test(r.stdout), `delete guard should abort: ${r.stdout}`);
    assert(await fs.pathExists(path.join(loomDir, 'demo', 'tdel')), 'tdel must survive the aborted delete');
    // delete --yes actually removes it
    r = runLoom('delete demo tdel --yes', loomRoot);
    assert(r.exitCode === 0, `delete --yes: ${r.stderr}`);
    assert(!(await fs.pathExists(path.join(loomDir, 'demo', 'tdel'))), 'tdel must be gone after delete --yes');
    console.log('    ✅ loom delete (guard + --yes)');

    // promote: idea → design (content-supplied)
    const ideaId = idFromStdout(runLoom('create idea demo t1 "T1 idea"', loomRoot).stdout);
    // guard: no --body-file fails
    r = runLoom(`promote ${ideaId} design`, loomRoot);
    assert(r.exitCode !== 0 && /body-file/i.test(r.stderr), `promote without body should fail: ${r.stdout}${r.stderr}`);
    const bodyFile = path.join(os.tmpdir(), 'loom-promote-body.md');
    await fs.writeFile(bodyFile, '## Design\n\nPromoted design body.\n');
    r = runLoom(`promote ${ideaId} design --body-file "${bodyFile}"`, loomRoot);
    assert(r.exitCode === 0, `promote: ${r.stderr}`);
    assert(await fs.pathExists(path.join(loomDir, 'demo', 't1', 'design.md')), 'promote should create design.md in t1');
    console.log('    ✅ loom promote (guard + --body-file)');

    // close-plan: create → start → close
    const planId = idFromStdout(runLoom('create plan demo t1 --title "P1" --goal "g"', loomRoot).stdout);
    assert(runLoom(`start-plan ${planId}`, loomRoot).exitCode === 0, 'start-plan for close-plan');
    r = runLoom(`close-plan ${planId} --notes "closing note"`, loomRoot);
    assert(r.exitCode === 0, `close-plan: ${r.stderr}`);
    console.log('    ✅ loom close-plan');

    // quick-ship: record already-done work as a fresh done plan
    r = runLoom('quick-ship demo t1 --step "Did the thing"', loomRoot);
    assert(r.exitCode === 0, `quick-ship: ${r.stderr}`);
    console.log('    ✅ loom quick-ship');

    await fs.remove(loomRoot);
    console.log('\n✨ All CLI tree-management command tests passed!\n');
}

run().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});
