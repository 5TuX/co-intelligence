const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'set-config.js');

function runCli(args, preConfig) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-test-'));
    const configDir = path.join(tmpDir, 'caveman');
    fs.mkdirSync(configDir, { recursive: true });
    if (preConfig) {
        fs.writeFileSync(path.join(configDir, 'config.json'), preConfig);
    }
    const res = spawnSync('node', [SCRIPT, ...args], {
        env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
        encoding: 'utf8',
    });
    const finalPath = path.join(configDir, 'config.json');
    const final = fs.existsSync(finalPath) ? JSON.parse(fs.readFileSync(finalPath, 'utf8')) : null;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { ...res, final };
}

test('set-config: off=true writes config', () => {
    const res = runCli(['off=true']);
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { off: true });
});

test('set-config: off=false writes config', () => {
    const res = runCli(['off=false'], '{"off":true}');
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { off: false });
});

test('set-config: defaultLevel=lite writes config', () => {
    const res = runCli(['defaultLevel=lite']);
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { defaultLevel: 'lite' });
});

test('set-config: remindEveryTurn=false writes config', () => {
    const res = runCli(['remindEveryTurn=false']);
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { remindEveryTurn: false });
});

test('set-config: multiple args merge', () => {
    const res = runCli(['off=true', 'defaultLevel=ultra']);
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { off: true, defaultLevel: 'ultra' });
});

test('set-config: unknown key rejected', () => {
    const res = runCli(['badKey=x']);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /unknown key/i);
});

test('set-config: off=maybe rejected', () => {
    const res = runCli(['off=maybe']);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /must be true or false/i);
});

test('set-config: defaultLevel=xxx rejected', () => {
    const res = runCli(['defaultLevel=xxx']);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /lite|full|ultra/i);
});

test('set-config: no args shows usage', () => {
    const res = runCli([]);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /usage/i);
});

test('set-config: malformed arg (no =) rejected', () => {
    const res = runCli(['off']);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /key=value/i);
});
