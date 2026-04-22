const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const SKILL_PATH = path.join(PLUGIN_ROOT, 'skills', 'sound-notification', 'SKILL.md');
const SKILL_BASE = path.join(PLUGIN_ROOT, 'skills', 'sound-notification');

function extractCommandTemplate() {
    const md = fs.readFileSync(SKILL_PATH, 'utf8');
    const match = md.match(/```bash\n(node "<SKILL_BASE>[^\n]+)\n```/);
    if (!match) throw new Error('skill command template not found in SKILL.md');
    return match[1];
}

function renderCommand(template, kv) {
    return template.replace('<SKILL_BASE>', SKILL_BASE).replace('KEY=VALUE', kv);
}

function withTmp(fn) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-notification-skill-'));
    try { return fn(tmp); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

test('skill command works with no pre-existing user config', () => {
    withTmp((tmp) => {
        assert.ok(!fs.existsSync(path.join(tmp, 'sound-notification', 'config.json')));
        const cmd = renderCommand(extractCommandTemplate(), 'off=true');
        const res = spawnSync('bash', ['-c', cmd], {
            env: { ...process.env, APPDATA: tmp, XDG_CONFIG_HOME: tmp },
            encoding: 'utf8',
        });
        assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
        assert.match(res.stdout, /wrote.*off.*true/);
        const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'sound-notification', 'config.json'), 'utf8'));
        assert.strictEqual(stored.off, true);
    });
});

test('skill command merges into existing user config without clobbering other keys', () => {
    withTmp((tmp) => {
        fs.mkdirSync(path.join(tmp, 'sound-notification'), { recursive: true });
        fs.writeFileSync(
            path.join(tmp, 'sound-notification', 'config.json'),
            JSON.stringify({ skipIfActive: true, bellSound: 'default' }) + '\n'
        );
        const cmd = renderCommand(extractCommandTemplate(), 'off=true');
        const res = spawnSync('bash', ['-c', cmd], {
            env: { ...process.env, APPDATA: tmp, XDG_CONFIG_HOME: tmp },
            encoding: 'utf8',
        });
        assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
        const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'sound-notification', 'config.json'), 'utf8'));
        assert.strictEqual(stored.off, true);
        assert.strictEqual(stored.skipIfActive, true);
        assert.strictEqual(stored.bellSound, 'default');
    });
});

test('skill command rejects invalid value via set-config.js schema', () => {
    withTmp((tmp) => {
        const cmd = renderCommand(extractCommandTemplate(), 'off=maybe');
        const res = spawnSync('bash', ['-c', cmd], {
            env: { ...process.env, APPDATA: tmp, XDG_CONFIG_HOME: tmp },
            encoding: 'utf8',
        });
        assert.notStrictEqual(res.status, 0);
        assert.match(res.stderr, /must be true or false/);
    });
});
