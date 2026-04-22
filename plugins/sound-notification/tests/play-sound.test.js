const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { play, resolveCommand } = require('../scripts/play-sound.js');

test('resolveCommand: win32 uses powershell MediaPlayer with absolute URI', () => {
    const cmd = resolveCommand('win32', 'C:\\abs\\bell.ogg');
    assert.strictEqual(cmd.exe, 'powershell');
    const joined = cmd.args.join(' ');
    assert.ok(joined.includes('MediaPlayer'));
    // path should appear escaped for powershell single-quoted strings
    assert.ok(joined.includes('C:\\\\abs\\\\bell.ogg') || joined.includes('C:/abs/bell.ogg'));
});

test('resolveCommand: darwin uses afplay', () => {
    const cmd = resolveCommand('darwin', '/abs/bell.ogg');
    assert.deepStrictEqual(cmd, { exe: 'afplay', args: ['/abs/bell.ogg'] });
});

test('resolveCommand: linux uses paplay', () => {
    const cmd = resolveCommand('linux', '/abs/bell.ogg');
    assert.deepStrictEqual(cmd, { exe: 'paplay', args: ['/abs/bell.ogg'] });
});

test('resolveCommand: unknown platform throws', () => {
    assert.throws(() => resolveCommand('plan9', '/x'), /unsupported platform/);
});

test('play: detached spawn called with resolved command', () => {
    const calls = [];
    const fakeSpawn = (exe, args, opts) => {
        calls.push({ exe, args, opts });
        return { unref: () => {} };
    };
    play('/abs/bell.ogg', { platform: 'linux', spawn: fakeSpawn });
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].exe, 'paplay');
    assert.deepStrictEqual(calls[0].args, ['/abs/bell.ogg']);
    assert.strictEqual(calls[0].opts.detached, true);
    assert.strictEqual(calls[0].opts.stdio, 'ignore');
});

test('play: spawn errors are swallowed (returns normally)', () => {
    const throwSpawn = () => { throw new Error('ENOENT'); };
    play('/abs/bell.ogg', { platform: 'linux', spawn: throwSpawn });
});
