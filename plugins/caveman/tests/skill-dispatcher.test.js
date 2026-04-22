// Verifies the skill command documented in skills/caveman/SKILL.md — the
// cross-platform dispatcher the agent runs to reach set-config.js. The skill
// resolves set-config.js via its own base dir (harness-prepended at load
// time), so the dispatcher does NOT depend on $CLAUDE_PLUGIN_ROOT, the user
// config file existing, or the SessionStart hook having fired. Extracts the
// documented snippet from the skill markdown so the test fails if it drifts.
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const SKILL_PATH = path.join(PLUGIN_ROOT, 'skills', 'caveman', 'SKILL.md');
const SKILL_BASE = path.join(PLUGIN_ROOT, 'skills', 'caveman');

function extractCommandTemplate() {
    const md = fs.readFileSync(SKILL_PATH, 'utf8');
    const match = md.match(/```bash\n(node "<SKILL_BASE>[^\n]+)\n```/);
    if (!match) throw new Error('skill command template not found in SKILL.md');
    return match[1];
}

function renderCommand(template, kv) {
    return template
        .replace('<SKILL_BASE>', SKILL_BASE)
        .replace('KEY=VALUE', kv);
}

function withTmpHome(fn) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-dispatcher-'));
    try {
        return fn(tmpDir);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

test('skill command works with no pre-existing user config (no hook ever fired)', () => {
    withTmpHome((tmpDir) => {
        // Do NOT run the SessionStart hook — simulate the Windows CC bug case
        // where the hook crashed before writing config.
        assert.ok(!fs.existsSync(path.join(tmpDir, 'caveman', 'config.json')));

        const cmd = renderCommand(extractCommandTemplate(), 'defaultLevel=ultra');
        const res = spawnSync('bash', ['-c', cmd], {
            env: {
                ...process.env,
                APPDATA: tmpDir,
                XDG_CONFIG_HOME: tmpDir,
            },
            encoding: 'utf8',
        });
        assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
        assert.match(res.stdout, /wrote.*defaultLevel.*ultra/);

        const final = JSON.parse(
            fs.readFileSync(path.join(tmpDir, 'caveman', 'config.json'), 'utf8')
        );
        assert.strictEqual(final.defaultLevel, 'ultra');
    });
});

test('skill command merges into existing user config without clobbering other keys', () => {
    withTmpHome((tmpDir) => {
        fs.mkdirSync(path.join(tmpDir, 'caveman'), { recursive: true });
        fs.writeFileSync(
            path.join(tmpDir, 'caveman', 'config.json'),
            JSON.stringify({ off: true, defaultLevel: 'full' }) + '\n'
        );

        const cmd = renderCommand(extractCommandTemplate(), 'defaultLevel=ultra');
        const res = spawnSync('bash', ['-c', cmd], {
            env: {
                ...process.env,
                APPDATA: tmpDir,
                XDG_CONFIG_HOME: tmpDir,
            },
            encoding: 'utf8',
        });
        assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);

        const final = JSON.parse(
            fs.readFileSync(path.join(tmpDir, 'caveman', 'config.json'), 'utf8')
        );
        assert.strictEqual(final.defaultLevel, 'ultra');
        assert.strictEqual(final.off, true);
    });
});

test('skill command rejects invalid value via set-config.js schema', () => {
    withTmpHome((tmpDir) => {
        const cmd = renderCommand(extractCommandTemplate(), 'defaultLevel=bogus');
        const res = spawnSync('bash', ['-c', cmd], {
            env: {
                ...process.env,
                APPDATA: tmpDir,
                XDG_CONFIG_HOME: tmpDir,
            },
            encoding: 'utf8',
        });
        assert.notStrictEqual(res.status, 0);
        assert.match(res.stderr, /lite\|full\|ultra/);
    });
});
