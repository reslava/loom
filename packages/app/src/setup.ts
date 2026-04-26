import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ConfigRegistry } from '../../core/dist';

export interface SetupInput {
    name: string;
    path?: string;
    switch?: boolean;
}

export interface SetupDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export async function setupLoom(
    input: SetupInput,
    deps: SetupDeps
): Promise<{ path: string; name: string; activated: boolean }> {
    const loomPath = input.path || path.join(os.homedir(), 'looms', input.name);
    
    if (deps.fs.existsSync(loomPath)) {
        throw new Error(`Directory already exists: ${loomPath}`);
    }

    deps.fs.ensureDirSync(path.join(loomPath, '.loom', 'templates'));
    deps.fs.ensureDirSync(path.join(loomPath, '.loom', 'prompts'));
    deps.fs.ensureDirSync(path.join(loomPath, '.loom', 'schemas'));
    deps.fs.ensureDirSync(path.join(loomPath, '.loom', 'cache'));
    deps.fs.ensureDirSync(path.join(loomPath, 'loom'));
    deps.fs.ensureDirSync(path.join(loomPath, 'loom', 'refs'));

    try {
        deps.registry.addLoom(input.name, loomPath);
    } catch (e: any) {
        if (e.message.includes('already exists')) {
            throw new Error(`Loom '${input.name}' is already registered. Use 'loom switch ${input.name}'.`);
        }
        throw e;
    }

    const shouldSwitch = input.switch !== false;
    if (shouldSwitch) {
        deps.registry.setActiveLoom(input.name);
    }

    return { path: loomPath, name: input.name, activated: shouldSwitch };
}