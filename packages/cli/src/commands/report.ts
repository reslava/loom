import chalk from 'chalk';
import { spawn } from 'child_process';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

/**
 * `loom report <kind> [--weave <slug>] [--run]` — assemble a report brief.
 *
 * Default (no --run): **brief-returning** (like `loom next`). The CLI does not run
 * inference — it prints the assembled source slice + synthesis instruction, framed
 * so a bare-terminal run is never mistaken for a finished report. The user hands the
 * brief to an agent, which writes + persists via loom_create_report.
 *
 * With --run: **headless launch (option b)** — pipe the brief to `claude -p` on stdin
 * (no argv-length limit, robust for a large roadmap slice) and inherit stdout so the
 * user sees the agent synthesize + persist end-to-end. Slice 1: kind "project-overview".
 */
export async function reportCommand(
    kind: string,
    options: { weave?: string; thread?: string; since?: string; until?: string; run?: boolean },
): Promise<void> {
    try {
        const root = getActiveLoomRoot();
        const client = await connectLocalMcp(root);
        let brief: string;
        try {
            const args: Record<string, string> = { kind };
            if (options.weave) args.weaveSlug = options.weave;
            if (options.thread) args.threadSlug = options.thread;
            if (options.since) args.from = options.since;
            if (options.until) args.to = options.until;
            brief = await client.getPrompt('report', args);
        } finally {
            await client.close();
        }

        if (options.run) {
            await runAgent(kind, brief);
            return;
        }

        // Human framing at the CLI edge (the prompt itself stays agent-clean): make it
        // unmistakable that this printed text is a BRIEF for an AI agent, not a finished
        // report — the exact confusion a bare-terminal run caused.
        console.log(chalk.yellow.bold('\n↓ This is a BRIEF for your AI agent — not a finished report.'));
        console.log(chalk.gray('  Hand the text below to Claude (or re-run with --run); it reads the slice, writes the report, and saves it via loom_create_report.\n'));
        console.log(brief);
        console.log(chalk.gray('\n↑ Give the brief above to your AI agent, or re-run: ') + chalk.cyan(`loom report ${kind} --run`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}

/**
 * Headless launch (option b): spawn `claude -p`, pipe the brief in on stdin (avoids the
 * ~32k Windows command-line limit a large roadmap slice would blow as an argv), and
 * inherit stdout/stderr so the run is visible. The report agent only needs to WRITE the
 * result (everything it reads is already in the piped brief), so we pre-allow exactly
 * the loom_create_report tool. `shell: true` lets Windows resolve `claude.cmd`; the args
 * are static and contain no user input, so shell quoting is not a concern.
 */
function runAgent(kind: string, brief: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(chalk.gray(`\n▶ Launching Claude to generate and save the ${kind} report…\n`));
        const child = spawn(
            'claude',
            ['-p', '--allowedTools', 'mcp__loom__loom_create_report'],
            { stdio: ['pipe', 'inherit', 'inherit'], shell: true },
        );
        child.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'ENOENT') {
                reject(new Error('`claude` CLI not found. Install Claude Code, or run without --run to print the brief.'));
            } else {
                reject(err);
            }
        });
        child.on('close', (code) => {
            if (code === 0 || code === null) resolve();
            else reject(new Error(`claude exited with code ${code}`));
        });
        child.stdin.write(brief);
        child.stdin.end();
    });
}
