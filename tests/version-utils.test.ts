import { assert } from './test-utils.ts';
import { parseVersion, compareVersions, maxVersion } from '../packages/core/dist';

// Pure unit tests for the semver helpers used by release ordering.

async function run() {
    console.log('🔢 Running versionUtils tests...\n');

    // parseVersion
    {
        assert(JSON.stringify(parseVersion('1.9.3')) === JSON.stringify({ major: 1, minor: 9, patch: 3 }), 'parses X.Y.Z');
        assert(JSON.stringify(parseVersion('v2.0.1')) === JSON.stringify({ major: 2, minor: 0, patch: 1 }), 'tolerates leading v');
        assert(parseVersion('1.9') === null, 'rejects X.Y');
        assert(parseVersion('nope') === null, 'rejects non-numeric');
        assert(parseVersion('') === null && parseVersion(null) === null && parseVersion(undefined) === null, 'null/empty → null');
        console.log('  ✅ parseVersion');
    }

    // compareVersions
    {
        assert(compareVersions('1.0.0', '1.0.1') < 0, 'patch less-than');
        assert(compareVersions('1.2.0', '1.10.0') < 0, 'minor compared numerically, not lexically');
        assert(compareVersions('2.0.0', '1.9.9') > 0, 'major dominates');
        assert(compareVersions('1.2.3', '1.2.3') === 0, 'equal');
        assert(compareVersions('bad', '1.0.0') < 0, 'unparseable sorts below parseable');
        assert(compareVersions('bad', 'worse') === 0, 'two unparseable are equal');
        console.log('  ✅ compareVersions');
    }

    // maxVersion
    {
        assert(maxVersion(['1.0.0', '1.2.0', '1.1.9']) === '1.2.0', 'picks greatest');
        assert(maxVersion(['1.9.0', null, '1.10.0', undefined]) === '1.10.0', 'skips null/undefined, numeric compare');
        assert(maxVersion([null, undefined, 'x']) === null, 'all unusable → null');
        assert(maxVersion([]) === null, 'empty → null');
        console.log('  ✅ maxVersion');
    }

    console.log('\n✅ All versionUtils tests passed');
}

run().catch(e => { console.error('❌ versionUtils test failed:', e); process.exit(1); });
