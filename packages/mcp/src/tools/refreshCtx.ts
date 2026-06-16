import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import { serializeFrontmatter } from '../../../core/dist/frontmatterUtils';
import { buildCtxSource, ctxTarget, computeSourceHash, buildCtxFrontmatter } from '../../../app/dist';

/**
 * loom_refresh_ctx — assemble, don't generate (design D1=b).
 *
 * No server-side inference. The tool: (1) assembles the scope's source, (2) ensures
 * the ctx doc exists at the canonical flat path with the current `source_hash` in its
 * frontmatter, and (3) returns the source for the agent to summarise (the agent then
 * calls loom_update_doc on the returned ctxId — which preserves frontmatter, so the
 * hash the tool wrote is what persists). Works identically in CLI and the extension.
 */
export function createRefreshCtxTool() {
    return {
        toolDef: {
            name: 'loom_refresh_ctx',
            description: 'Prepare a ctx (re)generation. Assembles the scope source, ensures the ctx doc shell at the canonical flat path, and returns the source for the agent to summarise — then call loom_update_doc on the returned ctxId with the summary body. No server-side inference (works in any host). scope "global" -> loom/ctx.md (id loom-ctx); scope "weave" -> loom/{weaveId}/ctx.md (id {weaveId}-ctx). Returns stale=false when the source is unchanged since the last generation (source_hash).',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    scope: { type: 'string', enum: ['global', 'weave'], description: 'ctx scope (global or weave)' },
                    weaveId: { type: 'string', description: 'Weave id (required when scope = "weave")' },
                },
                required: ['scope'],
            },
        },
        handle: async (root: string, args: Record<string, unknown>) => {
            const scope = args['scope'] as 'global' | 'weave';
            const weaveId = args['weaveId'] as string | undefined;
            if (scope !== 'global' && scope !== 'weave') {
                throw new Error(`Invalid scope "${scope}" — expected "global" or "weave"`);
            }
            if (scope === 'weave' && !weaveId) {
                throw new Error('weaveId is required when scope = "weave"');
            }

            const registry = new ConfigRegistry();
            const state = await getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs: fsExtra, workspaceRoot: root });

            const source = buildCtxSource(scope, weaveId, state);
            const sourceHash = computeSourceHash(source);
            const target = ctxTarget(scope, weaveId);

            const loomRoot = getActiveLoomRoot(root);
            const filePath = path.join(loomRoot, target.relPath);

            const exists = await fsExtra.pathExists(filePath);
            let version = 1;
            let stale = true;
            let body = `# ${target.title}\n`;
            if (exists) {
                const raw = await fsExtra.readFile(filePath, 'utf8');
                const hashMatch = raw.match(/^source_hash:\s*(\S+)/m);
                stale = !hashMatch || hashMatch[1] !== sourceHash;
                const verMatch = raw.match(/^version:\s*(\d+)/m);
                version = verMatch ? Number(verMatch[1]) : 1;
                const bodyMatch = raw.match(/^---[\s\S]*?\n---\n?([\s\S]*)$/);
                if (bodyMatch) body = bodyMatch[1];
            }

            // (Re)write the doc only when missing or stale, so an up-to-date ctx is left
            // untouched. The frontmatter carries the new source_hash; the body is preserved
            // for the agent to overwrite via loom_update_doc.
            if (!exists || stale) {
                const fm = buildCtxFrontmatter({ ctxId: target.ctxId, title: target.title, version, sourceHash });
                await fsExtra.ensureDir(path.dirname(filePath));
                await fsExtra.writeFile(filePath, `${serializeFrontmatter(fm)}\n${body}`, 'utf8');
            }

            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify({ ctxId: target.ctxId, scope, targetPath: filePath, stale, source }, null, 2),
                }],
            };
        },
    };
}
