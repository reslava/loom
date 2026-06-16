import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';
import { nowIso } from '../../../core/dist';

export interface LoomEntry {
    name: string;
    path: string;
    created: string;
}

export interface LoomRegistry {
    active_loom: string | null;
    looms: LoomEntry[];
}

const CONFIG_DIR = path.join(os.homedir(), '.loom');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.yaml');

function normalizePath(p: string): string {
    return p.replace(/\\/g, '/');
}

export class ConfigRegistry {
    private registry: LoomRegistry;

    constructor() {
        this.registry = this.load();
    }

    private load(): LoomRegistry {
        if (!fs.existsSync(CONFIG_PATH)) {
            return { active_loom: null, looms: [] };
        }
        const content = fs.readFileSync(CONFIG_PATH, 'utf8');
        return yaml.parse(content) || { active_loom: null, looms: [] };
    }

    private save(): void {
        fs.ensureDirSync(CONFIG_DIR);
        fs.writeFileSync(CONFIG_PATH, yaml.stringify(this.registry));
    }

    getActiveLoom(): string | null {
        return this.registry.active_loom;
    }

    setActiveLoom(name: string): void {
        const loom = this.registry.looms.find(l => l.name === name);
        if (!loom) {
            throw new Error(`Loom '${name}' not found`);
        }
        this.registry.active_loom = loom.path;
        this.save();
    }

    addLoom(name: string, customPath?: string): void {
        let relativePath: string;
        if (customPath) {
            relativePath = path.relative(CONFIG_DIR, customPath);
        } else {
            relativePath = path.join('..', 'looms', name);
        }
        relativePath = normalizePath(relativePath);

        const existing = this.registry.looms.find(l => l.name === name);
        if (existing) {
            throw new Error(`Loom '${name}' already exists`);
        }
        this.registry.looms.push({
            name,
            path: relativePath,
            created: nowIso(),
        });
        this.save();
    }

    listLooms(): LoomEntry[] {
        return this.registry.looms;
    }

    resolveLoomPath(relativePath: string): string {
        return path.resolve(CONFIG_DIR, relativePath);
    }

    /**
     * Determines whether the current context is a mono‑loom (local .loom/ found)
     * or multi‑loom (relying on global registry).
     */
    isMonoLoom(): boolean {
        let currentDir = process.cwd();
        while (true) {
            if (fs.existsSync(path.join(currentDir, '.loom'))) {
                return true;
            }
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) break;
            currentDir = parentDir;
        }
        return false;
    }

    /**
     * Returns the path to the local mono‑loom if one is found.
     */
    getMonoLoomPath(): string | null {
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
        return null;
    }

    /**
     * Returns the name of the currently active loom, or null if none is set.
     */
    getActiveLoomName(): string | null {
        const active = this.registry.active_loom;
        if (!active) return null;
        const loom = this.registry.looms.find(l => l.path === active);
        return loom?.name || null;
    }

    /**
     * Removes all registry entries whose paths no longer exist on disk.
     */
    cleanup(): void {
        const validLooms = this.registry.looms.filter(loom => {
            const resolved = this.resolveLoomPath(loom.path);
            return fs.existsSync(resolved);
        });

        const removedCount = this.registry.looms.length - validLooms.length;
        this.registry.looms = validLooms;

        // If the active loom was removed, clear it
        if (this.registry.active_loom) {
            const activeExists = validLooms.some(l => l.path === this.registry.active_loom);
            if (!activeExists) {
                this.registry.active_loom = null;
            }
        }

        if (removedCount > 0) {
            this.save();
        }
    }
}
