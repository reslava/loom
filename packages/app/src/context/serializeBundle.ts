import { ContextBundle, BundledDoc } from '../../../core/dist';

const SECTION_SEP = '\n\n---\n\n';
const DOT = ' · '; // " · "

function header(d: BundledDoc): string {
    if (d.missing) {
        return `### ⚠️ requires_load target missing: ${d.id}`;
    }
    let h = `### [${d.scope} ${d.type}] ${d.title}${DOT}id: ${d.id}`;
    if (d.stale) h += `${DOT}⚠️ stale: ${d.stale.reason}`;
    return h;
}

/**
 * Serialise a ContextBundle into the agent-agnostic markdown blob that gets
 * prepended to the AI prompt (context-pipeline design §5). One section per doc,
 * each led by a one-line provenance header; sections split by `---`. No
 * agent-specific hints — those belong in the per-command prompt template.
 */
export function serializeBundle(bundle: ContextBundle): string {
    const comment = `<!-- loom:context-bundle target=${bundle.targetId} mode=${bundle.mode} docs=${bundle.docs.length} tokens~=${bundle.totalTokens} -->`;

    const sections = bundle.docs.map(d => {
        if (d.missing) return header(d);
        return `${header(d)}\n\n${d.content}`.trimEnd();
    });

    return [comment, ...sections].join(SECTION_SEP);
}

/**
 * The visibility lines for a bundle, walked from the SAME ordered docs[] the
 * serialiser uses — so the prompt and the visible record can never diverge
 * (context-pipeline design §5; consumed by showing-docs-loaded).
 */
export function bundleVisibilityLines(bundle: ContextBundle): string[] {
    return bundle.docs.map(d => {
        if (d.missing) return `⚠️ requires_load target missing: ${d.id}`;
        const stale = d.stale ? ' (⚠️ stale)' : '';
        return `📄 ${d.title} — loaded for context${stale}`;
    });
}
