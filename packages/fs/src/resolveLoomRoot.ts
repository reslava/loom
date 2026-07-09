import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

/** How `resolveLoomRoot` arrived at the root — drives the boot-time stderr notice. */
export type LoomRootSource = 'env' | 'ancestor' | 'cwd-fallback';

export interface ResolvedLoomRoot {
    /** Absolute workspace root the server should use. */
    root: string;
    /**
     * `env`          — taken from an explicit, non-placeholder `LOOM_ROOT`.
     * `ancestor`     — discovered by walking up from cwd to a dir containing `.loom/`.
     * `cwd-fallback` — no `.loom/` found up the tree; defaulted to cwd (likely broken).
     */
    source: LoomRootSource;
}

/**
 * Resolve the Loom workspace root for a server entry point (mcp / cli / the VS Code
 * bundle). This is the SINGLE root resolver those three entry points share — none of
 * them re-implements the logic (req C9).
 *
 * Precedence:
 *  1. An explicit `LOOM_ROOT` env value — UNLESS it is an unexpanded `${…}` placeholder.
 *     `.mcp.json` used to ship `LOOM_ROOT: "${workspaceFolder}"`, a VS Code editor
 *     variable that only the VS Code MCP host expands. A standalone terminal `claude`
 *     (the only real reader of `.mcp.json`) passes the literal string straight through,
 *     which is never a real path — so any value containing `${…}` is treated as "unset"
 *     and we fall through to discovery. No legitimate absolute path contains `${`.
 *  2. Walk up from `cwd` to the nearest ancestor that contains a `.loom/` directory.
 *     This makes resolution independent of WHERE `claude` was launched — a session
 *     started in a subdirectory (e.g. `tests/`) still resolves to the project root.
 *  3. Fall back to `cwd` when no `.loom/` is found (e.g. a brand-new, uninitialized dir).
 *
 * Non-throwing by design: an entry point must always boot with *some* root, so a
 * discovery miss degrades to `cwd` rather than crashing the server.
 */
export function resolveLoomRoot(env: NodeJS.ProcessEnv, cwd: string): ResolvedLoomRoot {
    const explicit = env['LOOM_ROOT'];
    if (typeof explicit === 'string' && explicit.trim() !== '' && !/\$\{.*\}/.test(explicit)) {
        return { root: explicit, source: 'env' };
    }

    const home = path.resolve(os.homedir());
    let dir = path.resolve(cwd);
    while (true) {
        // Skip the home directory: `~/.loom` is the global multi-loom REGISTRY
        // (`~/.loom/config.yaml`), not a workspace, so it must never masquerade as a
        // project root during walk-up. A real project is found before reaching home;
        // launching outside any project degrades to cwd-fallback rather than home.
        if (dir !== home && fs.existsSync(path.join(dir, '.loom'))) {
            return { root: dir, source: 'ancestor' };
        }
        const parent = path.dirname(dir);
        if (parent === dir) break; // reached filesystem root
        dir = parent;
    }

    return { root: path.resolve(cwd), source: 'cwd-fallback' };
}

/**
 * Build the one-line boot notice for a resolution, or `null` when none is warranted.
 * Pure (no `console`) so entry points own the actual stderr write and it stays testable.
 *
 *  - `env`          → null (explicit root, nothing to say).
 *  - `ancestor`     → an info line, but only when launched from *below* the root
 *                     (cwd !== root); a launch at the root itself is silent.
 *  - `cwd-fallback` → a warning line (no `.loom/` found — tools will likely fail).
 *
 * Callers write the result to **stderr** (`console.error`) — never stdout, which is the
 * stdio server's JSON-RPC channel.
 */
export function loomRootNotice(
    source: LoomRootSource,
    root: string,
    cwd: string,
): string | null {
    if (source === 'cwd-fallback') {
        return `Loom: no .loom/ workspace found from ${cwd} upward — defaulting LOOM_ROOT to this directory. loom_* tools will fail until you run from the project root (or a subdirectory of it) or set LOOM_ROOT.`;
    }
    if (source === 'ancestor' && path.resolve(cwd) !== path.resolve(root)) {
        return `Loom: launched from a subdirectory — resolved workspace root to ${root}.`;
    }
    return null;
}
