import * as vscode from 'vscode';
import * as cp from 'child_process';
// Carve-out (see tests/vscode-no-fs-imports.test.ts): writes a prompt tmpfile to
// os.tmpdir() to feed the Claude CLI — outside loom/, not a doc mutation.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { getTelemetryEnv } from '../telemetryConsent';

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

/** Whether the API-key sampling fallback is configured (the non-Claude AI path). */
export function hasApiKey(): boolean {
    return !!vscode.workspace.getConfiguration('reslava-loom.ai').get<string>('apiKey');
}

/**
 * Funnel the user to set up an AI path instead of dead-ending an AI action.
 * Claude Code is the recommended path; the API-key fallback stays discoverable.
 */
export async function funnelAiSetup(): Promise<void> {
    const pick = await vscode.window.showInformationMessage(
        'Loom AI needs Claude Code (recommended) or an API key to run.',
        'Install Claude Code', 'Set API Key'
    );
    if (pick === 'Install Claude Code') {
        vscode.env.openExternal(vscode.Uri.parse('https://docs.anthropic.com/claude-code'));
    } else if (pick === 'Set API Key') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'reslava-loom.ai.apiKey');
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
    // Propagate the extension's telemetry consent + surface tag into the launched
    // agent's environment. The agent creates docs through its OWN `loom mcp` (spawned
    // by Claude Code from .mcp.json), a different process than the extension's server —
    // so without this, the UI "Telemetry: On" toggle would never reach the primary AI
    // path and every generate/refine/do-step event would be silently dropped. The
    // toggle now governs the work the button triggers; surface stays `extension`.
    _terminal = vscode.window.createTerminal({ name: 'Loom AI', cwd: root, env: getTelemetryEnv() });
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
        await funnelAiSetup();
        return;
    }

    const promptFile = path.join(os.tmpdir(), `loom-prompt-${Date.now()}-${process.pid}.txt`);
    fs.writeFileSync(promptFile, prompt, 'utf8');

    const terminal = getLoomTerminal(root);
    terminal.show();
    terminal.sendText(`echo "─── ${terminalName} ───"`);
    terminal.sendText(buildClaudeCommand(promptFile));
}
