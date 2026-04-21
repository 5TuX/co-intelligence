// Verifies the node one-liner documented in skills/caveman/SKILL.md — the
// cross-platform dispatcher the agent runs to reach set-config.js without
// $CLAUDE_PLUGIN_ROOT. Extracts the one-liner from the skill markdown so the
// test fails if the documented snippet drifts from working code.
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const SKILL_PATH = path.join(PLUGIN_ROOT, 'skills', 'caveman', 'SKILL.md');
const HOOK = path.join(PLUGIN_ROOT, 'scripts', 'hook-session-start.js');

function extractOneLiner() {
    const md = fs.readFileSync(SKILL_PATH, 'utf8');
    const match = md.match(/```bash\n(node -e[\s\S]+?)\n```/);
    if (!match) throw new Error('one-liner not found in SKILL.md');
    return match[1];
}

function withTmpHome(fn) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-dispatcher-'));
    try {
        return fn(tmpDir);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

test('skill one-liner: pluginRoot missing → surfaces explanatory error', () => {
    withTmpHome((tmpDir) => {
        fs.mkdirSync(path.join(tmpDir, 'caveman'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, 'caveman', 'config.json'), '{}');
        const cmd = extractOneLiner().replace(/KEY=VALUE/, 'off=true');
        const res = spawnSync('bash', ['-c', cmd], {
            env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
            encoding: 'utf8',
        });
        assert.notStrictEqual(res.status, 0);
        assert.match(res.stderr, /pluginRoot missing/);
    });
});

test('skill one-liner: after SessionStart hook → dispatches to set-config.js', () => {
    withTmpHome((tmpDir) => {
        // Simulate a real session: hook writes pluginRoot into config.
        const hookRes = spawnSync('node', [HOOK], {
            env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
            encoding: 'utf8',
        });
        assert.strictEqual(hookRes.status, 0);

        // Now run the skill's documented one-liner with a real arg.
        const cmd = extractOneLiner().replace(/KEY=VALUE/, 'defaultLevel=ultra');
        const res = spawnSync('bash', ['-c', cmd], {
            env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
            encoding: 'utf8',
        });
        assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
        assert.match(res.stdout, /wrote.*defaultLevel.*ultra/);

        const final = JSON.parse(
            fs.readFileSync(path.join(tmpDir, 'caveman', 'config.json'), 'utf8')
        );
        assert.strictEqual(final.defaultLevel, 'ultra');
        assert.strictEqual(final.pluginRoot, PLUGIN_ROOT);
    });
});

test('skill one-liner: rejects invalid value via set-config.js schema', () => {
    withTmpHome((tmpDir) => {
        spawnSync('node', [HOOK], {
            env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
            encoding: 'utf8',
        });
        const cmd = extractOneLiner().replace(/KEY=VALUE/, 'defaultLevel=bogus');
        const res = spawnSync('bash', ['-c', cmd], {
            env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
            encoding: 'utf8',
        });
        assert.notStrictEqual(res.status, 0);
        assert.match(res.stderr, /lite\|full\|ultra/);
    });
});
