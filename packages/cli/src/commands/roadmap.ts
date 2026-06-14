import chalk from 'chalk';
import { getActiveLoomRoot } from '../../../fs/dist';
import { connectLocalMcp } from '../mcpClient';

const STATUS_ICON: Record<string, string> = {
    implementing: '🔵', active: '🟢', pending: '⚪', blocked: '🔴', done: '✅',
};

/**
 * `loom roadmap` — print the derived cross-weave roadmap (a thin ASCII renderer
 * over the loom://roadmap resource): future (pending/blocked, dependency+priority
 * order, blocked-on annotated), present (active/implementing), and history
 * (shipped plans, newest first; `--group-by-thread` to group). Pure read.
 */
export async function roadmapCommand(options: { groupByThread?: boolean }): Promise<void> {
    const root = getActiveLoomRoot();
    const client = await connectLocalMcp(root);
    try {
        const r = JSON.parse(await client.readResource('loom://roadmap'));

        // ULID → "weave/thread" label, for rendering blocked-on targets by name.
        const label = new Map<string, string>();
        for (const n of [...r.present, ...r.future]) {
            if (n.ulid) label.set(n.ulid, `${n.weaveId}/${n.threadId}`);
        }
        const nameOf = (u: string) => label.get(u) ?? u;
        const day = (d: string) => (d || '').slice(0, 10);
        const node = (n: any, extra = '') =>
            `  ${STATUS_ICON[n.status] ?? ' '} ${chalk.cyan(`${n.weaveId}/${n.threadId}`)} ${chalk.gray(`(p${n.priority})`)} ${n.title}${extra}`;

        console.log(chalk.bold('\n🗺️  Roadmap\n'));

        console.log(chalk.bold('FUTURE') + chalk.gray('  (pending / blocked — dependency + priority order)'));
        if (r.future.length === 0) console.log(chalk.gray('  (none)'));
        for (const n of r.future) {
            const blocked = n.blockedOn.length
                ? chalk.red(`  ⛔ blocked on → ${n.blockedOn.map(nameOf).join(', ')}`)
                : '';
            console.log(node(n, blocked));
        }

        console.log('\n' + chalk.bold('PRESENT') + chalk.gray('  (active / implementing)'));
        if (r.present.length === 0) console.log(chalk.gray('  (none)'));
        for (const n of r.present) console.log(node(n));

        console.log('\n' + chalk.bold('HISTORY') + chalk.gray('  (shipped plans, newest first)'));
        if (r.history.length === 0) {
            console.log(chalk.gray('  (none)'));
        } else if (options.groupByThread) {
            const byThread = new Map<string, any[]>();
            for (const h of r.history) {
                const k = `${h.weaveId}/${h.threadId}`;
                if (!byThread.has(k)) byThread.set(k, []);
                byThread.get(k)!.push(h);
            }
            for (const [k, items] of byThread) {
                console.log(`  ${chalk.cyan(k)}`);
                for (const h of items) console.log(`    ${chalk.gray(day(h.date))}  ${h.planTitle}`);
            }
        } else {
            for (const h of r.history) {
                console.log(`  ${chalk.gray(day(h.date))}  ${chalk.cyan(`${h.weaveId}/${h.threadId}`)}  ${h.planTitle}`);
            }
        }

        if (r.diagnostics.length > 0) {
            console.log('\n' + chalk.bold.yellow(`⚠️  ${r.diagnostics.length} roadmap diagnostic(s)`));
            for (const d of r.diagnostics) console.log(`  ${chalk.yellow(d.kind)}: ${d.detail}`);
        }
        console.log('');
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}
