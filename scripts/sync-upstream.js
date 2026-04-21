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

function globToRegExp(glob) {
    // Minimal ** / * support — sufficient for our ignore_globs shape.
    let re = '';
    let i = 0;
    while (i < glob.length) {
        const c = glob[i];
        if (c === '*' && glob[i + 1] === '*') {
            re += '.*';
            i += 2;
            if (glob[i] === '/') i += 1;
        } else if (c === '*') {
            re += '[^/]*';
            i += 1;
        } else if (c === '?') {
            re += '[^/]';
            i += 1;
        } else if (/[.+^${}()|[\]\\]/.test(c)) {
            re += '\\' + c;
            i += 1;
        } else {
            re += c;
            i += 1;
        }
    }
    return new RegExp('^' + re + '$');
}

function matchesAny(path, globs) {
    return globs.some((g) => globToRegExp(g).test(path));
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function describeTag(upstream, sha) {
    const r = spawnSync('git', ['-C', upstream, 'describe', '--tags', '--exact-match', sha], {
        encoding: 'utf8',
    });
    if (r.status === 0) return r.stdout.trim();
    const r2 = spawnSync('git', ['-C', upstream, 'describe', '--tags', '--always', sha], {
        encoding: 'utf8',
    });
    return r2.status === 0 ? r2.stdout.trim() : sha.slice(0, 10);
}

function writeLock(lock, data) {
    writeFileSync(lock.path, JSON.stringify(data, null, 2) + '\n');
}

function runBump(lock, upstream, args) {
    const headSha = git(['-C', upstream, 'rev-parse', 'HEAD']).trim();
    const tag = describeTag(upstream, headSha);
    const next = {
        ...lock.data,
        pinned_sha: headSha,
        pinned_tag: tag,
        last_synced_date: today(),
    };
    writeLock(lock, next);
    process.stdout.write(`pin bumped: ${lock.data.pinned_sha.slice(0, 10)} → ${headSha.slice(0, 10)} (${tag}).\n`);
    process.stdout.write('don\'t forget to update plugin.json version if behavior changed.\n');
}

function runReport(lock, upstream, args, repoRoot) {
    const { pinned_sha } = lock.data;
    const headSha = git(['-C', upstream, 'rev-parse', 'HEAD']).trim();
    if (headSha === pinned_sha) {
        process.stdout.write(`no changes. upstream HEAD == pinned (${pinned_sha.slice(0, 10)}).\n`);
        return;
    }

    const ignoreGlobs = Array.isArray(lock.data.ignore_globs) ? lock.data.ignore_globs : [];
    const pluginRel = `plugins/${args.plugin}`;
    const ourFiles = new Set(
        listTrackedFiles(repoRoot, pluginRel).map((f) =>
            f.startsWith(pluginRel + '/') ? f.slice(pluginRel.length + 1) : f
        )
    );
    const upstreamFiles = new Set(listTrackedFiles(upstream, '.').map((f) => f.replace(/^\.\//, '')));

    const changedBoth = [];
    for (const f of ourFiles) {
        if (!upstreamFiles.has(f)) continue;
        const diff = git(
            ['-C', upstream, 'diff', '--no-color', `${pinned_sha}..${headSha}`, '--', f],
            { maxBuffer: 50 * 1024 * 1024 }
        );
        if (diff.trim()) changedBoth.push({ file: f, diff });
    }

    const candidates = [...upstreamFiles]
        .filter((f) => !ourFiles.has(f))
        .filter((f) => !matchesAny(f, ignoreGlobs))
        .sort();

    const commits = git([
        '-C', upstream, 'log', '--oneline', '--no-color', `${pinned_sha}..${headSha}`,
    ]);

    process.stdout.write(`== sync-upstream: ${args.plugin} ==\n`);
    process.stdout.write(`pinned: ${pinned_sha.slice(0, 10)}  upstream HEAD: ${headSha.slice(0, 10)}\n\n`);
    process.stdout.write('-- commits since pin --\n');
    process.stdout.write(commits || '(none)\n');
    process.stdout.write('\n-- changed files (tracked both sides) --\n');
    if (changedBoth.length === 0) process.stdout.write('(none)\n');
    for (const c of changedBoth) {
        process.stdout.write(`\n### ${c.file}\n`);
        process.stdout.write(c.diff);
    }
    process.stdout.write('\n-- candidate additions (upstream files we do not ship) --\n');
    if (candidates.length === 0) process.stdout.write('(none)\n');
    else for (const f of candidates) process.stdout.write(`  ${f}\n`);
    process.stdout.write('\nNext: port by hand, update README "What\'s different from upstream", run tests, then sync-upstream.js <plugin> --bump.\n');
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const repoRoot = process.cwd();
    const pluginDir = join(repoRoot, 'plugins', args.plugin);
    if (!existsSync(pluginDir)) die(`plugin dir not found: ${pluginDir}`);

    const lock = loadLock(pluginDir);
    const upstream = cloneUpstream(lock.data.repo);
    try {
        if (args.bump) runBump(lock, upstream, args);
        else runReport(lock, upstream, args, repoRoot);
    } finally {
        rmSync(upstream, { recursive: true, force: true });
    }
}

main();
