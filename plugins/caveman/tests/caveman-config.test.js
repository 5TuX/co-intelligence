const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');

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
