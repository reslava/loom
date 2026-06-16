import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as yaml from 'yaml';
import { LoomRegistry } from '../repositories/registryRepository';

/**
 * Resolves the absolute path to the currently active Loom workspace root.
 *
 * @param workspaceRoot - Optional explicit workspace root (used by VS Code extension).
 * @returns The absolute path to the active loom root.
 * @throws {Error} If no Loom workspace can be located.
 */
export function getActiveLoomRoot(workspaceRoot?: string): string {
    // 1. PRIORITY: Use the explicitly provided workspace root if it contains .loom/
    if (workspaceRoot) {
        const loomDir = path.join(workspaceRoot, '.loom');
        if (fs.existsSync(loomDir)) {
            return workspaceRoot;
        }
    }

    // 2. Walk up from cwd looking for .loom/ (mono‑loom mode)
    let currentDir = process.cwd();
    while (true) {
        const loomDir = path.join(currentDir, '.loom');
        if (fs.existsSync(loomDir)) {
            return currentDir;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;
        currentDir = parentDir;
    }

    // 3. Try global registry (multi‑loom mode)
    const registryPath = path.join(os.homedir(), '.loom', 'config.yaml');
    if (fs.existsSync(registryPath)) {
        const registryContent = fs.readFileSync(registryPath, 'utf8');
        const registry = yaml.parse(registryContent) as LoomRegistry | null;
        if (registry?.active_loom) {
            const configDir = path.dirname(registryPath);
            const activePath = path.resolve(configDir, registry.active_loom);
            if (fs.existsSync(activePath)) {
                return activePath;
            }
        }
    }

    throw new Error(
        'No Loom workspace found.\n\n' +
        'If you are in a project that uses Loom, ensure it has a .loom/ directory.\n' +
        'If you want to create a new Loom workspace, run:\n' +
        '  loom init\n' +
        'If you have multiple looms, ensure one is active:\n' +
        '  loom list\n' +
        '  loom switch <name>'
    );
}

/**
 * Resolves the absolute path to a specific weave.
 *
 * @param weaveId - The weave identifier.
 * @param workspaceRoot - Optional workspace root (used by VS Code extension).
 * @returns The absolute path to the weave directory.
 */
export function resolveWeavePath(weaveId: string, workspaceRoot?: string): string {
    const loomRoot = getActiveLoomRoot(workspaceRoot);
    return path.join(loomRoot, 'weaves', weaveId);
}

/**
 * Ensures a directory exists, creating it recursively if necessary.
 *
 * @param dirPath - The directory path to ensure.
 */
export async function ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
}