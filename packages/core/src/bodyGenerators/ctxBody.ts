/**
 * The ctx pillar template — the default section schema for a project's global
 * `loom/ctx.md` (ctx-surface-parity). ctx is the always-loaded *architecture/API*
 * companion to CLAUDE.md: CLAUDE.md holds the rules & workflow contract, ctx holds
 * "what the project is" and links the deep refs. No rule is restated in ctx.
 *
 * The template is a default *seed*, not a file: `loom_refresh_ctx` uses it to build a
 * skeleton (or to tell the agent which sections to fill) only when `loom/ctx.md` does
 * not yet exist. Once the doc exists, its own headings are the schema (preserve-existing).
 */

export interface CtxPillar {
    /** Section heading text (without the leading `## `). */
    heading: string;
    /** One-line authoring hint, emitted as an HTML comment for the generator/user. */
    hint: string;
    /** Optional citation-loaded reference this section points at (path relative to loom/). */
    deepRef?: string;
}

/** The blockquote note under the H1 — states ctx's purpose and its split from CLAUDE.md. */
export const CTX_COMPANION_NOTE =
    'Always-loaded architecture & API companion to CLAUDE.md. CLAUDE.md holds the rules ' +
    'and workflow contract; this doc holds *what the project is* — architecture, API, ' +
    'stack, and where the deep refs live. No rule is restated here.';

/**
 * Project-agnostic default pillars. No `deepRef` is hardcoded (a fresh project has no
 * refs yet); the hints tell the author to link the relevant ref. Custom pillars may set
 * `deepRef` to emit a `→ Deep:` link.
 */
export const DEFAULT_CTX_PILLARS: CtxPillar[] = [
    { heading: 'Architecture', hint: 'Layers/packages, dependency rule, module boundaries, one-line mental model; link the deep architecture ref.' },
    { heading: 'API & contracts', hint: 'Public surfaces, naming conventions, invariants callers must respect; link the API ref.' },
    { heading: 'Stack — language, tech, libraries, dependencies', hint: 'Runtime/language, key libraries + why they are here, version constraints.' },
    { heading: 'Build, test & CI', hint: 'How to build, how to test, what CI enforces.' },
    { heading: 'Documentation map', hint: 'Reference docs and WHEN each should be loaded (citation-loaded).' },
    { heading: 'AI collaboration', hint: 'Project-specific AI working notes not already in CLAUDE.md: entry points, gotchas.' },
];

/**
 * Build the seed *skeleton* body (everything after frontmatter) for a fresh ctx doc:
 * the H1, the CLAUDE.md-split note, and each pillar as `## heading` + an HTML-comment
 * hint + an optional `→ Deep:` link. No inference — this is what `--skeleton` writes for
 * the user to edit before a real generation.
 */
export function buildCtxSkeleton(title: string, pillars: CtxPillar[] = DEFAULT_CTX_PILLARS): string {
    const sections = pillars.map(p => {
        const lines = [`## ${p.heading}`, `<!-- ${p.hint} -->`];
        if (p.deepRef) lines.push(`→ Deep: [${p.deepRef.split('/').pop()}](${p.deepRef})`);
        return lines.join('\n');
    });
    return `# ${title}\n\n> ${CTX_COMPANION_NOTE}\n\n${sections.join('\n\n')}\n`;
}

/** The section headings (without `## `) currently present in a ctx body — the schema to preserve. */
export function extractCtxHeadings(body: string): string[] {
    return (body.match(/^##\s+(.+)$/gm) ?? []).map(h => h.replace(/^##\s+/, '').trim());
}

/**
 * The section template the agent should fill on a refresh: the existing doc's headings
 * (preserve-existing) when it already has any, else the default pillar headings.
 */
export function ctxTemplateHeadings(existingBody?: string): string[] {
    const existing = existingBody ? extractCtxHeadings(existingBody) : [];
    return existing.length ? existing : DEFAULT_CTX_PILLARS.map(p => p.heading);
}
