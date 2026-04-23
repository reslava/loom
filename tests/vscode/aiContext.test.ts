import * as assert from 'assert';
import * as vscode from 'vscode';

suite('AI Context Key', () => {
    let getAiEnabled: () => boolean;

    suiteSetup(async () => {
        const ext = vscode.extensions.getExtension('reslava.loom-vscode');
        assert.ok(ext, 'Extension not found');
        const api = (await ext!.activate()) as any;
        getAiEnabled = api.getAiEnabled;
        assert.ok(typeof getAiEnabled === 'function', 'getAiEnabled must be exported');
    });

    test('aiEnabled is false when API key is not configured', async () => {
        // Clear the API key
        await vscode.workspace.getConfiguration('reslava-loom.ai').update(
            'apiKey',
            '',
            vscode.ConfigurationTarget.Workspace
        );
        // Give the onDidChangeConfiguration listener time to fire
        await new Promise(r => setTimeout(r, 100));

        assert.strictEqual(getAiEnabled(), false, 'aiEnabled must be false when apiKey is empty');
    });

    test('aiEnabled is true when API key is set', async () => {
        await vscode.workspace.getConfiguration('reslava-loom.ai').update(
            'apiKey',
            'test-api-key-for-testing',
            vscode.ConfigurationTarget.Workspace
        );
        await new Promise(r => setTimeout(r, 100));

        assert.strictEqual(getAiEnabled(), true, 'aiEnabled must be true when apiKey is non-empty');

        // Restore: clear the key after test
        await vscode.workspace.getConfiguration('reslava-loom.ai').update(
            'apiKey',
            '',
            vscode.ConfigurationTarget.Workspace
        );
    });
});
