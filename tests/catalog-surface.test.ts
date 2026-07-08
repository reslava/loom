import { assert } from './test-utils.ts';
import {
    buildCatalog,
    buildCatalogVariants,
    coerceCatalogKind,
    CATALOG_KINDS,
    type CatalogInput,
} from '../packages/mcp/dist/catalog';

// Pure unit tests for the whole-surface catalog builder. No filesystem, no server.
// We hand a tiny registry-shaped input and assert the composed markdown carries the
// Tools / Resources (Concrete + Templated) / Prompts sections, that ?kind= filters to
// one section, and that an invalid kind throws with the valid set listed.

const input: CatalogInput = {
    tools: [
        { group: 'create', toolDef: { name: 'loom_create_idea', description: 'Create an idea doc. Detail ignored.' } },
        { group: 'query', toolDef: { name: 'loom_find_doc', description: 'Resolve a doc id to a path.' } },
    ],
    concrete: [
        { uri: 'loom://state', name: 'Loom State', description: 'Full project state.' },
        { uri: 'loom://catalog', name: 'MCP Surface Catalog', description: 'The surface index.' },
    ],
    templates: [
        { uriTemplate: 'loom://context/{docUlid}', name: 'Context Bundle', description: 'Assembled context for a doc.' },
        { uriTemplate: 'loom://plan/{planUlid}', name: 'Plan', description: 'Plan with parsed steps.' },
    ],
    prompts: [
        { name: 'do-next-step', description: 'Return the next incomplete step.', arguments: [{ name: 'planUlid', description: 'Plan ULID.', required: true }] },
        { name: 'validate-state', description: 'Review diagnostics.' },
    ],
};

async function run() {
    console.log('🗂️  Running catalog-surface tests...\n');

    // 1. Combined catalog (no kind) carries all three sections + subsections.
    {
        const md = buildCatalog(input);
        assert(md.includes('# Loom MCP surface'), 'top-level surface header present');
        assert(md.includes('## Loom MCP tools'), 'Tools section present');
        assert(md.includes('## Loom MCP resources'), 'Resources section present');
        assert(md.includes('### Concrete'), 'Concrete subsection present');
        assert(md.includes('### Templated'), 'Templated subsection present');
        assert(md.includes('## Loom MCP prompts'), 'Prompts section present');
        assert(md.includes('`loom://context/{docUlid}`'), 'a templated resource is listed with its params');
        assert(md.includes('`loom://state`'), 'a concrete resource is listed');
        assert(md.includes('`do-next-step`'), 'a prompt is listed by name');
        assert(md.includes('`planUlid` (required)'), 'a prompt argument is rendered with its requiredness');
        assert(md.includes('`loom_create_idea` — Create an idea doc.'), 'first sentence only for a tool');
        console.log('  ✅ combined catalog carries tools + resources (concrete/templated) + prompts');
    }

    // 2. ?kind=tools → only the Tools section (byte-identical to the tools-only render).
    {
        const md = buildCatalog(input, 'tools');
        assert(md.includes('## Loom MCP tools'), 'tools section present');
        assert(!md.includes('## Loom MCP resources'), 'no resources section under ?kind=tools');
        assert(!md.includes('## Loom MCP prompts'), 'no prompts section under ?kind=tools');
        assert(!md.includes('# Loom MCP surface'), 'no combined header under a single kind');
        console.log('  ✅ ?kind=tools → tools only');
    }

    // 3. ?kind=resources → only the Resources section.
    {
        const md = buildCatalog(input, 'resources');
        assert(md.includes('## Loom MCP resources'), 'resources section present');
        assert(md.includes('### Concrete') && md.includes('### Templated'), 'both resource subsections present');
        assert(!md.includes('## Loom MCP tools'), 'no tools section under ?kind=resources');
        assert(!md.includes('## Loom MCP prompts'), 'no prompts section under ?kind=resources');
        console.log('  ✅ ?kind=resources → resources only');
    }

    // 4. ?kind=prompts → only the Prompts section.
    {
        const md = buildCatalog(input, 'prompts');
        assert(md.includes('## Loom MCP prompts'), 'prompts section present');
        assert(!md.includes('## Loom MCP tools'), 'no tools section under ?kind=prompts');
        assert(!md.includes('## Loom MCP resources'), 'no resources section under ?kind=prompts');
        console.log('  ✅ ?kind=prompts → prompts only');
    }

    // 5. Pre-rendered variants match the on-demand renders.
    {
        const v = buildCatalogVariants(input);
        assert(v.all === buildCatalog(input), 'all variant matches combined render');
        assert(v.tools === buildCatalog(input, 'tools'), 'tools variant matches');
        assert(v.resources === buildCatalog(input, 'resources'), 'resources variant matches');
        assert(v.prompts === buildCatalog(input, 'prompts'), 'prompts variant matches');
        console.log('  ✅ pre-rendered variant map matches on-demand renders');
    }

    // 6. coerceCatalogKind: absent → undefined, valid → itself, invalid → throw with the valid set.
    {
        assert(coerceCatalogKind(undefined) === undefined, 'absent kind → whole surface');
        for (const k of CATALOG_KINDS) {
            assert(coerceCatalogKind(k) === k, `valid kind "${k}" passes through`);
        }
        let threw = false;
        try {
            coerceCatalogKind('bogus');
        } catch (e: any) {
            threw = true;
            assert(e.message.includes('bogus'), 'error names the bad kind');
            assert(CATALOG_KINDS.every(k => e.message.includes(k)), 'error lists the valid set');
        }
        assert(threw, 'an invalid kind throws');
        console.log('  ✅ coerceCatalogKind validates and errors with the valid set');
    }

    console.log('\n✅ All catalog-surface tests passed');
}

run().catch(e => { console.error('❌ catalog-surface test failed:', e); process.exit(1); });
