// Tool catalog — a grouped, one-line-per-tool index of the loom_* MCP surface,
// generated from the live tool registry so it can never drift. Exposed as the
// loom://catalog resource; the agent is told (session-start CLAUDE.md rule) to read
// it before ToolSearch-ing for a tool, then go straight to `ToolSearch select:<name>`.
//
// This removes the *discovery search*, not the per-first-use schema fetch — the
// header below says so, on purpose, so neither the agent nor we over-trust it.

export interface CatalogTool {
    group?: string;
    toolDef: { name: string; description: string };
}

// Render order + human titles for known groups. Unknown groups render after these
// (alphabetically), and ungrouped tools fall into a trailing "Other" bucket — so a
// newly registered tool always appears, even before anyone assigns it a group.
const GROUP_ORDER = ['create', 'refine', 'generate', 'plan', 'req', 'chat', 'doc', 'context', 'query'];
const GROUP_TITLES: Record<string, string> = {
    create: 'Create',
    refine: 'Refine',
    generate: 'Generate (sampling fallback)',
    plan: 'Plan / steps',
    req: 'Requirements',
    chat: 'Chat',
    doc: 'Doc edit / lifecycle',
    context: 'Context prefs',
    query: 'Query / state',
    other: 'Other',
};

/** First sentence of a tool description, flattened and length-capped, for the catalog line. */
function firstSentence(desc: string): string {
    const flat = desc.replace(/\s+/g, ' ').trim();
    const m = flat.match(/^(.*?[.!?])(\s|$)/);
    let s = m ? m[1] : flat;
    if (s.length > 140) s = s.slice(0, 137).trimEnd() + '…';
    return s;
}

/**
 * Build the grouped markdown catalog from the registry's tools. Pure.
 * Groups by `group` (unset → "Other"); within a group, tools are sorted by name.
 */
export function buildToolCatalog(tools: CatalogTool[]): string {
    const byGroup = new Map<string, CatalogTool[]>();
    for (const t of tools) {
        const g = t.group ?? 'other';
        if (!byGroup.has(g)) byGroup.set(g, []);
        byGroup.get(g)!.push(t);
    }

    const known = GROUP_ORDER.filter(g => byGroup.has(g));
    const extra = [...byGroup.keys()].filter(g => !GROUP_ORDER.includes(g) && g !== 'other').sort();
    const ordered = [...known, ...extra, ...(byGroup.has('other') ? ['other'] : [])];

    const lines: string[] = [
        '## Loom MCP tools (auto-generated from the live registry — do not hand-edit)',
        '> Name pointers only. Once you know the tool, `ToolSearch select:<name>` to load its schema before the first call — the catalog removes the *search*, not the one-time schema fetch.',
        '',
    ];
    for (const g of ordered) {
        lines.push(`### ${GROUP_TITLES[g] ?? g}`);
        const group = byGroup.get(g)!.slice().sort((a, b) => a.toolDef.name.localeCompare(b.toolDef.name));
        for (const t of group) {
            lines.push(`- \`${t.toolDef.name}\` — ${firstSentence(t.toolDef.description)}`);
        }
        lines.push('');
    }
    return lines.join('\n').trimEnd() + '\n';
}

// Built once at server construction (the registry is static for the server's life)
// and read by the loom://catalog resource handler.
let _cached: string | null = null;
export function registerToolCatalog(block: string): void { _cached = block; }
export function getToolCatalogBlock(): string { return _cached ?? ''; }
