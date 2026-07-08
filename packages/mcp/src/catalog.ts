// Surface catalog — a grouped, one-line-per-entry index of the whole loom_* MCP
// surface: tools, resources, and prompts. Generated from the live registry
// (the same arrays the server serves) so it can never drift. Exposed as the
// loom://catalog resource; the agent is told (session-start CLAUDE.md rule) to read
// it before ToolSearch-ing for a tool, then go straight to `ToolSearch select:<name>`.
//
// For tools this removes the *discovery search*, not the per-first-use schema fetch —
// the tool-section header below says so, on purpose, so neither the agent nor we
// over-trust it. Resources and prompts are read/called directly, so their sections
// are the whole story.

export interface CatalogTool {
    group?: string;
    toolDef: { name: string; description: string };
}

export interface CatalogResource {
    uri: string;
    name: string;
    description: string;
}

export interface CatalogTemplate {
    uriTemplate: string;
    name: string;
    description: string;
}

export interface CatalogPrompt {
    name: string;
    description: string;
    arguments?: { name: string; description?: string; required?: boolean }[];
}

export interface CatalogInput {
    tools: CatalogTool[];
    concrete: CatalogResource[];
    templates: CatalogTemplate[];
    prompts: CatalogPrompt[];
}

export type CatalogKind = 'tools' | 'resources' | 'prompts';
export const CATALOG_KINDS: CatalogKind[] = ['tools', 'resources', 'prompts'];

/** Validate a raw ?kind= value. Absent → whole surface (undefined); invalid → throw. Pure. */
export function coerceCatalogKind(kind: string | undefined): CatalogKind | undefined {
    if (kind === undefined) return undefined;
    if ((CATALOG_KINDS as string[]).includes(kind)) return kind as CatalogKind;
    throw new Error(
        `Invalid catalog kind "${kind}". Valid: ${CATALOG_KINDS.join(', ')} (or omit ?kind= for the whole surface).`,
    );
}

// Render order + human titles for known tool groups. Unknown groups render after these
// (alphabetically), and ungrouped tools fall into a trailing "Other" bucket — so a
// newly registered tool always appears, even before anyone assigns it a group.
const GROUP_ORDER = ['create', 'refine', 'generate', 'plan', 'req', 'chat', 'doc', 'context', 'query', 'workspace'];
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
    workspace: 'Workspace',
    other: 'Other',
};

/** First sentence of a description, flattened and length-capped, for a catalog line. */
function firstSentence(desc: string): string {
    const flat = desc.replace(/\s+/g, ' ').trim();
    const m = flat.match(/^(.*?[.!?])(\s|$)/);
    let s = m ? m[1] : flat;
    if (s.length > 140) s = s.slice(0, 137).trimEnd() + '…';
    return s;
}

/**
 * Build the grouped markdown TOOLS section from the registry's tools. Pure.
 * Groups by `group` (unset → "Other"); within a group, tools are sorted by name.
 *
 * Output is intentionally byte-stable — it is the whole of `?kind=tools` and the
 * Tools section of the combined catalog, and downstream tests/consumers assert its
 * `## Loom MCP tools` header.
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

/**
 * Build the RESOURCES section. Pure. Two subsections mirror the server's own split:
 * Concrete resources are read verbatim; Templated resources need a {placeholder}
 * filled with an id/slug (the params are already visible in the template string).
 */
export function buildResourceCatalog(concrete: CatalogResource[], templates: CatalogTemplate[]): string {
    const lines: string[] = [
        '## Loom MCP resources (auto-generated from the live registry — do not hand-edit)',
        '> Concrete resources are read verbatim; Templated resources need each `{placeholder}` filled with an id/slug.',
        '',
        '### Concrete',
    ];
    for (const r of concrete.slice().sort((a, b) => a.uri.localeCompare(b.uri))) {
        lines.push(`- \`${r.uri}\` — ${firstSentence(r.description)}`);
    }
    lines.push('');
    lines.push('### Templated');
    for (const t of templates.slice().sort((a, b) => a.uriTemplate.localeCompare(b.uriTemplate))) {
        lines.push(`- \`${t.uriTemplate}\` — ${firstSentence(t.description)}`);
    }
    lines.push('');
    return lines.join('\n').trimEnd() + '\n';
}

/**
 * Build the PROMPTS section. Pure. One line per prompt, followed by an indented
 * line per argument marked (required) / (optional).
 */
export function buildPromptCatalog(prompts: CatalogPrompt[]): string {
    const lines: string[] = [
        '## Loom MCP prompts (auto-generated from the live registry — do not hand-edit)',
        '> Workflow entry points — call a prompt with the listed arguments.',
        '',
    ];
    for (const p of prompts.slice().sort((a, b) => a.name.localeCompare(b.name))) {
        lines.push(`- \`${p.name}\` — ${firstSentence(p.description)}`);
        for (const a of p.arguments ?? []) {
            const req = a.required ? 'required' : 'optional';
            const desc = a.description ? ` — ${firstSentence(a.description)}` : '';
            lines.push(`  - \`${a.name}\` (${req})${desc}`);
        }
    }
    lines.push('');
    return lines.join('\n').trimEnd() + '\n';
}

const SURFACE_HEADER = [
    '# Loom MCP surface (auto-generated from the live registry — do not hand-edit)',
    '> The whole live surface — tools, resources, prompts. Filter one section with `loom://catalog?kind=tools|resources|prompts`.',
].join('\n');

/**
 * Compose the requested slice of the surface catalog. Pure.
 * `kind` selects a single section; omitted → the combined surface (all three
 * sections under the surface header).
 */
export function buildCatalog(input: CatalogInput, kind?: CatalogKind): string {
    if (kind === 'tools') return buildToolCatalog(input.tools);
    if (kind === 'resources') return buildResourceCatalog(input.concrete, input.templates);
    if (kind === 'prompts') return buildPromptCatalog(input.prompts);
    const tools = buildToolCatalog(input.tools);
    const resources = buildResourceCatalog(input.concrete, input.templates);
    const prompts = buildPromptCatalog(input.prompts);
    return [SURFACE_HEADER, tools, resources, prompts].join('\n\n').trimEnd() + '\n';
}

export interface CatalogVariants {
    all: string;
    tools: string;
    resources: string;
    prompts: string;
}

/** Pre-render every variant once (the registry is static for the server's life). */
export function buildCatalogVariants(input: CatalogInput): CatalogVariants {
    return {
        all: buildCatalog(input),
        tools: buildCatalog(input, 'tools'),
        resources: buildCatalog(input, 'resources'),
        prompts: buildCatalog(input, 'prompts'),
    };
}

// Built once at server construction (the registry is static for the server's life)
// and read by the loom://catalog resource handler, keyed by ?kind= (undefined → all).
let _cached: CatalogVariants | null = null;
export function registerCatalog(variants: CatalogVariants): void { _cached = variants; }
export function getCatalogBlock(kind?: CatalogKind): string {
    if (!_cached) return '';
    return kind ? _cached[kind] : _cached.all;
}
