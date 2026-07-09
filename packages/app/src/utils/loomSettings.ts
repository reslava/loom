import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Per-project Loom settings, persisted at `.loom/settings.json`. Distinct from the
 * GLOBAL multi-loom registry (`~/.loom/config.yaml`, ConfigRegistry) — this file holds
 * per-workspace flags: chat display names and the self-hosting guard.
 */
export interface LoomSettings {
    'user.name'?: string;
    'ai.model'?: string;
    /**
     * Marks this workspace as a self-hosting Loom repo — the Loom source itself, or a
     * fork of it. When true, `loom install` is a no-op: it must not write the generic
     * `.loom/CLAUDE.md` template or patch the root `CLAUDE.md`, because such a repo owns
     * a bespoke recursive `CLAUDE.md` instead of the installed contract.
     */
    selfHosting?: boolean;
}

/** Read `.loom/settings.json` under `loomRoot`, returning `{}` if absent or unparseable. */
export function readLoomSettings(loomRoot: string, fsDep: typeof fs = fs): LoomSettings {
    try {
        return JSON.parse(
            fsDep.readFileSync(path.join(loomRoot, '.loom', 'settings.json'), 'utf8'),
        ) as LoomSettings;
    } catch {
        return {};
    }
}

/** True when `.loom/settings.json` declares `selfHosting: true`. */
export function isSelfHosting(loomRoot: string, fsDep: typeof fs = fs): boolean {
    return readLoomSettings(loomRoot, fsDep).selfHosting === true;
}
