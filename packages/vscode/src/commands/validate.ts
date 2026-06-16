import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider } from '../tree/treeProvider';

interface ValidationResult {
    id: string;
    issues: string[];
}

export async function validateCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const choice = await vscode.window.showQuickPick(['All weaves', 'Specific weave'], {
        placeHolder: 'What to validate?',
    });
    if (!choice) return;

    let weaveId: string | undefined;
    if (choice === 'Specific weave') {
        weaveId = await vscode.window.showInputBox({
            prompt: 'Weave ID to validate',
            placeHolder: 'e.g., payment-system',
        });
        if (!weaveId) return;
    }

    try {
        const result = await getMCP(root).callTool(
            'loom_validate',
            weaveId ? { weaveId } : { all: true }
        ) as { results: ValidationResult[] };

        const issues = (result.results ?? []).filter(r => r.issues.length > 0);
        if (issues.length === 0) {
            vscode.window.showInformationMessage('✅ All weaves valid — no issues found.');
            return;
        }

        const output = vscode.window.createOutputChannel('Loom Validation');
        output.clear();
        for (const r of issues) {
            output.appendLine(`\n⚠️  ${r.id}`);
            for (const issue of r.issues) {
                output.appendLine(`   • ${issue}`);
            }
        }
        output.show();
        vscode.window.showWarningMessage(`Validation found issues in ${issues.length} weave(s). See Output panel.`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Validation failed: ${e.message}`);
    }
}
