import { runTests } from '@vscode/test-electron';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
    // Ensure j:/temp/loom workspace is ready before VS Code launches
    const workspacePath = 'j:/temp/loom';
    fs.mkdirSync(path.join(workspacePath, '.loom'), { recursive: true });
    fs.writeFileSync(path.join(workspacePath, '.loom', 'workflow.yml'), 'version: 1\n');
    fs.mkdirSync(path.join(workspacePath, 'weaves'), { recursive: true });

    // extensionDevelopmentPath: the vscode package (has package.json + dist/)
    const extensionDevelopmentPath = path.resolve(__dirname, '..', '..', '..', 'packages', 'vscode');
    // extensionTestsPath: compiled suite index (this file compiles to tests/vscode/out/)
    const extensionTestsPath = path.resolve(__dirname, 'index.js');

    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [workspacePath, '--disable-extensions'],
    });
}

main().catch(err => {
    console.error('❌ VS Code Extension Host test runner failed:', err);
    process.exit(1);
});
