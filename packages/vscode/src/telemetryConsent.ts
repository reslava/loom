import * as vscode from 'vscode';

/** The opt-in setting id. Default false — telemetry is off until the user enables it. */
export const TELEMETRY_SETTING = 'reslava-loom.telemetry.enabled';

/** Whether the user has opted in to telemetry (setting, default false). */
export function isTelemetryEnabled(): boolean {
    return vscode.workspace
        .getConfiguration()
        .get<boolean>(TELEMETRY_SETTING, false);
}

/**
 * Env vars added to the spawned `loom mcp` server process. The server (not the
 * extension host) is what emits events, so we tag its surface as `extension` and
 * pass the opt-in state through. The server still applies its own consent gate,
 * so `LOOM_TELEMETRY=0` guarantees Noop.
 */
export function getTelemetryEnv(): Record<string, string> {
    return {
        LOOM_SURFACE: 'extension',
        LOOM_TELEMETRY: isTelemetryEnabled() ? '1' : '0',
    };
}

/** Status-bar label reflecting the current opt-in state. */
export function telemetryStatusText(): string {
    return isTelemetryEnabled() ? '$(pulse) Telemetry: On' : '$(pulse) Telemetry: Off';
}

/** Tooltip reflecting the current opt-in state. */
export function telemetryStatusTooltip(): string {
    return isTelemetryEnabled()
        ? 'Loom usage telemetry is ON (anonymous, content-free) — click to turn off'
        : 'Loom usage telemetry is OFF — click to help improve Loom';
}

/**
 * Toggle the telemetry opt-in. Turning it ON asks for a one-line confirmation that
 * states exactly what is (and isn't) sent, so consent stays informed; turning it
 * OFF is a single click with no prompt. Writes the global setting; the status-bar
 * item re-renders via the config-change listener.
 */
export async function toggleTelemetryCommand(): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    if (isTelemetryEnabled()) {
        await config.update(TELEMETRY_SETTING, false, vscode.ConfigurationTarget.Global);
        vscode.window.setStatusBarMessage('Loom telemetry turned off.', 3000);
        return;
    }
    const choice = await vscode.window.showInformationMessage(
        'Enable anonymous, content-free usage telemetry? It sends only which commands run and where the workflow stalls — never your documents, titles, paths, or any PII. Off anytime with one click.',
        'Enable',
        'Cancel',
    );
    if (choice === 'Enable') {
        await config.update(TELEMETRY_SETTING, true, vscode.ConfigurationTarget.Global);
        vscode.window.setStatusBarMessage('Loom telemetry enabled — thank you!', 3000);
    }
}

/** globalState key marking the one-time disclosure as already shown. */
const DISCLOSURE_SHOWN_KEY = 'reslava-loom.telemetry.disclosed';

/** Public docs anchor for the telemetry disclosure. */
const LEARN_MORE_URL = 'https://github.com/reslava/loom#telemetry';

/**
 * Show the opt-in disclosure exactly once (tracked in globalState). Skips silently
 * if the user has already set the telemetry preference explicitly. Non-blocking:
 * telemetry stays off unless the user chooses Enable.
 */
export async function maybeShowTelemetryDisclosure(
    context: vscode.ExtensionContext,
): Promise<void> {
    if (context.globalState.get<boolean>(DISCLOSURE_SHOWN_KEY)) {
        return;
    }
    const inspected = vscode.workspace.getConfiguration().inspect<boolean>(TELEMETRY_SETTING);
    const alreadyChosen =
        inspected?.globalValue !== undefined || inspected?.workspaceValue !== undefined;
    await context.globalState.update(DISCLOSURE_SHOWN_KEY, true);
    if (alreadyChosen) {
        return;
    }
    const choice = await vscode.window.showInformationMessage(
        'Help improve Loom? It can send anonymous, content-free usage telemetry — which commands run and where the workflow stalls, never your documents, titles, or paths. Off by default; opt-in.',
        'Enable',
        'Keep off',
        'Learn more',
    );
    if (choice === 'Enable') {
        await vscode.workspace
            .getConfiguration()
            .update(TELEMETRY_SETTING, true, vscode.ConfigurationTarget.Global);
    } else if (choice === 'Learn more') {
        void vscode.env.openExternal(vscode.Uri.parse(LEARN_MORE_URL));
    }
}
