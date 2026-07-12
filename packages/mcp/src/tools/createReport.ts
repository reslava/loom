import * as fs from 'fs-extra';
import { getActiveLoomRoot } from '../../../fs/dist';
import { createReport } from '../../../app/dist/createReport';

export const toolDef = {
    name: 'loom_create_report',
    description:
        "Persist an already-synthesized analytical report as a standalone `report` artifact doc (rp_ ULID, born status \"active\", version 1) under loom/reports/ (cross-weave / roadmap) or loom/{weave}/reports/ (weave-scoped). A report is a LEAF SNAPSHOT — it is deliberately NOT loaded into project state, so it is excluded by construction from refs, staleness, derived status, and requires_load. You (the agent) author the report `content` after reading the assembled slice from the `report` prompt or the `loom report` CLI; this tool only writes it. Frontmatter is minimal (kind + generated_at) — scope + sources are recorded in a body `## Provenance` section. Do not edit report files directly.",
    inputSchema: {
        type: 'object' as const,
        properties: {
            kind: { type: 'string', description: 'Report kind slug (e.g. "project-overview").' },
            title: { type: 'string', description: 'Concise human-readable report title (also drives the filename).' },
            content: { type: 'string', description: 'The synthesized report body (markdown, no frontmatter). A `## Provenance` section is appended for you.' },
            weave_slug: { type: 'string', description: 'Optional weave slug — omit for a cross-weave/roadmap report (writes to top-level loom/reports/).' },
            scope: {
                type: 'object' as const,
                description: 'Provenance: the filter that produced the report. Rendered into the body Provenance section.',
                properties: {
                    weaves: { type: 'array' as const, items: { type: 'string' } },
                    threads: { type: 'array' as const, items: { type: 'string' } },
                    from: { type: 'string' },
                    to: { type: 'string' },
                },
            },
            sources: { type: 'array' as const, items: { type: 'string' }, description: 'Doc ids / resource URIs the report was synthesized from (provenance).' },
        },
        required: ['kind', 'title', 'content'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const result = await createReport(
        {
            kind: args['kind'] as string,
            title: args['title'] as string,
            content: args['content'] as string,
            weaveSlug: args['weave_slug'] as string | undefined,
            scope: args['scope'] as any,
            sources: args['sources'] as string[] | undefined,
        },
        { getActiveLoomRoot: () => getActiveLoomRoot(root), fs },
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
