import { Command } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLoomMcpServer } from '../../mcp/dist/server';
import { resolveLoomRoot, loomRootNotice } from '../../fs/dist';
import { buildServerTelemetry, buildCliTelemetry, startTelemetrySession, flushOnExit, maybeShowCliNotice } from '../../mcp/dist/telemetryConfig';
import {
    trackCommandInvoked,
    trackDocGenerated,
    trackDocRefined,
    trackPlanStarted,
    trackStepCompleted,
} from '../../app/dist/telemetry/events';
import { TelemetryClient } from '../../telemetry/dist';
import { initCommand } from './commands/init';
import { installCommand } from './commands/install';
import { setupCommand } from './commands/setup';
import { switchCommand } from './commands/switch';
import { listCommand } from './commands/list';
import { currentCommand } from './commands/current';
import { statusCommand } from './commands/status';
import { validateCommand } from './commands/validate';
import { refineCommand } from './commands/refine';
import { startPlanCommand } from './commands/startPlan';
import { completeStepCommand } from './commands/completeStep';
import { weaveIdeaCommand } from './commands/weaveIdea';
import { weaveDesignCommand } from './commands/weaveDesign';
import { weavePlanCommand } from './commands/weavePlan';
import { finalizeCommand } from './commands/finalize';
import { renameCommand } from './commands/rename';
import { catalogCommand } from './commands/catalog';
import { resourcesReadCommand } from './commands/resources';
import { contextCommand } from './commands/context';
import { nextCommand } from './commands/next';
import { searchCommand } from './commands/search';
import { staleCommand } from './commands/stale';
import { blockedCommand } from './commands/blocked';
import { migratePlanStepsCommand } from './commands/migratePlanSteps';
import { migrateCommand } from './commands/migrate';
import { migrateLayoutCommand } from './commands/migrateLayout';
import { roadmapCommand } from './commands/roadmap';
import { backfillReleasesCommand } from './commands/backfillReleases';
import { backfillDesignVersionsCommand } from './commands/backfillDesignVersions';
import { backfillStalenessBaselinesCommand } from './commands/backfillStalenessBaselines';
import { recordReleaseCommand } from './commands/recordRelease';
import { resolveUlidCommand, resolvePathCommand } from './commands/resolve';
import { feedbackCommand } from './commands/feedback';

// Single source of truth for the version. esbuild inlines this JSON at build
// time (so the published bundle carries the real version); when run from source
// via ts-node, '../package.json' resolves to the same file. No drift either way.
const pkg = require('../package.json');

const program = new Command();

program
    .name('loom')
    .description('REslava Loom — Weave ideas into features with AI')
    .version(pkg.version);

// CLI-direct telemetry (surface `cli`). Opt-in/Noop like every path. A commander
// preAction hook records command_invoked + any loop event for terminal usage that
// bypasses MCP; the long-lived `loom mcp` server builds its own client below.
const cliTelemetry: TelemetryClient = buildCliTelemetry(pkg.version);
flushOnExit(cliTelemetry);

const CLI_LOOP_EVENT: Record<string, (t: TelemetryClient) => void> = {
    'start-plan': (t) => trackPlanStarted(t),
    'complete-step': (t) => trackStepCompleted(t),
    'refine-design': (t) => trackDocRefined(t, 'design'),
    idea: (t) => trackDocGenerated(t, 'idea'),
    design: (t) => trackDocGenerated(t, 'design'),
    plan: (t) => trackDocGenerated(t, 'plan'),
};

program.hook('preAction', (_thisCommand, actionCommand) => {
    const name = actionCommand.name();
    // The stdio `loom mcp` server must not print a notice onto its channel; it
    // discloses via env/README. Interactive CLI-direct commands show it once.
    if (name !== 'mcp') {
        maybeShowCliNotice();
    }
    trackCommandInvoked(cliTelemetry, name);
    CLI_LOOP_EVENT[name]?.(cliTelemetry);
});

program
    .command('install')
    .description('Install Loom into this workspace: creates .loom/, writes .loom/CLAUDE.md, patches CLAUDE.md, writes .mcp.json')
    .option('--force', 'Overwrite existing configuration')
    .option('--migrate-mcp-command', 'Migrate a legacy command:"loom" server in .mcp.json to the npx pin')
    .action(installCommand);

program
    .command('init')
    .description('Initialize a mono‑loom workspace in the current directory')
    .option('--force', 'Overwrite existing configuration')
    .action(initCommand);

program
    .command('init-multi')
    .description('Initialize the global multi‑loom workspace at ~/looms/default')
    .option('--force', 'Overwrite existing configuration')
    .action(initCommand); // Uses same command with different defaults

program
    .command('setup <name>')
    .description('Create a new named Loom workspace')
    .option('--path <path>', 'Custom path for the loom')
    .option('--no-switch', 'Do not set as active loom after creation')
    .action(setupCommand);

program
    .command('switch <name>')
    .description('Switch the active loom context')
    .action(switchCommand);

program
    .command('list')
    .description('List all registered looms')
    .action(listCommand);

program
    .command('current')
    .description('Show the currently active loom')
    .action(currentCommand);

program
    .command('status [weave]')
    .description('Show derived state of weaves')
    .option('--verbose', 'Show detailed status including plan steps')
    .option('--json', 'Output as JSON')
    .option('--tokens', 'Show token usage (placeholder)')
    .option('--filter <criteria>', 'Filter weaves (e.g., status=active|implementing,phase=planning)')
    .option('--sort <order>', 'Sort weaves (e.g., id:asc, id:desc)')
    .action(statusCommand);

program
    .command('validate [weave]')
    .description('Validate document integrity')
    .option('--all', 'Validate all weaves')
    .option('--fix', 'Attempt to fix issues (not yet implemented)')
    .option('--verbose', 'Show detailed issues for all weaves')
    .action(validateCommand);

program
    .command('refine-design <weave>')
    .description('Fire REFINE_DESIGN event')
    .action(refineCommand);

program
    .command('start-plan <plan>')
    .description('Fire START_PLAN event')
    .action(startPlanCommand);

program
    .command('complete-step <plan>')
    .description('Mark a plan step as done')
    .requiredOption('--step <n>', 'Step number to complete')
    .action(completeStepCommand);

const weaveCmd = program
    .command('weave')
    .description('Weave a new document');

weaveCmd
    .command('idea <title>')
    .description('Create a new idea document (default: creates a thread named after the title)')
    .option('--weave <weave>', 'Place the idea in a specific weave folder')
    .option('--thread <slug>', 'Thread slug (defaults to a kebab-case of the title — a new idea starts a new thread)')
    .action(weaveIdeaCommand);

weaveCmd
    .command('design <weave>')
    .description('Create a new design document from an existing idea')
    .option('--title <title>', 'Custom title for the design')
    .option('--thread <slug>', 'Create design inside this thread')
    .action(weaveDesignCommand);

weaveCmd
    .command('plan <weave>')
    .description('Create a new plan from a finalized design')
    .option('--title <title>', 'Custom title for the plan')
    .option('--goal <goal>', 'Goal description for the plan')
    .option('--thread <slug>', 'Create plan inside this thread')
    .action(weavePlanCommand);

program
    .command('finalize <draft>')
    .description('Finalize a draft document and generate its permanent ID')
    .action(finalizeCommand);

program
    .command('rename <doc> <new-title>')
    .description('Rename a finalized document and update all references')
    .action(renameCommand);

program
    .command('catalog [kind]')
    .description('Print the grouped index of the loom_* MCP surface — tools, resources, prompts (loom://catalog). Optional kind filters one section: tools|resources|prompts')
    .action(catalogCommand);

const resourcesCmd = program
    .command('resources')
    .description('Read MCP resources (see: resources read <uri>). The live index is `loom catalog resources`.');

resourcesCmd
    .command('read <uri>')
    .description('Read an MCP resource by uri and print its contents (e.g. loom://context/<id>)')
    .action(resourcesReadCommand);

program
    .command('context <doc>')
    .description('Print the assembled context bundle for a doc (or thread/<weave>/<thread>)')
    .option('--mode <mode>', 'Context mode (chat|idea|design|plan|implementing|refine|promote|ctx)')
    .action(contextCommand);

program
    .command('next [plan]')
    .description('Print the next incomplete step + context for a plan (defaults to the active plan)')
    .action(nextCommand);

program
    .command('resolve-ulid <weave> <slug>')
    .description('Resolve a thread folder slug to its stable th_ ULID (the identity the loom_* API references)')
    .action(resolveUlidCommand);

program
    .command('resolve-path <weave> <ulid>')
    .description('Resolve a thread th_ ULID to its folder (weave/slug + absolute path)')
    .action(resolvePathCommand);

program
    .command('search <query>')
    .description('Search docs by id/title/content; prints id + title + snippet')
    .option('--type <type>', 'Filter by doc type (idea|design|plan|ctx|chat|done)')
    .option('--weave <weave>', 'Scope the search to a weave slug')
    .action(searchCommand);

program
    .command('stale')
    .description('List docs that may be stale (plans behind design, docs behind req, idea↔design drift) + reason. Default = actionable (matches the extension); --all adds historical (done) docs.')
    .option('--all', 'Include done/cancelled (historical) stale docs too')
    .action((options) => staleCommand({ all: options.all }));

program
    .command('blocked')
    .description('List blocked steps across implementing plans + their blockers')
    .action(blockedCommand);

program
    .command('migrate-plan-steps [doc]')
    .description('Migrate legacy plans (body-table steps) to frontmatter-native steps. Idempotent; never empties an unparseable table.')
    .option('--dry-run', 'Preview what would change without writing')
    .action((docId, options) => migratePlanStepsCommand(docId, options));

program
    .command('migrate')
    .description('Run Loom migrations (v1: backfill a thread.md manifest for every thread missing one). Idempotent.')
    .option('--dry-run', 'Preview what would be created without writing')
    .action((options) => migrateCommand({ dryRun: options.dryRun }));

program
    .command('migrate-layout')
    .description('Normalise on-disk filenames to the canonical flat scheme (idea.md, design.md, plan-NNN.md, plan-NNN-done.md, chat-NNN.md). Rename-only, idempotent, collision-safe.')
    .option('--dry-run', 'Preview the renames without moving any files')
    .action((options) => migrateLayoutCommand({ dryRun: options.dryRun }));

program
    .command('roadmap')
    .description('Print the derived cross-weave roadmap: future (pending/blocked), present (active/implementing), history (shipped plans), and current release')
    .option('--group-by-thread', 'Group history by thread')
    .option('--group-by-release', 'Group history by release version')
    .action((options) => roadmapCommand({ groupByThread: options.groupByThread, groupByRelease: options.groupByRelease }));

program
    .command('record-release <version>')
    .description('Stamp <version> onto every done plan not yet assigned a release (the release-pipeline hook — run after tagging). Idempotent.')
    .option('--overwrite', 'Re-stamp plans that already carry a release')
    .action((version, options) => recordReleaseCommand(version, { overwrite: options.overwrite }));

program
    .command('backfill-releases')
    .description('Backfill plan actual_release from git tag dates (one-time release-history bootstrap). Builds the version→date map from git tags on the caller side and stamps each done plan by its done-date.')
    .option('--dry-run', 'Show the version→date map without stamping')
    .option('--overwrite', 'Re-stamp plans that already carry a release')
    .action((options) => backfillReleasesCommand({ dryRun: options.dryRun, overwrite: options.overwrite }));

program
    .command('backfill-design-versions')
    .description('Repair plan design_version baselines: re-stamp every plan to its parent thread design\'s current version (one-time fix for plans born with a hardcoded/omitted baseline). Idempotent.')
    .option('--dry-run', 'Show which plans would be re-baselined without writing')
    .action((options) => backfillDesignVersionsCommand({ dryRun: options.dryRun }));

program
    .command('backfill-staleness-baselines')
    .description('Migrate onto the directional staleness model: stamp idea_version on designs, design_version on reqs, and repoint each req parent from idea to design. Idempotent.')
    .option('--dry-run', 'Show what would change without writing')
    .action((options) => backfillStalenessBaselinesCommand({ dryRun: options.dryRun }));

program
    .command('feedback')
    .description('Open a prefilled GitHub issue to send feedback about Loom. Opt-in: carries Loom version, OS, and non-PII usage counts you review and edit before sending. Nothing is sent automatically.')
    .option('--print', 'Print the prefilled URL instead of opening a browser')
    .action((options) => feedbackCommand({ print: options.print }));

program
    .command('mcp')
    .description('Start the Loom MCP server (stdio transport)')
    .action(async () => {
        // Server is bundled in-process (see esbuild.js) — no runtime path to mcp/dist.
        const { root, source } = resolveLoomRoot(process.env, process.cwd());
        const notice = loomRootNotice(source, root, process.cwd());
        if (notice) console.error(notice);
        const telemetry = buildServerTelemetry(pkg.version);
        startTelemetrySession(telemetry);
        const server = createLoomMcpServer(root, telemetry);
        const transport = new StdioServerTransport();
        try {
            await server.connect(transport);
        } catch (err: any) {
            console.error('Failed to start Loom MCP server:', err.message);
            process.exit(1);
        }
    });

program.parse(process.argv);