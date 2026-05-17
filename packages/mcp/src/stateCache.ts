import * as path from 'path';
import * as fs from 'fs';
import { LoomState } from '../../core/dist/entities/state';

let _root: string | null = null;
let _cache: LoomState | null = null;
let _watcher: fs.FSWatcher | null = null;
let _rebuildStartedAt: number | null = null;

function log(line: string): void {
    process.stderr.write(line + '\n');
}

export function initStateCache(root: string): void {
    if (_root === root && _watcher) return;
    _root = root;
    _cache = null;
    _watcher?.close();

    const loomDir = path.join(root, 'loom');
    try {
        _watcher = fs.watch(loomDir, { recursive: true }, (eventType, filename) => {
            const hadCache = _cache !== null;
            _cache = null;
            if (hadCache) log(`[cache] invalidate path=${filename ?? '?'} reason=${eventType}`);
        });
        _watcher.on('error', (err) => {
            _cache = null;
            log(`[cache] watcher error err=${err.message}`);
        });
    } catch {
        // loom dir not yet created — cache stays disabled until next initStateCache call
    }
}

export function getCachedState(): LoomState | null {
    if (_cache) {
        log('[cache] hit');
        return _cache;
    }
    log('[cache] miss → rebuild start');
    _rebuildStartedAt = Date.now();
    return null;
}

export function setCachedState(state: LoomState): void {
    _cache = state;
    if (_rebuildStartedAt !== null) {
        const ms = Date.now() - _rebuildStartedAt;
        log(`[cache] rebuild end durationMs=${ms} weaves=${state.summary.totalWeaves} plans=${state.summary.totalPlans}`);
        _rebuildStartedAt = null;
    }
}

export function invalidateStateCache(): void {
    if (_cache) log('[cache] invalidate path=<manual> reason=invalidateStateCache');
    _cache = null;
}
