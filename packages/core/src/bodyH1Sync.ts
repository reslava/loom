/**
 * Ensures the first H1 line of a doc body matches the frontmatter title.
 * Frontmatter title is the single source of truth; the body H1 is derived
 * UX (so VS Code markdown preview shows a title).
 *
 * Behavior:
 *   - Empty body → `# ${title}\n`
 *   - First non-blank line is an H1 (`# ...`) → replace it with `# ${title}`
 *   - First non-blank line is not an H1 → prepend `# ${title}\n\n`
 *
 * Idempotent. Safe to call on every save.
 */
export function syncBodyH1(body: string, title: string): string {
    const desired = `# ${title}`;
    if (!body || body.trim() === '') {
        return `${desired}\n`;
    }

    const lines = body.split('\n');
    let firstNonBlank = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== '') {
            firstNonBlank = i;
            break;
        }
    }

    if (firstNonBlank === -1) {
        return `${desired}\n`;
    }

    const line = lines[firstNonBlank];
    if (/^#\s+/.test(line) && !/^##/.test(line)) {
        if (line === desired) return body;
        lines[firstNonBlank] = desired;
        return lines.join('\n');
    }

    return `${desired}\n\n${body.replace(/^\n+/, '')}`;
}
