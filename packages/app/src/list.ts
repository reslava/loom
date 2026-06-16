import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../fs/dist';

export interface LoomListEntry {
    name: string;
    path: string;
    exists: boolean;
    isActive: boolean;
}

export interface ListDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export async function listLooms(deps: ListDeps): Promise<LoomListEntry[]> {
    const registry = deps.registry;
    
    // If we are in a mono‑loom context, return a single entry for the local loom.
    if (registry.isMonoLoom()) {
        const localPath = registry.getMonoLoomPath();
        if (localPath) {
            return [{
                name: '(local)',
                path: localPath,
                exists: true,
                isActive: true,
            }];
        }
        return [];
    }
    
    // Multi‑loom mode: list all registered looms.
    const looms = registry.listLooms();
    const active = registry.getActiveLoom();
    
    return looms.map(loom => {
        const resolved = registry.resolveLoomPath(loom.path);
        return {
            name: loom.name,
            path: resolved,
            exists: deps.fs.existsSync(resolved),
            isActive: loom.path === active,
        };
    });
}