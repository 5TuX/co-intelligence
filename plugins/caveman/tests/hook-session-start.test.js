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
    const configFile = path.join(configDir, 'config.json');
    if (userConfigContent !== null) {
        fs.writeFileSync(configFile, userConfigContent);
    }
    const res = spawnSync('node', [SCRIPT], {
        env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
        encoding: 'utf8',
    });
    const finalConfig = fs.existsSync(configFile)
        ? JSON.parse(fs.readFileSync(configFile, 'utf8'))
        : null;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { ...res, finalConfig };
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

test('hook-session-start: persists pluginRoot into user config', () => {
    const res = runHook(null);
    assert.strictEqual(res.status, 0);
    assert.ok(res.finalConfig, 'config.json created');
    const expected = path.resolve(path.dirname(SCRIPT), '..');
    assert.strictEqual(res.finalConfig.pluginRoot, expected);
});

test('hook-session-start: pluginRoot write preserves existing user values', () => {
    const res = runHook('{"defaultLevel":"ultra","off":true}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.finalConfig.defaultLevel, 'ultra');
    assert.strictEqual(res.finalConfig.off, true);
    const expected = path.resolve(path.dirname(SCRIPT), '..');
    assert.strictEqual(res.finalConfig.pluginRoot, expected);
});

test('hook-session-start: off=true still writes pluginRoot but stays silent', () => {
    const res = runHook('{"off":true}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
    const expected = path.resolve(path.dirname(SCRIPT), '..');
    assert.strictEqual(res.finalConfig.pluginRoot, expected);
});
