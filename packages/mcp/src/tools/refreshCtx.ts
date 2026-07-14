import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import { serializeFrontmatter } from '../../../core/dist/frontmatterUtils';
import { buildCtxSkeleton, ctxTemplateHeadings } from '../../../core/dist';
import { buildCtxSource, ctxTarget, computeSourceHash, buildCtxFrontmatter } from '../../../app/dist';

/**
 * loom_refresh_ctx — assemble, don't generate (design D1=b).
 *
 * ctx is **global-only** (ctx-surface-parity): one loom/ctx.md per project, no scope arg.
 * No server-side inference. Two paths:
 *  - `skeleton_only` → write ONLY the pillar headings + authoring hints (no source, no
 *    summary), so the user can edit the section structure before a real generation.
 *  - default → assemble the project source, ensure the ctx shell (seed the pillar skeleton
 *    on a fresh doc; preserve the existing body's headings on an existing one), and return
 *    the source + section template for the agent to summarise, then call loom_update_doc.
 *
 * There is no human-facing stale badge for ctx (design §4): `last_refreshed` is the honest
 * recency signal, and Refresh is always available. `stale` here is only an idempotency hint
 * (source unchanged since the last generation).
 */
export function createRefreshCtxTool() {
    return {
        toolDef: {
            name: 'loom_refresh_ctx',
            description: 'Prepare a (re)generation of the global ctx doc (loom/ctx.md, id loom-ctx). ctx is global-only — no scope. Pass skeleton_only:true to write ONLY the pillar headings + authoring hints (no source, no summary) so the user can edit the structure before a real generation. Otherwise assembles the project source, seeds the pillar skeleton on a fresh doc (preserves existing headings on an existing one), and returns { source, template } — summarise the source under the template sections, then call loom_update_doc on the returned ctxId. No server-side inference (works in any host). Returns stale=false when the source is unchanged since the last generation (source_hash).',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    skeleton_only: {
                        type: 'boolean',
                        description: 'Write only the pillar skeleton (headings + authoring hints), no inference — for seeding ctx.md before a real refresh.',
                    },
                },
                required: [],
            },
        },
        handle: async (root: string, args: Record<string, unknown>) => {
            const skeletonOnly = args['skeleton_only'] === true;

            const registry = new ConfigRegistry();
            const state = await getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs: fsExtra, workspaceRoot: root });

            const source = buildCtxSource(state);
            const sourceHash = computeSourceHash(source);
            const target = ctxTarget();

            const loomRoot = getActiveLoomRoot(root);
            const filePath = path.join(loomRoot, target.relPath);

            const exists = await fsExtra.pathExists(filePath);
            let version = 1;
            let created: string | undefined;
            let stale = true;
            let body = `# ${target.title}\n`;
            let existingBody: string | undefined;
            if (exists) {
                const raw = await fsExtra.readFile(filePath, 'utf8');
                const hashMatch = raw.match(/^source_hash:\s*(\S+)/m);
                stale = !hashMatch || hashMatch[1] !== sourceHash;
                const verMatch = raw.match(/^version:\s*(\d+)/m);
                version = verMatch ? Number(verMatch[1]) : 1;
                const createdMatch = raw.match(/^created:\s*(\S+)/m);
                created = createdMatch ? createdMatch[1] : undefined;
                const bodyMatch = raw.match(/^---[\s\S]*?\n---\n?([\s\S]*)$/);
                if (bodyMatch) { body = bodyMatch[1]; existingBody = bodyMatch[1]; }
            }

            // The section template the agent fills: existing headings (preserve-existing)
            // when the doc exists, else the default pillars.
            const template = ctxTemplateHeadings(existingBody);

            // ── skeleton_only: write pillar headings + hints, no source, no summary. ──
            if (skeletonOnly) {
                const fm = buildCtxFrontmatter({ ctxId: target.ctxId, title: target.title, version, sourceHash, created });
                await fsExtra.ensureDir(path.dirname(filePath));
                await fsExtra.writeFile(filePath, `${serializeFrontmatter(fm)}\n${buildCtxSkeleton(target.title)}`, 'utf8');
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify({ ctxId: target.ctxId, targetPath: filePath, mode: 'skeleton', seeded: true, template }, null, 2),
                    }],
                };
            }

            // (Re)write the shell only when missing or stale; an up-to-date ctx is left
            // untouched. Fresh doc → seed the pillar skeleton so the agent has a structure
            // to fill; existing doc → preserve its body (its headings are the schema). The
            // frontmatter carries the new source_hash + last_refreshed; the agent overwrites
            // the body via loom_update_doc (which preserves this frontmatter).
            if (!exists || stale) {
                const seedBody = exists ? body : buildCtxSkeleton(target.title);
                const fm = buildCtxFrontmatter({ ctxId: target.ctxId, title: target.title, version, sourceHash, created });
                await fsExtra.ensureDir(path.dirname(filePath));
                await fsExtra.writeFile(filePath, `${serializeFrontmatter(fm)}\n${seedBody}`, 'utf8');
            }

            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify({ ctxId: target.ctxId, targetPath: filePath, stale, preserveExisting: exists, template, source }, null, 2),
                }],
            };
        },
    };
}
