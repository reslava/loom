import * as path from 'path';
import * as fs from 'fs';
import { LoomState } from '../../core/dist/entities/state';

let _root: string | null = null;
let _cache: LoomState | null = null;
let _watcher: fs.FSWatcher | null = null;

export function initStateCache(root: string): void {
    if (_root === root && _watcher) return;
    _root = root;
    _cache = null;
    _watcher?.close();

    const loomDir = path.join(root, 'loom');
    try {
        _watcher = fs.watch(loomDir, { recursive: true }, () => {
            _cache = null;
        });
        _watcher.on('error', () => {
            _cache = null;
        });
    } catch {
        // loom dir not yet created — cache stays disabled until next initStateCache call
    }
}

export function getCachedState(): LoomState | null {
    return _cache;
}

export function setCachedState(state: LoomState): void {
    _cache = state;
}

export function invalidateStateCache(): void {
    _cache = null;
}
