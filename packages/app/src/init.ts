import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ConfigRegistry } from '../../fs/dist';

export interface InitLocalInput {
    force?: boolean;
}

export interface InitMultiInput {
    force?: boolean;
}

export interface InitDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
    /**
     * Target project root for a local install. Injected so the use-case is pure
     * with respect to the process working directory. Defaults to process.cwd()
     * for the standalone `init` command; installWorkspace passes its own cwd.
     */
    cwd?: string;
}

export async function initLocal(
    input: InitLocalInput,
    deps: InitDeps
): Promise<{ path: string }> {
    const localPath = deps.cwd ?? process.cwd();
    const loomDir = path.join(localPath, '.loom');

    if (deps.fs.existsSync(loomDir)) {
        if (!input.force) {
            throw new Error(`Loom already exists at ${localPath}. Use --force to overwrite.`);
        }
        await deps.fs.remove(loomDir);
    }

    deps.fs.ensureDirSync(path.join(localPath, '.loom', 'cache'));
    deps.fs.ensureDirSync(path.join(localPath, '.loom', 'prompts'));
    deps.fs.ensureDirSync(path.join(localPath, '.loom', 'schemas'));
    deps.fs.ensureDirSync(path.join(localPath, 'loom'));
    deps.fs.ensureDirSync(path.join(localPath, 'loom', 'refs'));

    return { path: localPath };
}

export async function initMulti(
    input: InitMultiInput,
    deps: InitDeps
): Promise<{ path: string; name: string }> {
    const defaultPath = path.join(os.homedir(), 'looms', 'default');   
 
    if (deps.fs.existsSync(defaultPath)) {        
        if (!input.force) {
            throw new Error(`Loom already exists at ${defaultPath}. Use --force to overwrite.`);
        }        
        await deps.fs.remove(defaultPath);        
    }

    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'cache'));
    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'prompts'));
    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'schemas'));
    deps.fs.ensureDirSync(path.join(defaultPath, 'loom'));
    deps.fs.ensureDirSync(path.join(defaultPath, 'loom', 'refs'));

    deps.registry.cleanup();
    
    try {
        deps.registry.addLoom('default', defaultPath);
    } catch (e: any) {
        if (!e.message.includes('already exists')) throw e;
    }
    
    deps.registry.setActiveLoom('default');

    return { path: defaultPath, name: 'default' };
}