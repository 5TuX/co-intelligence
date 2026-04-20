const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const config = require('../scripts/caveman-config.js');

test('userConfigPath: Windows uses APPDATA when set', () => {
    const prev = { platform: process.platform, APPDATA: process.env.APPDATA };
    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.env.APPDATA = 'C:\\Users\\u\\AppData\\Roaming';
    try {
        assert.strictEqual(
            config.userConfigPath(),
            path.join('C:\\Users\\u\\AppData\\Roaming', 'caveman', 'config.json')
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
            path.join('C:\\Users\\u', '.config', 'caveman', 'config.json')
        );
    } finally {
        Object.defineProperty(process, 'platform', { value: prev.platform });
        if (prev.APPDATA !== undefined) process.env.APPDATA = prev.APPDATA;
        if (prev.USERPROFILE !== undefined) process.env.USERPROFILE = prev.USERPROFILE;
    }
});

test('userConfigPath: POSIX uses XDG_CONFIG_HOME when set', () => {
    const prev = { platform: process.platform, XDG: process.env.XDG_CONFIG_HOME };
    Object.defineProperty(process, 'platform', { value: 'linux' });
    process.env.XDG_CONFIG_HOME = '/custom/xdg';
    try {
        assert.strictEqual(
            config.userConfigPath(),
            path.join('/custom/xdg', 'caveman', 'config.json')
        );
    } finally {
        Object.defineProperty(process, 'platform', { value: prev.platform });
        if (prev.XDG !== undefined) process.env.XDG_CONFIG_HOME = prev.XDG;
        else delete process.env.XDG_CONFIG_HOME;
    }
});

test('userConfigPath: POSIX falls back to ~/.config when XDG unset', () => {
    const prev = { platform: process.platform, XDG: process.env.XDG_CONFIG_HOME };
    Object.defineProperty(process, 'platform', { value: 'linux' });
    delete process.env.XDG_CONFIG_HOME;
    try {
        assert.strictEqual(
            config.userConfigPath(),
            path.join(os.homedir(), '.config', 'caveman', 'config.json')
        );
    } finally {
        Object.defineProperty(process, 'platform', { value: prev.platform });
        if (prev.XDG !== undefined) process.env.XDG_CONFIG_HOME = prev.XDG;
    }
});

function withTmpUserConfig(contents, fn) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    if (contents !== null) fs.writeFileSync(configPath, contents);
    const prev = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tmpDir;
    // caveman-config reads userConfigPath as <XDG>/caveman/config.json — write there
    const finalDir = path.join(tmpDir, 'caveman');
    fs.mkdirSync(finalDir, { recursive: true });
    if (contents !== null) {
        fs.renameSync(configPath, path.join(finalDir, 'config.json'));
    }
    try {
        return fn(path.join(finalDir, 'config.json'));
    } finally {
        if (prev !== undefined) process.env.XDG_CONFIG_HOME = prev;
        else delete process.env.XDG_CONFIG_HOME;
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

test('read: missing user config returns plugin default', () => {
    withTmpUserConfig(null, () => {
        const cfg = config.read();
        assert.deepStrictEqual(cfg, {
            defaultLevel: 'full',
            remindEveryTurn: true,
            off: false,
        });
    });
});

test('read: partial user config merged over default', () => {
    withTmpUserConfig('{"defaultLevel":"lite"}', () => {
        const cfg = config.read();
        assert.deepStrictEqual(cfg, {
            defaultLevel: 'lite',
            remindEveryTurn: true,
            off: false,
        });
    });
});

test('read: full user override returns user values', () => {
    withTmpUserConfig(
        '{"defaultLevel":"ultra","remindEveryTurn":false,"off":true}',
        () => {
            const cfg = config.read();
            assert.deepStrictEqual(cfg, {
                defaultLevel: 'ultra',
                remindEveryTurn: false,
                off: true,
            });
        }
    );
});

test('read: malformed user config returns plugin default', () => {
    withTmpUserConfig('not json {{{', () => {
        const cfg = config.read();
        assert.deepStrictEqual(cfg, {
            defaultLevel: 'full',
            remindEveryTurn: true,
            off: false,
        });
    });
});
