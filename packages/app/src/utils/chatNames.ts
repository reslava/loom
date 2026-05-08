import * as fs from 'fs-extra';
import * as path from 'path';

interface ChatNameSettings {
    'user.name'?: string;
    'ai.model'?: string;
}

const cache = new Map<string, ChatNameSettings>();

function loadSettings(loomRoot: string): ChatNameSettings {
    const cached = cache.get(loomRoot);
    if (cached) return cached;

    const settingsPath = path.join(loomRoot, 'settings.json');
    try {
        const raw = fs.readFileSync(settingsPath, 'utf8');
        const parsed = JSON.parse(raw) as ChatNameSettings;
        cache.set(loomRoot, parsed);
        return parsed;
    } catch {
        const empty: ChatNameSettings = {};
        cache.set(loomRoot, empty);
        return empty;
    }
}

export function getUserName(loomRoot: string): string {
    return loadSettings(loomRoot)['user.name'] ?? 'User:';
}

export function getAiName(loomRoot: string): string {
    return loadSettings(loomRoot)['ai.model'] ?? 'AI:';
}
