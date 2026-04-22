const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { play, resolveCommand } = require('../scripts/play-sound.js');

test('resolveCommand: win32 trampolines through cmd /c start with forward-slash path', () => {
    const cmd = resolveCommand('win32', 'C:\\abs\\bell.wav');
    assert.strictEqual(cmd.exe, 'cmd');
    assert.deepStrictEqual(cmd.args.slice(0, 4), ['/c', 'start', '/b', '/min']);
    assert.strictEqual(cmd.args[4], 'powershell');
    const psScript = cmd.args[cmd.args.length - 1];
    assert.ok(psScript.includes('SoundPlayer'));
    assert.ok(psScript.includes('PlaySync'));
    assert.ok(psScript.includes("'C:/abs/bell.wav'"));
});

test('resolveCommand: win32 escapes single-quotes in path', () => {
    const cmd = resolveCommand('win32', "C:\\weird's\\bell.wav");
    const psScript = cmd.args[cmd.args.length - 1];
    assert.ok(psScript.includes("C:/weird''s/bell.wav"));
});

test('resolveCommand: darwin uses afplay', () => {
    const cmd = resolveCommand('darwin', '/abs/bell.wav');
    assert.deepStrictEqual(cmd, { exe: 'afplay', args: ['/abs/bell.wav'] });
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
