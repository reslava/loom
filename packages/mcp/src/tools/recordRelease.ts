import * as fs from 'fs-extra';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, saveDocs, ConfigRegistry } from '../../../fs/dist';
import { getState } from '../../../app/dist/getState';
import { runEvent } from '../../../app/dist/runEvent';
import { recordRelease, backfillReleases } from '../../../app/dist/recordRelease';

export const toolDef = {
    name: 'loom_record_release',
    description:
        'Record the shipped release version onto done plans — plans are the single authoritative carrier of `actual_release`, and `current_release` is derived from them. Called by the project\'s release pipeline (Loom never reads package.json/git; you push the version in). Two modes: LIVE — pass `version` to stamp every done plan that has no release yet (between releases only the new ships are unstamped, so this is the auto-detect; idempotent, re-run is a no-op). BACKFILL — pass `releaseDates` (a version→tag-date map) to assign each done plan to the version whose date-range covers its done-date. Pass `version` OR `releaseDates`, not both. `overwrite` re-stamps already-stamped plans (the deliberate correction path, default false). Use this tool — do not edit plan files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            version: {
                type: 'string',
                description: 'LIVE mode: the release version to stamp on every unstamped done plan, e.g. "1.9.3". Mutually exclusive with releaseDates.',
            },
            releaseDates: {
                type: 'array',
                description: 'BACKFILL mode: version→tag-date map. Each done plan is assigned to the version whose (prevDate, date] window covers its done-date. Mutually exclusive with version.',
                items: {
                    type: 'object',
                    properties: {
                        version: { type: 'string', description: 'Release version, e.g. "1.9.2".' },
                        date: { type: 'string', description: 'That release\'s tag date (YYYY-MM-DD).' },
                    },
                    required: ['version', 'date'],
                },
            },
            overwrite: {
                type: 'boolean',
                description: 'Re-stamp plans that already carry a release (deliberate correction). Default false.',
            },
        },
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const loadWeaveStrict = async (r: string, w: string) => {
        const result = await loadWeave(r, w);
        if (!result) throw new Error(`Weave not found: ${w}`);
        return result;
    };
    const registry = new ConfigRegistry();
    const deps = {
        loadState: () => getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }),
        runEvent: (weaveSlug: string, event: any) =>
            runEvent(weaveSlug, event, { loadWeave: loadWeaveStrict, saveDocs, loomRoot: root }),
    };

    const version = args['version'] as string | undefined;
    const releaseDates = args['releaseDates'] as Array<{ version: string; date: string }> | undefined;
    const overwrite = args['overwrite'] as boolean | undefined;

    if (version && releaseDates) {
        throw new Error('Pass either `version` (live) or `releaseDates` (backfill), not both.');
    }

    let result;
    if (releaseDates) {
        result = await backfillReleases({ releaseDates, overwrite }, deps);
    } else if (version) {
        result = await recordRelease({ version, overwrite }, deps);
    } else {
        throw new Error('loom_record_release requires either `version` (live) or `releaseDates` (backfill).');
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
