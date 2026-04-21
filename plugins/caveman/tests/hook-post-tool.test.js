const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const SCRIPT = path.join(__dirname, '..', 'hooks', 'hook-post-tool.js');

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

test('hook-post-tool: off=true → empty JSON', () => {
    const res = runHook('{"off":true}', '{}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '{}');
});

test('hook-post-tool: remindEveryTurn=false → empty JSON', () => {
    const res = runHook('{"remindEveryTurn":false}', '{}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '{}');
});

test('hook-post-tool: default (on + remind) → hookSpecificOutput with reminder', () => {
    const res = runHook(null, '{}');
    assert.strictEqual(res.status, 0);
    const parsed = JSON.parse(res.stdout);
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.strictEqual(parsed.hookSpecificOutput.additionalContext, 'keep talk caveman');
});

test('hook-post-tool: empty stdin still exits 0 and emits reminder', () => {
    const res = runHook(null, '');
    assert.strictEqual(res.status, 0);
    const parsed = JSON.parse(res.stdout);
    assert.strictEqual(parsed.hookSpecificOutput.additionalContext, 'keep talk caveman');
});
