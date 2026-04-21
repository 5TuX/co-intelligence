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

test('report shows commits, changed files, and candidate additions when behind', () => {
    setLockSha(readSha('c1'));
    const r = runSync(['fake-plugin']);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /c2: update foo, add bar/, 'lists c2 commit message');
    assert.match(r.stdout, /c3: update guide/, 'lists c3 commit message');
    assert.match(r.stdout, /skills\/foo\/SKILL\.md/, 'shows changed tracked file');
    assert.match(r.stdout, /updated foo skill content/, 'shows diff content of changed file');
    assert.match(r.stdout, /skills\/bar\/SKILL\.md/, 'flags new upstream file as candidate addition');
});

test('our-only files never appear in output', () => {
    setLockSha(readSha('c1'));
    const r = runSync(['fake-plugin']);
    assert.equal(r.status, 0);
    assert.doesNotMatch(r.stdout, /our-custom\.js/, 'ours-only file suppressed');
});

test('files in ignore_globs are excluded from candidate additions', () => {
    setLockSha(readSha('c1'));
    const r = runSync(['fake-plugin']);
    assert.equal(r.status, 0);
    assert.doesNotMatch(r.stdout, /install\.sh/, 'install.sh filtered by ignore_globs');
    assert.doesNotMatch(r.stdout, /^\s*README\.md\s*$/m, 'README.md filtered by ignore_globs');
});

test('--bump rewrites lock to upstream HEAD sha/tag/date', () => {
    setLockSha(readSha('c1'));
    const lockPath = join(fixtureDir, 'plugin-root', 'plugins', 'fake-plugin', 'upstream.lock.json');
    const before = JSON.parse(readFileSync(lockPath, 'utf8'));

    const r = runSync(['fake-plugin', '--bump']);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);

    const after = JSON.parse(readFileSync(lockPath, 'utf8'));
    assert.equal(after.pinned_sha, readSha('c3'));
    assert.equal(after.repo, before.repo);
    assert.ok(after.pinned_tag, 'pinned_tag populated');
    assert.match(after.last_synced_date, /^\d{4}-\d{2}-\d{2}$/);
});

test('--bump on up-to-date pin is a no-op sha-wise', () => {
    setLockSha(readSha('c3'));
    const lockPath = join(fixtureDir, 'plugin-root', 'plugins', 'fake-plugin', 'upstream.lock.json');

    const r = runSync(['fake-plugin', '--bump']);
    assert.equal(r.status, 0);

    const after = JSON.parse(readFileSync(lockPath, 'utf8'));
    assert.equal(after.pinned_sha, readSha('c3'));
});
