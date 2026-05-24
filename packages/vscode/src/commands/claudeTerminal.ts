import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

const exec = promisify(cp.exec);

export async function isClaudeInstalled(): Promise<boolean> {
    try {
        const cmd = process.platform === 'win32' ? 'where claude' : 'which claude';
        await exec(cmd);
        return true;
    } catch {
        return false;
    }
}

let _terminal: vscode.Terminal | undefined;

// Always start with a fresh shell. Reusing the terminal across calls is
// dangerous: after the first invocation, `claude` is the foreground process,
// so subsequent sendText calls get typed *into Claude as user input* instead
// of being parsed by the shell.
function getLoomTerminal(root: string): vscode.Terminal {
    if (_terminal) {
        try { _terminal.dispose(); } catch { /* already gone */ }
        _terminal = undefined;
    }
    _terminal = vscode.window.createTerminal({ name: 'Loom AI', cwd: root });
    return _terminal;
}

// Build the shell-specific command that invokes `claude` with the prompt read
// from a tmpfile. Using a tmpfile + command substitution avoids every shell
// quoting pitfall (newlines, quotes, $, backticks) — the prompt never has to
// survive a shell parse.
function buildClaudeCommand(promptFile: string): string {
    const shell = (vscode.env.shell ?? '').toLowerCase();
    if (shell.includes('powershell') || shell.includes('pwsh')) {
        return `claude (Get-Content -Raw -LiteralPath '${promptFile.replace(/'/g, "''")}')`;
    }
    if (shell.endsWith('cmd.exe') || shell.endsWith('\\cmd')) {
        // cmd has no clean command substitution; fall back to stdin pipe.
        return `type "${promptFile}" | claude`;
    }
    // bash, zsh, sh, Git Bash, fish — use forward slashes so Git Bash/MSYS
    // doesn't see backslashes as escape sequences inside the single-quoted
    // path. POSIX shells on real *nix accept forward slashes natively.
    const posixPath = promptFile.replace(/\\/g, '/');
    return `claude "$(cat '${posixPath.replace(/'/g, "'\\''")}')"`;
}

export async function launchClaude(root: string, terminalName: string, prompt: string): Promise<void> {
    if (!(await isClaudeInstalled())) {
        const action = await vscode.window.showErrorMessage(
            'Claude Code CLI not found on PATH. Install it to use AI features.',
            'Open Install Page'
        );
        if (action === 'Open Install Page') {
            vscode.env.openExternal(vscode.Uri.parse('https://docs.anthropic.com/claude-code'));
        }
        return;
    }

    const promptFile = path.join(os.tmpdir(), `loom-prompt-${Date.now()}-${process.pid}.txt`);
    fs.writeFileSync(promptFile, prompt, 'utf8');

    const terminal = getLoomTerminal(root);
    terminal.show();
    terminal.sendText(`echo "─── ${terminalName} ───"`);
    terminal.sendText(buildClaudeCommand(promptFile));
}
