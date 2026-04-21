#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');

function die(msg, code = 1) {
    process.stderr.write(`sync-upstream: ${msg}\n`);
    process.exit(code);
}

function parseArgs(argv) {
    const args = { plugin: null, bump: false };
    for (const a of argv) {
        if (a === '--bump') args.bump = true;
        else if (a.startsWith('--')) die(`unknown flag: ${a}`, 2);
        else if (!args.plugin) args.plugin = a;
        else die(`unexpected positional arg: ${a}`, 2);
    }
    if (!args.plugin) die('usage: sync-upstream.js <plugin> [--bump]', 2);
    return args;
}

function loadLock(pluginDir) {
    const lockPath = join(pluginDir, 'upstream.lock.json');
    if (!existsSync(lockPath)) die(`missing ${lockPath}`);
    try {
        return { path: lockPath, data: JSON.parse(readFileSync(lockPath, 'utf8')) };
    } catch (e) {
        die(`invalid JSON in ${lockPath}: ${e.message}`);
    }
}

function git(args, opts = {}) {
    const r = spawnSync('git', args, { encoding: 'utf8', ...opts });
    if (r.status !== 0) {
        die(`git ${args.join(' ')} failed: ${r.stderr.trim() || r.stdout.trim()}`);
    }
    return r.stdout;
}

function cloneUpstream(repo) {
    const dir = mkdtempSync(join(tmpdir(), 'sync-upstream-'));
    git(['clone', '--quiet', repo, dir]);
    return dir;
}

function listTrackedFiles(repoRoot, subdir) {
    const out = git(['-C', repoRoot, 'ls-files', subdir]);
    return out.split('\n').filter(Boolean);
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const repoRoot = process.cwd();
    const pluginDir = join(repoRoot, 'plugins', args.plugin);
    if (!existsSync(pluginDir)) die(`plugin dir not found: ${pluginDir}`);

    const lock = loadLock(pluginDir);
    const { repo, pinned_sha } = lock.data;

    const upstream = cloneUpstream(repo);
    try {
        const headSha = git(['-C', upstream, 'rev-parse', 'HEAD']).trim();
        if (headSha === pinned_sha) {
            process.stdout.write(`no changes. upstream HEAD == pinned (${pinned_sha.slice(0, 10)}).\n`);
            return;
        }
        // Task 10 adds the diff path. For now, just log.
        process.stdout.write(`upstream has moved: ${pinned_sha.slice(0, 10)} → ${headSha.slice(0, 10)}\n`);
    } finally {
        rmSync(upstream, { recursive: true, force: true });
    }
}

main();
