const { test } = require('node:test');
const assert = require('node:assert');

const { run, resolveSoundDefault } = require('../hooks/hook-stop.js');

function harness({ cfg, probeResult, probeThrows }) {
    const played = [];
    return {
        run: () => run({
            readConfig: () => cfg,
            probe: () => {
                if (probeThrows) throw probeThrows;
                return probeResult;
            },
            play: (p) => played.push(p),
            resolveSound: () => '/fake/bell.ogg',
        }),
        played,
    };
}

test('off=true → no play, no probe', () => {
    let probed = false;
    const played = [];
    run({
        readConfig: () => ({ off: true, skipIfActive: true, bellSound: 'default' }),
        probe: () => { probed = true; return false; },
        play: (p) => played.push(p),
        resolveSound: () => '/fake/bell.ogg',
    });
    assert.strictEqual(probed, false);
    assert.deepStrictEqual(played, []);
});

test('off=false, skipIfActive=true, probe=true → no play', () => {
    const h = harness({ cfg: { off: false, skipIfActive: true, bellSound: 'default' }, probeResult: true });
    h.run();
    assert.deepStrictEqual(h.played, []);
});

test('off=false, skipIfActive=true, probe=false → play', () => {
    const h = harness({ cfg: { off: false, skipIfActive: true, bellSound: 'default' }, probeResult: false });
    h.run();
    assert.deepStrictEqual(h.played, ['/fake/bell.ogg']);
});

test('off=false, skipIfActive=true, probe throws → fail-open, play', () => {
    const h = harness({ cfg: { off: false, skipIfActive: true, bellSound: 'default' }, probeThrows: new Error('wayland') });
    h.run();
    assert.deepStrictEqual(h.played, ['/fake/bell.ogg']);
});

test('off=false, skipIfActive=false → play without probe', () => {
    let probed = false;
    const played = [];
    run({
        readConfig: () => ({ off: false, skipIfActive: false, bellSound: 'default' }),
        probe: () => { probed = true; return true; },
        play: (p) => played.push(p),
        resolveSound: () => '/fake/bell.ogg',
    });
    assert.strictEqual(probed, false);
    assert.deepStrictEqual(played, ['/fake/bell.ogg']);
});

test('resolveSoundDefault: linux → bell.ogg', () => {
    assert.ok(resolveSoundDefault('default', 'linux').endsWith('bell.ogg'));
});

test('resolveSoundDefault: win32 → bell.wav', () => {
    assert.ok(resolveSoundDefault('default', 'win32').endsWith('bell.wav'));
});

test('resolveSoundDefault: darwin → bell.wav', () => {
    assert.ok(resolveSoundDefault('default', 'darwin').endsWith('bell.wav'));
});

test('resolveSoundDefault: unknown bellSound falls back to default', () => {
    assert.ok(resolveSoundDefault('nonexistent', 'linux').endsWith('bell.ogg'));
});
