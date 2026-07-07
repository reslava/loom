import chalk from 'chalk';
import { validate } from '../../../app/dist/validate';
import { getActiveLoomRoot } from '../../../fs/dist';
import { buildLinkIndex } from '../../../fs/dist';
import { loadDoc } from '../../../fs/dist';
import * as fs from 'fs-extra';

interface ValidateOptions {
    all?: boolean;
    fix?: boolean;
    verbose?: boolean;
}

export async function validateCommand(weaveSlug?: string, options?: ValidateOptions): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const result = await validate(
            { weaveSlug, all: options?.all, verbose: options?.verbose },
            { getActiveLoomRoot, buildLinkIndex, loadDoc, fs, loomRoot }
        );

        if (result.results.length === 1) {
            const r = result.results[0];
            if (r.issues.length === 0) {
                console.log(chalk.green(`✅ Weave '${r.id}' is valid`));
            } else {
                console.log(chalk.red(`❌ Weave '${r.id}' has issues:`));
                r.issues.forEach((i: string) => console.log(`   - ${i}`));
            }
            process.exit(r.issues.length > 0 ? 1 : 0);
        }

        const valid = result.results.filter(r => r.issues.length === 0);
        const invalid = result.results.filter(r => r.issues.length > 0);

        console.log(chalk.bold('\n🔍 Validation Summary\n'));
        for (const r of valid) {
            console.log(`  ${chalk.green('✅')} ${r.id}`);
        }
        for (const r of invalid) {
            console.log(`  ${chalk.red('❌')} ${r.id} (${r.issues.length} issues)`);
        }
        
        if (options?.verbose) {
            for (const r of invalid) {
                console.log(chalk.yellow(`\n  ${r.id}:`));
                r.issues.forEach((i: string) => console.log(`    - ${i}`));
            }
        }

        process.exit(invalid.length > 0 ? 1 : 0);
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}