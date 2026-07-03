import { getMCP } from '../mcp-client';
import { TreeNode } from '../tree/treeProvider';

/**
 * Resolve the `th_` ULID a doc-create needs. Loom's app layer never fabricates a
 * thread, so `loom_create_idea`/`_design`/`_plan` reference an existing thread by
 * its ULID. If the tree node already carries the manifest ULID (`threadUlid`), use
 * it; otherwise this is a brand-new thread — mint its manifest first via
 * `loom_create_thread` (from the weave + folder slug) and use the returned ULID.
 *
 * This is the human-surface mirror of the CLI's `ensureThreadUlid`: it keeps the
 * "a new idea starts a new thread" ergonomics while honouring the invariant that
 * only an explicit create makes a thread.
 */
export async function ensureThreadUlid(
    root: string,
    weaveSlug: string,
    node: TreeNode | undefined,
    threadSlug: string,
): Promise<string> {
    if (node?.threadUlid) return node.threadUlid;
    const created = await getMCP(root).callTool('loom_create_thread', {
        weave_slug: weaveSlug,
        thread_slug: threadSlug,
    }) as { id: string };
    return created.id;
}
