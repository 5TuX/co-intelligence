const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const SCRIPT = path.join(__dirname, '..', 'hooks', 'hook-user-prompt.js');

function runHook(userConfigContent, stdin) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-test-'));
    const configDir = path.join(tmpDir, 'caveman');
    fs.mkdirSync(configDir, { recursive: true });
    if (userConfigContent !== null) {
        fs.writeFileSync(path.join(configDir, 'config.json'), userConfigContent);
    }
    const res = spawnSync('node', [SCRIPT], {
        env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
        input: stdin || '',
        encoding: 'utf8',
    });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return res;
}

test('hook-user-prompt: off=true → silent', () => {
    const res = runHook('{"off":true}', '{"prompt":"hello"}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
});

test('hook-user-prompt: remindEveryTurn=false → silent', () => {
    const res = runHook('{"remindEveryTurn":false}', '{"prompt":"hello"}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
});

test('hook-user-prompt: default (on + remind) → keep talk caveman', () => {
    const res = runHook(null, '{"prompt":"hello"}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), 'keep talk caveman');
});

test('hook-user-prompt: malformed stdin still exits 0', () => {
    const res = runHook(null, 'not json');
    assert.strictEqual(res.status, 0);
});

test('hook-user-prompt: empty stdin still exits 0 and reminds', () => {
    const res = runHook(null, '');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), 'keep talk caveman');
});
