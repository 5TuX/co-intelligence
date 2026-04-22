const { test } = require('node:test');
const assert = require('node:assert');

const probe = require('../scripts/probe-foreground.js');

test('isForeground: fg pid in ancestors → true', () => {
    const result = probe.isForeground({
        platform: 'linux',
        getForegroundPid: () => 100,
        getAncestors: () => [200, 100, 1],
        pid: 999,
    });
    assert.strictEqual(result, true);
});

test('isForeground: fg pid not in ancestors → false', () => {
    const result = probe.isForeground({
        platform: 'linux',
        getForegroundPid: () => 777,
        getAncestors: () => [200, 100, 1],
        pid: 999,
    });
    assert.strictEqual(result, false);
});

test('isForeground: probe throws → rethrows', () => {
    assert.throws(
        () => probe.isForeground({
            platform: 'linux',
            getForegroundPid: () => { throw new Error('xprop missing'); },
            getAncestors: () => [],
            pid: 999,
        }),
        /xprop missing/,
    );
});

test('isForeground: own pid counts as ancestor (short-circuit)', () => {
    const result = probe.isForeground({
        platform: 'linux',
        getForegroundPid: () => 42,
        getAncestors: () => [42],
        pid: 999,
    });
    assert.strictEqual(result, true);
});

test('default getForegroundPid: unknown platform throws', () => {
    assert.throws(() => probe.getForegroundPidFor('plan9'), /unsupported platform/);
});
