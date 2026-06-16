import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../fs/dist';
import { searchDocs } from '../../../app/dist';

/**
 * `loom search <query>` — search docs by id/title/content, print id + title + snippet.
 *
 * Thin delivery shim over the app `searchDocs` use-case (the single source of truth
 * the loom_search_docs MCP tool also uses). No domain logic here.
 */
export async function searchCommand(
    query: string,
    options?: { type?: string; weave?: string }
): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const results = await searchDocs(
            { query, type: options?.type, weaveId: options?.weave },
            { getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs }
        );

        if (results.length === 0) {
            console.log(chalk.yellow(`No documents match "${query}".`));
            return;
        }

        console.log(chalk.bold(`\n🔍 ${results.length} result(s) for "${query}"\n`));
        for (const r of results) {
            console.log(`  ${chalk.cyan(r.id)}  ${chalk.gray(`[${r.type}]`)}  ${r.title}`);
            console.log(`     ${chalk.gray(r.excerpt.trim())}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
