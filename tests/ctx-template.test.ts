import { assert } from './test-utils.ts';
import {
    buildCtxSkeleton, extractCtxHeadings, ctxTemplateHeadings,
    DEFAULT_CTX_PILLARS, CTX_COMPANION_NOTE,
} from '../packages/core/dist/index.js';

async function run() {
    console.log('🧩 Running ctx pillar-template tests...\n');

    // ── skeleton carries H1, the CLAUDE.md-split note, and every default pillar ──
    console.log('  • buildCtxSkeleton...');
    const skel = buildCtxSkeleton('Demo — Project Context');
    assert(skel.startsWith('# Demo — Project Context'), 'H1 title');
    assert(skel.includes(CTX_COMPANION_NOTE), 'companion/split note present');
    for (const p of DEFAULT_CTX_PILLARS) {
        assert(skel.includes(`## ${p.heading}`), `pillar heading: ${p.heading}`);
        assert(skel.includes(`<!-- ${p.hint} -->`), `pillar hint: ${p.heading}`);
    }
    console.log('    ✅ title + note + all pillar headings & hints');

    // ── extractCtxHeadings reads back an existing doc's section headings ─────────
    console.log('  • extractCtxHeadings...');
    const heads = extractCtxHeadings(skel);
    assert(heads.length === DEFAULT_CTX_PILLARS.length, 'one heading per pillar');
    assert(heads[0] === DEFAULT_CTX_PILLARS[0].heading, 'first heading matches');
    console.log('    ✅ headings parsed');

    // ── ctxTemplateHeadings: existing headings preserved, else default pillars ───
    console.log('  • ctxTemplateHeadings (preserve vs default)...');
    const custom = '# X\n\n## My Section\ncontent\n\n## Another\nmore\n';
    assert(JSON.stringify(ctxTemplateHeadings(custom)) === JSON.stringify(['My Section', 'Another']),
        'existing headings preserved');
    assert(JSON.stringify(ctxTemplateHeadings()) === JSON.stringify(DEFAULT_CTX_PILLARS.map(p => p.heading)),
        'no existing body → default pillars');
    assert(JSON.stringify(ctxTemplateHeadings('# just a title, no sections')) ===
        JSON.stringify(DEFAULT_CTX_PILLARS.map(p => p.heading)),
        'body with no ## headings → default pillars');
    console.log('    ✅ preserve-existing / default-pillars');

    console.log('\n✨ All ctx pillar-template tests passed!\n');
}

run().catch(err => { console.error('❌ ctx-template.test.ts failed:', err.message); process.exit(1); });
