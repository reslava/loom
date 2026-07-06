import { randomUUID } from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * User-global directory where the anonymous install id is persisted. User-global
 * (not per-repo) on purpose: retention ("do they return") and cross-repo dedupe
 * both need ONE stable id per user. Honours `LOOM_CONFIG_DIR`, then the platform
 * convention (%APPDATA% on Windows, `$XDG_CONFIG_HOME` or `~/.config` elsewhere).
 */
export function defaultConfigDir(env: NodeJS.ProcessEnv = process.env): string {
    if (env.LOOM_CONFIG_DIR && env.LOOM_CONFIG_DIR.trim()) {
        return env.LOOM_CONFIG_DIR;
    }
    if (process.platform === 'win32' && env.APPDATA && env.APPDATA.trim()) {
        return path.join(env.APPDATA, 'loom');
    }
    const xdg = env.XDG_CONFIG_HOME;
    const base = xdg && xdg.trim() ? xdg : path.join(os.homedir(), '.config');
    return path.join(base, 'loom');
}

/**
 * Read the persisted anonymous install id, creating it on first call. The id is a
 * random UUID with NO link to any project, path, machine name, or user identity.
 *
 * `LOOM_INSTALL_ID` overrides the persisted id verbatim (store untouched): it pins
 * the `distinct_id` to a known value so those events can be cohorted/filtered in
 * the dashboard — e.g. a maintainer marking their own installs to exclude them from
 * "real adoption" numbers while keeping them for loop-validation. Opt-in like the
 * rest of telemetry; it does nothing unless consent + a key are also present.
 *
 * Only ever call this AFTER consent — never mint an id for a user who has not
 * opted in. If the store cannot be written (read-only FS, etc.) an ephemeral id
 * is returned so a session still coheres, without crashing.
 */
export function getOrCreateInstallId(
    configDir: string = defaultConfigDir(),
    env: NodeJS.ProcessEnv = process.env,
): string {
    const override = env.LOOM_INSTALL_ID?.trim();
    if (override) {
        return override;
    }
    const file = path.join(configDir, 'telemetry.json');
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (parsed && typeof parsed.installId === 'string' && parsed.installId) {
            return parsed.installId;
        }
    } catch {
        /* not created yet — fall through and create it */
    }
    const installId = randomUUID();
    try {
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(file, JSON.stringify({ installId }, null, 2), 'utf8');
    } catch {
        /* best-effort persistence; the ephemeral id below still works this run */
    }
    return installId;
}

/** A fresh per-process session id — the retention/return anchor within a run. */
export function newSessionId(): string {
    return randomUUID();
}
