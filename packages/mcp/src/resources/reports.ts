import * as fs from 'fs-extra';
import { getActiveLoomRoot } from '../../../fs/dist';
import { listReports } from '../../../app/dist/listReports';

/**
 * loom://reports — every report artifact on disk as
 * { id, title, kind, weaveSlug, generated_at, filePath }.
 *
 * Reports are leaf snapshots kept out of LoomState (storage decision A), so the
 * tree cannot find them in loom://state. This resource is the SINGLE read the
 * extension consumes to render the Reports node — it never fs-scans loom docs
 * itself (vscode → mcp → app + fs stays intact). Pure read.
 */
export async function handleReportsResource(root: string, uri: string) {
    const reports = await listReports({
        getActiveLoomRoot: () => getActiveLoomRoot(root),
        fs,
    });
    return {
        contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ reports }, null, 2),
        }],
    };
}
