import * as assert from 'assert';
import * as vscode from 'vscode';
import { WORKSPACE_ROOT, cleanWeaves, seedWeave, seedDoneDoc } from './helpers';

suite('Tree Provider', () => {
    let treeProvider: any;

    suiteSetup(async () => {
        const ext = vscode.extensions.getExtension('reslava.loom-vscode');
        assert.ok(ext, 'Extension reslava.loom-vscode not found');
        const api = (await ext!.activate()) as any;
        treeProvider = api.treeProvider;
        assert.ok(treeProvider, 'treeProvider must be exported from activate()');
    });

    setup(() => {
        cleanWeaves();
    });

    test('root nodes include seeded weave', async () => {
        const weaveSlug = 'tree-test-1';
        seedWeave(weaveSlug);

        treeProvider.setWorkspaceRoot(WORKSPACE_ROOT);
        const roots: any[] = await treeProvider.getChildren();

        const weaveNode = roots.find((n: any) => n.weaveSlug === weaveSlug);
        assert.ok(weaveNode, `Weave node '${weaveSlug}' must appear in root`);
        assert.strictEqual(weaveNode.contextValue, 'weave', 'node must have contextValue "weave"');
    });

    test('weave children include thread node', async () => {
        const weaveSlug = 'tree-test-2';
        const { threadSlug } = seedWeave(weaveSlug);

        treeProvider.setWorkspaceRoot(WORKSPACE_ROOT);
        const roots: any[] = await treeProvider.getChildren();
        const weaveNode = roots.find((n: any) => n.weaveSlug === weaveSlug);
        assert.ok(weaveNode, 'Weave node must exist');

        const children: any[] = await treeProvider.getChildren(weaveNode);
        const threadNode = children.find((n: any) => n.contextValue === 'thread' && n.threadSlug === threadSlug);
        assert.ok(threadNode, `Thread node '${threadSlug}' must exist in weave children`);
    });

    test('thread children include design node and Plans section', async () => {
        const weaveSlug = 'tree-test-3';
        const { threadSlug } = seedWeave(weaveSlug);

        treeProvider.setWorkspaceRoot(WORKSPACE_ROOT);
        const roots: any[] = await treeProvider.getChildren();
        const weaveNode = roots.find((n: any) => n.weaveSlug === weaveSlug);
        assert.ok(weaveNode, 'Weave node must exist');

        const weaveChildren: any[] = await treeProvider.getChildren(weaveNode);
        const threadNode = weaveChildren.find((n: any) => n.contextValue === 'thread');
        assert.ok(threadNode, 'Thread node must exist');

        const threadChildren: any[] = await treeProvider.getChildren(threadNode);
        const designNode = threadChildren.find((n: any) => n.contextValue === 'design');
        assert.ok(designNode, 'Design node must exist in thread children');

        const plansSection = threadChildren.find((n: any) => n.label === 'Plans');
        assert.ok(plansSection, 'Plans section must exist in thread children');
    });

    test('Plans section contains plan node; done doc appears as child after closePlan', async () => {
        const weaveSlug = 'tree-test-4';
        const { planId } = seedWeave(weaveSlug, 'implementing', 1);
        seedDoneDoc(weaveSlug, planId);

        treeProvider.setWorkspaceRoot(WORKSPACE_ROOT);
        const roots: any[] = await treeProvider.getChildren();
        const weaveNode = roots.find((n: any) => n.weaveSlug === weaveSlug);
        assert.ok(weaveNode, 'Weave node must exist');

        const weaveChildren: any[] = await treeProvider.getChildren(weaveNode);
        const threadNode = weaveChildren.find((n: any) => n.contextValue === 'thread');
        assert.ok(threadNode, 'Thread node must exist');

        const threadChildren: any[] = await treeProvider.getChildren(threadNode);
        const plansSection = threadChildren.find((n: any) => n.label === 'Plans');
        assert.ok(plansSection, 'Plans section must exist');

        const planNodes: any[] = await treeProvider.getChildren(plansSection);
        assert.ok(planNodes.length >= 1, 'Plans section must have at least one plan node');

        const planNode = planNodes[0];
        assert.ok(planNode.contextValue?.startsWith('plan-'), `Plan node contextValue must start with "plan-", got: ${planNode.contextValue}`);

        const doneChildren: any[] = await treeProvider.getChildren(planNode);
        assert.ok(doneChildren.length >= 1, 'Plan with done doc must have done child');
        assert.strictEqual(doneChildren[0].contextValue, 'done', 'Done child must have contextValue "done"');
    });
});
