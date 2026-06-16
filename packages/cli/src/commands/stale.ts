import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import { getStaleDocs } from '../../../app/dist';

/**
 * `loom stale` — list docs that may be stale, printing doc id/type/title + reason.
 *
 * Thin delivery shim over the app `getStaleDocs` use-case (the single source of
 * truth the loom_get_stale_docs MCP tool also uses).
 */
export async function staleCommand(): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const stale = await getStaleDocs({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs });

        if (stale.length === 0) {
            console.log(chalk.green('✓ No stale documents.'));
            return;
        }

        console.log(chalk.bold(`\n⚠️  ${stale.length} stale document(s)\n`));
        for (const d of stale) {
            console.log(`  ${chalk.cyan(d.id)}  ${chalk.gray(`[${d.type}]`)}  ${d.title}`);
            console.log(`     ${chalk.yellow(d.reason)}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
