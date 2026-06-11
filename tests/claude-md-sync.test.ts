import * as fs from 'fs-extra';
import * as path from 'path';
import { assert } from './test-utils.ts';

// Enforces parity between the two session-contract surfaces WITHOUT forcing identical
// prose (they are deliberately adapted paraphrases — persona, install-state, condensation).
// Two locks:
//   1. The set of `<!-- rule:id -->` markers must match across both surfaces (catches a
//      rule added/changed in one and forgotten in the other — the real drift failure mode).
//   2. A small set of verbatim-invariant tokens must appear in both (things that must never
//      diverge regardless of voice).
// Run from the repo root (test-all cd's there; standalone runs are from root too).

const repoRoot = process.cwd();
const ROOT_CLAUDE_MD = path.join(repoRoot, 'CLAUDE.md');
const TEMPLATE_SRC = path.join(repoRoot, 'packages', 'app', 'src', 'installWorkspace.ts');

// Tokens that must appear identically in BOTH surfaces, regardless of per-surface wording.
const INVARIANTS = [
    // visibility prefixes
    '🔧 MCP:',
    '📡 MCP:',
    '⚠️ MCP unavailable — editing file directly',
    // core write-path tool names
    'loom_append_to_chat',
    'loom_update_doc',
    'loom_complete_step',
    'loom_append_done',
    'loom_create_plan',
    // the four non-negotiable stop rules — locks count + identity without comparing wording
    'After each step',
    'Error loop',
    'Design decision',
    'User says "STOP"',
];

function ruleIdList(text: string): string[] {
    // Line-anchored: a real marker is alone on its line. This deliberately ignores inline
    // mentions in prose (e.g. documenting the `<!-- rule:{id} -->` convention) so the docs
    // can show the syntax without being miscounted as markers.
    const re = /^[ \t]*<!--\s*rule:([a-z0-9-]+)\s*-->[ \t]*$/gm;
    const ids: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) ids.push(m[1]);
    return ids;
}

function dupes(ids: string[]): string[] {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const id of ids) (seen.has(id) ? dup : seen).add(id);
    return [...dup].sort();
}

function onlyIn(a: Set<string>, b: Set<string>): string[] {
    return [...a].filter(x => !b.has(x)).sort();
}

async function run() {
    console.log('🔁 Running CLAUDE.md two-surface sync tests...\n');

    assert(await fs.pathExists(ROOT_CLAUDE_MD), `CLAUDE.md not found at ${ROOT_CLAUDE_MD} — run this test from the repo root.`);
    const root = await fs.readFile(ROOT_CLAUDE_MD, 'utf8');
    const template = await fs.readFile(TEMPLATE_SRC, 'utf8');

    // ── No duplicate markers within a surface ──
    console.log('  • no duplicate rule-id markers within a surface...');
    {
        const rootDup = dupes(ruleIdList(root));
        const tplDup = dupes(ruleIdList(template));
        assert(rootDup.length === 0, `duplicate rule ids in CLAUDE.md: ${rootDup.join(', ')}`);
        assert(tplDup.length === 0, `duplicate rule ids in the LOOM_CLAUDE_MD template: ${tplDup.join(', ')}`);
        console.log('    ✅ no duplicates');
    }

    // ── Rule-set parity ──
    console.log('  • shared rule-id sets match across both surfaces...');
    {
        const rootIds = new Set(ruleIdList(root));
        const tplIds = new Set(ruleIdList(template));
        assert(rootIds.size > 0, 'root CLAUDE.md must carry <!-- rule:id --> markers');
        assert(tplIds.size > 0, 'LOOM_CLAUDE_MD template must carry <!-- rule:id --> markers');

        const missingFromTemplate = onlyIn(rootIds, tplIds);
        const missingFromRoot = onlyIn(tplIds, rootIds);
        assert(
            missingFromTemplate.length === 0 && missingFromRoot.length === 0,
            'rule-id drift between the two CLAUDE.md surfaces:\n' +
                (missingFromTemplate.length ? `  in root CLAUDE.md but NOT in the template: ${missingFromTemplate.join(', ')}\n` : '') +
                (missingFromRoot.length ? `  in the template but NOT in root CLAUDE.md: ${missingFromRoot.join(', ')}\n` : '') +
                '  → mirror the rule (and its <!-- rule:id --> marker) into the other surface, or remove it from both.\n' +
                '  Shared rules live in BOTH CLAUDE.md and the LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts.'
        );
        console.log(`    ✅ ${rootIds.size} shared rule ids match in both surfaces`);
    }

    // ── Verbatim invariants ──
    console.log('  • verbatim-invariant tokens appear in both surfaces...');
    {
        for (const inv of INVARIANTS) {
            assert(root.includes(inv), `root CLAUDE.md is missing invariant token: ${JSON.stringify(inv)}`);
            assert(template.includes(inv), `LOOM_CLAUDE_MD template is missing invariant token: ${JSON.stringify(inv)}`);
        }
        console.log(`    ✅ all ${INVARIANTS.length} invariant tokens present in both`);
    }

    console.log('\n✅ CLAUDE.md two-surface sync tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
