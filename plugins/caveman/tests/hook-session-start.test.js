const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'hook-session-start.js');

function runHook(userConfigContent) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-test-'));
    const configDir = path.join(tmpDir, 'caveman');
    fs.mkdirSync(configDir, { recursive: true });
    if (userConfigContent !== null) {
        fs.writeFileSync(path.join(configDir, 'config.json'), userConfigContent);
    }
    const res = spawnSync('node', [SCRIPT], {
        env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
        encoding: 'utf8',
    });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return res;
}

test('hook-session-start: off=true → silent', () => {
    const res = runHook('{"off":true}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
});

test('hook-session-start: default config → announces level', () => {
    const res = runHook(null);
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), 'caveman active at full level.');
});

test('hook-session-start: user level=lite → announces lite', () => {
    const res = runHook('{"defaultLevel":"lite"}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), 'caveman active at lite level.');
});
