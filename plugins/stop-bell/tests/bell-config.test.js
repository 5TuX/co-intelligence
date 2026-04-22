const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const config = require('../scripts/bell-config.js');

test('userConfigPath: Windows uses APPDATA when set', () => {
    const prev = { platform: process.platform, APPDATA: process.env.APPDATA };
    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.env.APPDATA = 'C:\\Users\\u\\AppData\\Roaming';
    try {
        assert.strictEqual(
            config.userConfigPath(),
            path.join('C:\\Users\\u\\AppData\\Roaming', 'stop-bell', 'config.json')
        );
    } finally {
        Object.defineProperty(process, 'platform', { value: prev.platform });
        process.env.APPDATA = prev.APPDATA;
    }
});

test('userConfigPath: Windows falls back to USERPROFILE when APPDATA missing', () => {
    const prev = { platform: process.platform, APPDATA: process.env.APPDATA, USERPROFILE: process.env.USERPROFILE };
    Object.defineProperty(process, 'platform', { value: 'win32' });
    delete process.env.APPDATA;
    process.env.USERPROFILE = 'C:\\Users\\u';
    try {
        assert.strictEqual(
            config.userConfigPath(),
            path.join('C:\\Users\\u', '.config', 'stop-bell', 'config.json')
        );
    } finally {
        Object.defineProperty(process, 'platform', { value: prev.platform });
        process.env.APPDATA = prev.APPDATA;
        process.env.USERPROFILE = prev.USERPROFILE;
    }
});

test('userConfigPath: POSIX uses XDG_CONFIG_HOME when set', () => {
    const prev = { platform: process.platform, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
    Object.defineProperty(process, 'platform', { value: 'linux' });
    process.env.XDG_CONFIG_HOME = '/tmp/xdg';
    try {
        assert.strictEqual(
            config.userConfigPath(),
            path.join('/tmp/xdg', 'stop-bell', 'config.json')
        );
    } finally {
        Object.defineProperty(process, 'platform', { value: prev.platform });
        process.env.XDG_CONFIG_HOME = prev.XDG_CONFIG_HOME;
    }
});

test('read: missing user config returns plugin default', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-bell-'));
    try {
        const result = spawnRead(tmp);
        assert.deepStrictEqual(result, { off: false, skipIfActive: true, bellSound: 'default' });
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test('read: partial user config merged over default', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-bell-'));
    try {
        fs.mkdirSync(path.join(tmp, 'stop-bell'), { recursive: true });
        fs.writeFileSync(path.join(tmp, 'stop-bell', 'config.json'), JSON.stringify({ off: true }));
        const result = spawnRead(tmp);
        assert.deepStrictEqual(result, { off: true, skipIfActive: true, bellSound: 'default' });
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test('read: malformed user config returns plugin default alone', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-bell-'));
    try {
        fs.mkdirSync(path.join(tmp, 'stop-bell'), { recursive: true });
        fs.writeFileSync(path.join(tmp, 'stop-bell', 'config.json'), '{not-json');
        const result = spawnRead(tmp);
        assert.deepStrictEqual(result, { off: false, skipIfActive: true, bellSound: 'default' });
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test('write: creates config dir if missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-bell-'));
    try {
        const finalDir = path.join(tmp, 'stop-bell');
        fs.mkdirSync(finalDir, { recursive: true });
        assert.strictEqual(fs.existsSync(path.join(finalDir, 'config.json')), false);
        spawnWrite(tmp, { off: true });
        const stored = JSON.parse(fs.readFileSync(path.join(finalDir, 'config.json'), 'utf8'));
        assert.deepStrictEqual(stored, { off: true });
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test('write: merges into existing config, preserving other keys', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-bell-'));
    try {
        fs.mkdirSync(path.join(tmp, 'stop-bell'), { recursive: true });
        fs.writeFileSync(path.join(tmp, 'stop-bell', 'config.json'), JSON.stringify({ off: true, bellSound: 'default' }));
        spawnWrite(tmp, { skipIfActive: false });
        const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'stop-bell', 'config.json'), 'utf8'));
        assert.deepStrictEqual(stored, { off: true, bellSound: 'default', skipIfActive: false });
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

function spawnRead(tmp) {
    const { spawnSync } = require('node:child_process');
    const script = `const c = require('${path.resolve(__dirname, '..', 'scripts', 'bell-config.js').replace(/\\/g, '\\\\')}'); process.stdout.write(JSON.stringify(c.read()));`;
    const res = spawnSync(process.execPath, ['-e', script], {
        env: { ...process.env, APPDATA: tmp, XDG_CONFIG_HOME: tmp },
        encoding: 'utf8',
    });
    if (res.status !== 0) throw new Error(res.stderr);
    return JSON.parse(res.stdout);
}

function spawnWrite(tmp, partial) {
    const { spawnSync } = require('node:child_process');
    const script = `const c = require('${path.resolve(__dirname, '..', 'scripts', 'bell-config.js').replace(/\\/g, '\\\\')}'); c.write(${JSON.stringify(partial)});`;
    const res = spawnSync(process.execPath, ['-e', script], {
        env: { ...process.env, APPDATA: tmp, XDG_CONFIG_HOME: tmp },
        encoding: 'utf8',
    });
    if (res.status !== 0) throw new Error(res.stderr);
}
