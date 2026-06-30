import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import { getStaleDocs } from '../../../app/dist';

/**
 * `loom stale [--all]` — list docs that may be stale, printing doc id/type/title + reason.
 *
 * Thin delivery shim over the app `getStaleDocs` use-case (the single source of
 * truth the loom_get_stale_docs MCP tool and the VS Code tree also consume).
 * Default shows the actionable set (matching the extension); `--all` adds the
 * historical view (done/cancelled docs).
 */
export async function staleCommand(options: { all?: boolean } = {}): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const stale = await getStaleDocs(
            { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs },
            { includeDone: options.all },
        );

        if (stale.length === 0) {
            console.log(chalk.green(options.all ? '✓ No stale documents.' : '✓ No actionable stale documents.'));
            return;
        }

        const scope = options.all ? '' : ' actionable';
        console.log(chalk.bold(`\n⚠️  ${stale.length}${scope} stale document(s)\n`));
        for (const d of stale) {
            console.log(`  ${chalk.cyan(d.id)}  ${chalk.gray(`[${d.type}]`)}  ${d.title}`);
            console.log(`     ${chalk.yellow(d.reason)}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
