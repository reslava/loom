import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../fs/dist';

export interface SwitchInput {
    name: string;
}

export interface SwitchDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export async function switchLoom(
    input: SwitchInput,
    deps: SwitchDeps
): Promise<{ name: string; path: string }> {
    const registry = deps.registry;
    
    // Prevent switching when inside a mono‑loom project
    if (registry.isMonoLoom()) {
        throw new Error(
            `Cannot switch looms inside a mono‑loom project.\n` +
            `The current directory is a Loom project. 'loom switch' is only for multi‑loom management.\n` +
            `To manage global looms, run this command outside of any Loom project.`
        );
    }
    
    const looms = registry.listLooms();
    const target = looms.find(l => l.name === input.name);
    if (!target) {
        throw new Error(`Loom '${input.name}' not found.`);
    }

    const resolvedPath = registry.resolveLoomPath(target.path);
    if (!deps.fs.existsSync(resolvedPath)) {
        throw new Error(`Loom path does not exist: ${resolvedPath}`);
    }

    registry.setActiveLoom(input.name);
    return { name: input.name, path: resolvedPath };
}