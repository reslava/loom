import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../fs/dist';

export interface CurrentLoomInfo {
    name: string | null;
    path: string | null;
    exists: boolean;
    isMonoLoom: boolean;
}

export interface CurrentDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export async function currentLoom(deps: CurrentDeps): Promise<CurrentLoomInfo> {
    const registry = deps.registry;
    
    // Check for mono‑loom first
    if (registry.isMonoLoom()) {
        const localPath = registry.getMonoLoomPath();
        return {
            name: '(local)',
            path: localPath,
            exists: localPath ? deps.fs.existsSync(localPath) : false,
            isMonoLoom: true,
        };
    }
    
    // Multi‑loom mode
    const active = registry.getActiveLoom();
    if (!active) {
        return { name: null, path: null, exists: false, isMonoLoom: false };
    }

    const looms = registry.listLooms();
    const current = looms.find(l => l.path === active);
    const resolved = registry.resolveLoomPath(active);
    
    return {
        name: current?.name || null,
        path: resolved,
        exists: deps.fs.existsSync(resolved),
        isMonoLoom: false,
    };
}