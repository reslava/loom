import { getState } from '../../../app/dist/getState';
import { getFeedbackContext } from '../../../app/dist/getFeedbackContext';
import { getActiveLoomRoot, loadWeave, buildLinkIndex, ConfigRegistry } from '../../../fs/dist';
import * as os from 'os';
import * as fs from 'fs-extra';

// Lockstep version — the mcp package shares the one Loom version, so its own
// package.json is the truthful source to report (no hardcoded string to drift).
const pkg = require('../../package.json');

/**
 * loom://feedback-context — read-only. Assembles the fixed feedback-sink repo,
 * the non-PII usage snapshot, and the prefilled issue-form URL. The extension
 * reads this and opens `url`; nothing is sent from here.
 */
export async function handleFeedbackContextResource(root: string, _uri?: string) {
    const registry = new ConfigRegistry();
    const ctx = await getFeedbackContext(
        { loomVersion: pkg.version },
        {
            getState: () => getState({ getActiveLoomRoot, loadWeave, buildLinkIndex, registry, fs, workspaceRoot: root }),
            platform: () => os.platform(),
        },
    );

    return {
        contents: [{
            uri: 'loom://feedback-context',
            mimeType: 'application/json',
            text: JSON.stringify(ctx, null, 2),
        }],
    };
}
