'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, readFileSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const REPO_ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'sync-upstream.js');
const INIT = join(REPO_ROOT, 'tests', 'sync-upstream', 'fixtures', 'init.sh');

let fixtureDir;

before(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'sync-upstream-'));
    const r = spawnSync('bash', [INIT, fixtureDir], { encoding: 'utf8' });
    if (r.status !== 0) {
        throw new Error(`init.sh failed: ${r.stderr}`);
    }
});

after(() => {
    if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true });
});

function runSync(args, { cwd } = {}) {
    return spawnSync('node', [SCRIPT, ...args], {
        encoding: 'utf8',
        cwd: cwd ?? join(fixtureDir, 'plugin-root'),
    });
}

function setLockSha(sha) {
    const lockPath = join(fixtureDir, 'plugin-root', 'plugins', 'fake-plugin', 'upstream.lock.json');
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    lock.pinned_sha = sha;
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}

function readSha(name) {
    return readFileSync(join(fixtureDir, `${name}.sha`), 'utf8').trim();
}

test('report mode is up-to-date when lock points at HEAD', () => {
    setLockSha(readSha('c3'));
    const r = runSync(['fake-plugin']);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /no changes/i);
});
