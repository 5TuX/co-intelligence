# Caveman Persistent Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move caveman plugin behavior (`defaultLevel`, `remindEveryTurn`, `off`) from hard-coded hook strings into a cross-platform persistent user config that survives plugin updates on Linux, macOS, and Windows.

**Architecture:** Plugin ships `config.default.json` as shipped defaults. Node hook scripts (`scripts/hook-*.js`) read a merged config — `{...pluginDefault, ...userConfig}` — from a platform-specific user path (`%APPDATA%\caveman\config.json` on Windows, `~/.config/caveman/config.json` on POSIX). Persistent on/off changes are agent-driven via a `scripts/set-config.js` CLI. Hooks are invoked via `node -e "require(process.env.CLAUDE_PLUGIN_ROOT + '/scripts/<file>.js')"` so no shell variable expansion is required — works identically on POSIX and Windows shells.

**Tech Stack:** Node.js (ships with Claude Code), `node:test` built-in test runner (zero dependencies), POSIX/Windows filesystem APIs from Node stdlib.

**Spec reference:** `docs/superpowers/specs/2026-04-20-caveman-config-persistence-design.md`

**All paths below are relative to the repo root** (`/home/klockenbring/Documents/gdrive-shared/claude/co-intelligence`) unless prefixed with `$CLAUDE_PLUGIN_ROOT`.

---

## Task 1: Ship default config file

**Files:**
- Create: `plugins/caveman/config.default.json`

- [ ] **Step 1: Create the file**

Content:

```json
{
  "defaultLevel": "full",
  "remindEveryTurn": true,
  "off": false
}
```

- [ ] **Step 2: Validate JSON parses**

Run from repo root:

```bash
node -e "console.log(require('./plugins/caveman/config.default.json'))"
```

Expected stdout:

```
{ defaultLevel: 'full', remindEveryTurn: true, off: false }
```

- [ ] **Step 3: Commit**

```bash
git add plugins/caveman/config.default.json
git commit -m "Add default config for caveman plugin"
```

---

## Task 2: `caveman-config.js` — path resolution (TDD)

**Files:**
- Create: `plugins/caveman/scripts/caveman-config.js`
- Test: `plugins/caveman/tests/caveman-config.test.js`

- [ ] **Step 1: Write the failing test**

Create `plugins/caveman/tests/caveman-config.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/caveman && node --test tests/caveman-config.test.js
```

Expected: `Error: Cannot find module '../scripts/caveman-config.js'` — all tests fail.

- [ ] **Step 3: Write minimal implementation**

Create `plugins/caveman/scripts/caveman-config.js`:

```javascript
const path = require('node:path');
const os = require('node:os');

function userConfigPath() {
    if (process.platform === 'win32') {
        const base = process.env.APPDATA || path.join(process.env.USERPROFILE || os.homedir(), '.config');
        return path.join(base, 'caveman', 'config.json');
    }
    const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(base, 'caveman', 'config.json');
}

module.exports = { userConfigPath };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/caveman && node --test tests/caveman-config.test.js
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add plugins/caveman/scripts/caveman-config.js plugins/caveman/tests/caveman-config.test.js
git commit -m "Add caveman-config.userConfigPath with cross-platform resolution"
```

---

## Task 3: `caveman-config.js` — `read()` with merge (TDD)

**Files:**
- Modify: `plugins/caveman/scripts/caveman-config.js`
- Test: `plugins/caveman/tests/caveman-config.test.js:append`

- [ ] **Step 1: Append failing tests**

Append to `plugins/caveman/tests/caveman-config.test.js`:

```javascript
const fs = require('node:fs');

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
```

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
cd plugins/caveman && node --test tests/caveman-config.test.js
```

Expected: 4 previously-passing tests still pass, 4 new tests fail with `config.read is not a function`.

- [ ] **Step 3: Add `read()` to the lib**

Replace `plugins/caveman/scripts/caveman-config.js` with:

```javascript
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const PLUGIN_DEFAULT_PATH = path.join(__dirname, '..', 'config.default.json');

function userConfigPath() {
    if (process.platform === 'win32') {
        const base = process.env.APPDATA || path.join(process.env.USERPROFILE || os.homedir(), '.config');
        return path.join(base, 'caveman', 'config.json');
    }
    const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(base, 'caveman', 'config.json');
}

function readPluginDefault() {
    try {
        return JSON.parse(fs.readFileSync(PLUGIN_DEFAULT_PATH, 'utf8'));
    } catch (err) {
        process.stderr.write(`caveman: plugin default unreadable (${err.message}), using fallback\n`);
        return { defaultLevel: 'full', remindEveryTurn: true, off: false };
    }
}

function readUserConfig() {
    const p = userConfigPath();
    if (!fs.existsSync(p)) return {};
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
        process.stderr.write(`caveman: user config malformed (${err.message}), ignoring\n`);
        return {};
    }
}

function read() {
    return { ...readPluginDefault(), ...readUserConfig() };
}

module.exports = { userConfigPath, read };
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd plugins/caveman && node --test tests/caveman-config.test.js
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/caveman/scripts/caveman-config.js plugins/caveman/tests/caveman-config.test.js
git commit -m "Add caveman-config.read with plugin default + user override merge"
```

---

## Task 4: `caveman-config.js` — `write()` atomic (TDD)

**Files:**
- Modify: `plugins/caveman/scripts/caveman-config.js`
- Test: `plugins/caveman/tests/caveman-config.test.js:append`

- [ ] **Step 1: Append failing tests**

Append to `plugins/caveman/tests/caveman-config.test.js`:

```javascript
test('write: creates config dir if missing (first-write)', () => {
    withTmpUserConfig(null, (configFile) => {
        fs.rmSync(path.dirname(configFile), { recursive: true, force: true });
        config.write({ off: true });
        assert.ok(fs.existsSync(configFile), 'config file created');
        assert.deepStrictEqual(
            JSON.parse(fs.readFileSync(configFile, 'utf8')),
            { off: true }
        );
    });
});

test('write: merges into existing config, preserving other keys', () => {
    withTmpUserConfig('{"defaultLevel":"lite","off":false}', () => {
        config.write({ off: true });
        const cfg = config.read();
        assert.strictEqual(cfg.defaultLevel, 'lite');
        assert.strictEqual(cfg.off, true);
        assert.strictEqual(cfg.remindEveryTurn, true);
    });
});

test('write: rejects non-object partial', () => {
    withTmpUserConfig(null, () => {
        assert.throws(() => config.write('oops'), /object/i);
        assert.throws(() => config.write(null), /object/i);
    });
});
```

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
cd plugins/caveman && node --test tests/caveman-config.test.js
```

Expected: 8 existing pass, 3 new fail with `config.write is not a function`.

- [ ] **Step 3: Add `write()` to the lib**

Replace `plugins/caveman/scripts/caveman-config.js` with:

```javascript
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const PLUGIN_DEFAULT_PATH = path.join(__dirname, '..', 'config.default.json');

function userConfigPath() {
    if (process.platform === 'win32') {
        const base = process.env.APPDATA || path.join(process.env.USERPROFILE || os.homedir(), '.config');
        return path.join(base, 'caveman', 'config.json');
    }
    const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(base, 'caveman', 'config.json');
}

function readPluginDefault() {
    try {
        return JSON.parse(fs.readFileSync(PLUGIN_DEFAULT_PATH, 'utf8'));
    } catch (err) {
        process.stderr.write(`caveman: plugin default unreadable (${err.message}), using fallback\n`);
        return { defaultLevel: 'full', remindEveryTurn: true, off: false };
    }
}

function readUserConfig() {
    const p = userConfigPath();
    if (!fs.existsSync(p)) return {};
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
        process.stderr.write(`caveman: user config malformed (${err.message}), ignoring\n`);
        return {};
    }
}

function read() {
    return { ...readPluginDefault(), ...readUserConfig() };
}

function write(partial) {
    if (partial === null || typeof partial !== 'object' || Array.isArray(partial)) {
        throw new Error('write(partial): partial must be a non-null object');
    }
    const p = userConfigPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const existing = readUserConfig();
    const merged = { ...existing, ...partial };
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(merged, null, 2) + '\n');
    fs.renameSync(tmp, p);
}

module.exports = { userConfigPath, read, write };
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd plugins/caveman && node --test tests/caveman-config.test.js
```

Expected: 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/caveman/scripts/caveman-config.js plugins/caveman/tests/caveman-config.test.js
git commit -m "Add caveman-config.write with atomic merge"
```

---

## Task 5: `hook-session-start.js` (TDD)

**Files:**
- Create: `plugins/caveman/scripts/hook-session-start.js`
- Test: `plugins/caveman/tests/hook-session-start.test.js`

- [ ] **Step 1: Write the failing test**

Create `plugins/caveman/tests/hook-session-start.test.js`:

```javascript
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'hook-session-start.js');

function runHook(userConfigContent) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-test-'));
    const configDir = path.join(tmpDir, 'caveman');
    fs.mkdirSync(configDir, { recursive: true });
    if (userConfigContent !== null) {
        fs.writeFileSync(path.join(configDir, 'config.json'), userConfigContent);
    }
    const res = spawnSync('node', [SCRIPT], {
        env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
        encoding: 'utf8',
    });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return res;
}

test('hook-session-start: off=true → silent', () => {
    const res = runHook('{"off":true}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
});

test('hook-session-start: default config → announces level', () => {
    const res = runHook(null);
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), 'caveman active at full level.');
});

test('hook-session-start: user level=lite → announces lite', () => {
    const res = runHook('{"defaultLevel":"lite"}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), 'caveman active at lite level.');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/caveman && node --test tests/hook-session-start.test.js
```

Expected: 3 tests fail (`Error: Cannot find module ... hook-session-start.js`).

- [ ] **Step 3: Write minimal implementation**

Create `plugins/caveman/scripts/hook-session-start.js`:

```javascript
const config = require('./caveman-config.js');

const cfg = config.read();
if (cfg.off) process.exit(0);
process.stdout.write(`caveman active at ${cfg.defaultLevel} level.\n`);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/caveman && node --test tests/hook-session-start.test.js
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/caveman/scripts/hook-session-start.js plugins/caveman/tests/hook-session-start.test.js
git commit -m "Add hook-session-start.js reading config for level announcement"
```

---

## Task 6: `hook-user-prompt.js` (TDD)

**Files:**
- Create: `plugins/caveman/scripts/hook-user-prompt.js`
- Test: `plugins/caveman/tests/hook-user-prompt.test.js`

- [ ] **Step 1: Write the failing test**

Create `plugins/caveman/tests/hook-user-prompt.test.js`:

```javascript
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'hook-user-prompt.js');

function runHook(userConfigContent, stdin) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-test-'));
    const configDir = path.join(tmpDir, 'caveman');
    fs.mkdirSync(configDir, { recursive: true });
    if (userConfigContent !== null) {
        fs.writeFileSync(path.join(configDir, 'config.json'), userConfigContent);
    }
    const res = spawnSync('node', [SCRIPT], {
        env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
        input: stdin || '',
        encoding: 'utf8',
    });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return res;
}

test('hook-user-prompt: off=true → silent', () => {
    const res = runHook('{"off":true}', '{"prompt":"hello"}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
});

test('hook-user-prompt: remindEveryTurn=false → silent', () => {
    const res = runHook('{"remindEveryTurn":false}', '{"prompt":"hello"}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
});

test('hook-user-prompt: default (on + remind) → keep talk caveman', () => {
    const res = runHook(null, '{"prompt":"hello"}');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), 'keep talk caveman');
});

test('hook-user-prompt: malformed stdin still exits 0', () => {
    const res = runHook(null, 'not json');
    assert.strictEqual(res.status, 0);
});

test('hook-user-prompt: empty stdin still exits 0 and reminds', () => {
    const res = runHook(null, '');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), 'keep talk caveman');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/caveman && node --test tests/hook-user-prompt.test.js
```

Expected: 5 tests fail (`Error: Cannot find module ... hook-user-prompt.js`).

- [ ] **Step 3: Write minimal implementation**

Create `plugins/caveman/scripts/hook-user-prompt.js`:

```javascript
const config = require('./caveman-config.js');

// Read stdin to drain the hook payload — we do not parse the prompt here.
// Intent classification is delegated to the agent (skill rules).
let stdin = '';
process.stdin.on('data', (chunk) => { stdin += chunk; });
process.stdin.on('end', () => {
    if (stdin) {
        try { JSON.parse(stdin); } catch (err) {
            process.stderr.write(`caveman: hook payload not JSON (${err.message})\n`);
        }
    }
    const cfg = config.read();
    if (cfg.off) process.exit(0);
    if (cfg.remindEveryTurn) process.stdout.write('keep talk caveman\n');
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/caveman && node --test tests/hook-user-prompt.test.js
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/caveman/scripts/hook-user-prompt.js plugins/caveman/tests/hook-user-prompt.test.js
git commit -m "Add hook-user-prompt.js emitting per-turn reminder gated by config"
```

---

## Task 7: `set-config.js` CLI (TDD)

**Files:**
- Create: `plugins/caveman/scripts/set-config.js`
- Test: `plugins/caveman/tests/set-config.test.js`

- [ ] **Step 1: Write the failing test**

Create `plugins/caveman/tests/set-config.test.js`:

```javascript
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'set-config.js');

function runCli(args, preConfig) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-test-'));
    const configDir = path.join(tmpDir, 'caveman');
    fs.mkdirSync(configDir, { recursive: true });
    if (preConfig) {
        fs.writeFileSync(path.join(configDir, 'config.json'), preConfig);
    }
    const res = spawnSync('node', [SCRIPT, ...args], {
        env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
        encoding: 'utf8',
    });
    const finalPath = path.join(configDir, 'config.json');
    const final = fs.existsSync(finalPath) ? JSON.parse(fs.readFileSync(finalPath, 'utf8')) : null;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { ...res, final };
}

test('set-config: off=true writes config', () => {
    const res = runCli(['off=true']);
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { off: true });
});

test('set-config: off=false writes config', () => {
    const res = runCli(['off=false'], '{"off":true}');
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { off: false });
});

test('set-config: defaultLevel=lite writes config', () => {
    const res = runCli(['defaultLevel=lite']);
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { defaultLevel: 'lite' });
});

test('set-config: remindEveryTurn=false writes config', () => {
    const res = runCli(['remindEveryTurn=false']);
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { remindEveryTurn: false });
});

test('set-config: multiple args merge', () => {
    const res = runCli(['off=true', 'defaultLevel=ultra']);
    assert.strictEqual(res.status, 0);
    assert.deepStrictEqual(res.final, { off: true, defaultLevel: 'ultra' });
});

test('set-config: unknown key rejected', () => {
    const res = runCli(['badKey=x']);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /unknown key/i);
});

test('set-config: off=maybe rejected', () => {
    const res = runCli(['off=maybe']);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /must be true or false/i);
});

test('set-config: defaultLevel=xxx rejected', () => {
    const res = runCli(['defaultLevel=xxx']);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /lite|full|ultra/i);
});

test('set-config: no args shows usage', () => {
    const res = runCli([]);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /usage/i);
});

test('set-config: malformed arg (no =) rejected', () => {
    const res = runCli(['off']);
    assert.strictEqual(res.status, 1);
    assert.match(res.stderr, /key=value/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/caveman && node --test tests/set-config.test.js
```

Expected: 10 tests fail.

- [ ] **Step 3: Write minimal implementation**

Create `plugins/caveman/scripts/set-config.js`:

```javascript
const config = require('./caveman-config.js');

const SCHEMA = {
    off:              { type: 'bool' },
    remindEveryTurn:  { type: 'bool' },
    defaultLevel:     { type: 'enum', values: ['lite', 'full', 'ultra'] },
};

function usage() {
    process.stderr.write([
        'usage: node set-config.js <key>=<value> [<key>=<value> ...]',
        'keys: off=true|false, remindEveryTurn=true|false, defaultLevel=lite|full|ultra',
    ].join('\n') + '\n');
}

function parseArg(arg) {
    const eq = arg.indexOf('=');
    if (eq < 0) {
        process.stderr.write(`caveman: '${arg}' must be key=value\n`);
        return null;
    }
    const key = arg.slice(0, eq);
    const raw = arg.slice(eq + 1);
    const schema = SCHEMA[key];
    if (!schema) {
        process.stderr.write(`caveman: unknown key '${key}'\n`);
        return null;
    }
    if (schema.type === 'bool') {
        if (raw !== 'true' && raw !== 'false') {
            process.stderr.write(`caveman: '${key}' must be true or false (got '${raw}')\n`);
            return null;
        }
        return [key, raw === 'true'];
    }
    if (schema.type === 'enum') {
        if (!schema.values.includes(raw)) {
            process.stderr.write(`caveman: '${key}' must be one of ${schema.values.join('|')} (got '${raw}')\n`);
            return null;
        }
        return [key, raw];
    }
    return null;
}

const args = process.argv.slice(2);
if (args.length === 0) {
    usage();
    process.exit(1);
}

const partial = {};
for (const arg of args) {
    const parsed = parseArg(arg);
    if (!parsed) process.exit(1);
    partial[parsed[0]] = parsed[1];
}

try {
    config.write(partial);
    process.stdout.write(`caveman: wrote ${JSON.stringify(partial)}\n`);
} catch (err) {
    process.stderr.write(`caveman: write failed: ${err.message}\n`);
    process.exit(1);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/caveman && node --test tests/set-config.test.js
```

Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/caveman/scripts/set-config.js plugins/caveman/tests/set-config.test.js
git commit -m "Add set-config.js CLI with schema validation"
```

---

## Task 8: Wire hooks in `plugin.json` + bump version

**Files:**
- Modify: `plugins/caveman/.claude-plugin/plugin.json`

- [ ] **Step 1: Read current plugin.json**

Read `plugins/caveman/.claude-plugin/plugin.json` to see existing structure. It currently has `SessionStart` (echo) and `UserPromptSubmit` (echo) hooks and version `1.6.0-5tux.1`.

- [ ] **Step 2: Replace hook commands and bump version**

Replace the file with:

```json
{
    "name": "caveman",
    "version": "1.6.0-5tux.2",
    "description": "Ultra-compressed caveman-style responses (~75% token reduction).",
    "author": {
        "name": "Julius Brussee"
    },
    "contributors": [
        {
            "name": "5TuX"
        }
    ],
    "keywords": ["tokens", "compression", "brevity", "caveman"],
    "license": "MIT",
    "repository": "https://github.com/5TuX/co-intelligence.git",
    "skills": ["./skills/caveman"],
    "hooks": {
        "SessionStart": [
            {
                "hooks": [
                    {
                        "type": "command",
                        "command": "node -e \"require(process.env.CLAUDE_PLUGIN_ROOT + '/scripts/hook-session-start.js')\""
                    }
                ]
            }
        ],
        "UserPromptSubmit": [
            {
                "hooks": [
                    {
                        "type": "command",
                        "command": "node -e \"require(process.env.CLAUDE_PLUGIN_ROOT + '/scripts/hook-user-prompt.js')\""
                    }
                ]
            }
        ]
    }
}
```

- [ ] **Step 3: Run repo consistency check**

```bash
bash scripts/check-consistency.sh
```

Expected: all checks pass, caveman reported as `1.6.0-5tux.2`.

- [ ] **Step 4: Commit**

```bash
git add plugins/caveman/.claude-plugin/plugin.json
git commit -m "Wire caveman hooks to node scripts and bump to 5tux.2"
```

---

## Task 9: Add off-switch intent rules to `SKILL.md`

**Files:**
- Modify: `plugins/caveman/skills/caveman/SKILL.md`

- [ ] **Step 1: Read current SKILL.md**

Read `plugins/caveman/skills/caveman/SKILL.md` to locate where to insert. There should be a "Triggers" or "Off" section. Append after existing triggers.

- [ ] **Step 2: Append off-switch rules**

Add this section at the end of `plugins/caveman/skills/caveman/SKILL.md` (before any License/footer):

```markdown
## Persistent on/off (agent-driven)

The plugin ships a user config at `$APPDATA/caveman/config.json` (Windows) or `$XDG_CONFIG_HOME/caveman/config.json` (POSIX, falling back to `~/.config/caveman/config.json`). The user can change persistent state by asking.

Classify user intent into one of four classes:

1. **Persistent off** — user wants caveman disabled across sessions (e.g. "caveman off permanently", "disable caveman forever", "kill caveman for good"). Run via Bash: `node "$CLAUDE_PLUGIN_ROOT/scripts/set-config.js" off=true`. Confirm the change.
2. **Persistent on** — user wants caveman re-enabled (e.g. "caveman on", "resume caveman", "enable caveman permanently"). Run: `node "$CLAUDE_PLUGIN_ROOT/scripts/set-config.js" off=false`. Confirm.
3. **Session-only stop** — user wants caveman to stop this session only (e.g. "stop caveman", "normal mode", "pause caveman" without a permanence keyword). Stop responding in caveman for the rest of this session. Do not write the config. Mention: "say 'caveman off permanently' to stop across sessions."
4. **Ambiguous** — intent unclear. Ask one clarifying question before acting.

When you invoke `set-config.js`, read stdout/stderr to confirm success before reporting to the user. If the command exits non-zero, surface the error.
```

- [ ] **Step 3: Bump plugin version for behavior change**

Edit `plugins/caveman/.claude-plugin/plugin.json` — change `"version": "1.6.0-5tux.2"` to `"version": "1.6.0-5tux.3"`.

- [ ] **Step 4: Run repo consistency check**

```bash
bash scripts/check-consistency.sh
```

Expected: all checks pass, caveman reported as `1.6.0-5tux.3`.

- [ ] **Step 5: Commit**

```bash
git add plugins/caveman/skills/caveman/SKILL.md plugins/caveman/.claude-plugin/plugin.json
git commit -m "Add persistent on/off intent rules to caveman skill"
```

---

## Task 10: Update `UPSTREAM.md` and `README.md`

**Files:**
- Modify: `plugins/caveman/UPSTREAM.md`
- Modify: `plugins/caveman/README.md`

- [ ] **Step 1: Update UPSTREAM.md simplifications list**

In `plugins/caveman/UPSTREAM.md`, replace the SessionStart/UserPromptSubmit bullet under "Simplifications applied" with:

```markdown
- Replaced upstream auto-activation machinery with two Claude Code hooks in `.claude-plugin/plugin.json` backed by node scripts under `scripts/`: `SessionStart` announces the active level from config, `UserPromptSubmit` emits a per-turn drift reminder gated by config. Hook behavior (default level, reminder toggle, permanent off) is driven by a persistent user config (`%APPDATA%\caveman\config.json` on Windows, `~/.config/caveman/config.json` on POSIX) merged over shipped `config.default.json`. Off-switch intent detection is agent-driven (see `skills/caveman/SKILL.md`) and writes via `scripts/set-config.js`.
```

- [ ] **Step 2: Update README.md install + usage sections**

In `plugins/caveman/README.md`, find the "Install" section and append a new subsection after it:

```markdown
### Configuration

The plugin ships defaults in `config.default.json`. User overrides persist across plugin updates at:

- **Linux / macOS:** `$XDG_CONFIG_HOME/caveman/config.json` (falls back to `~/.config/caveman/config.json`)
- **Windows:** `%APPDATA%\caveman\config.json` (falls back to `%USERPROFILE%\.config\caveman\config.json`)

Keys:

| Key               | Values                | Default  | Effect                                                     |
|-------------------|-----------------------|----------|------------------------------------------------------------|
| `defaultLevel`    | `lite`, `full`, `ultra` | `full`   | Level announced at session start.                          |
| `remindEveryTurn` | `true`, `false`       | `true`   | Whether the per-turn `keep talk caveman` reminder fires.   |
| `off`             | `true`, `false`       | `false`  | When `true`, both hooks are silent — caveman is disabled.  |

Ask the agent to change persistent settings in natural language (e.g. "disable caveman permanently", "caveman on"). The agent calls `scripts/set-config.js` to write the user config.
```

Also replace the "Intensity levels" subsection header intro (just before the table) to reflect that the default now comes from config:

Find:

```markdown
Ultra is the default in this marketplace — the SessionStart hook enforces it every new session. Switch to `lite`/`full` per session as needed. Level persists until changed or session ends.
```

Replace with:

```markdown
The shipped default is `full`. The SessionStart hook reads the user config and announces the active level at session start — change `defaultLevel` in the user config (see **Configuration** above) to persist a different default across sessions. Switch ad-hoc within a session with the triggers below; the change is session-scoped only.
```

Also in the "Intensity levels" table, remove the `*(default)*` marker from the `Ultra` row (default is now `full`, user-configurable).

- [ ] **Step 3: Run repo consistency check**

```bash
bash scripts/check-consistency.sh
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add plugins/caveman/UPSTREAM.md plugins/caveman/README.md
git commit -m "Document caveman user config location and persistent on/off flow"
```

---

## Task 11: Full test suite + smoke verification

- [ ] **Step 1: Run the full test suite**

```bash
cd plugins/caveman && node --test tests/
```

Expected: all tests pass (8 in caveman-config.test.js + 3 in hook-session-start.test.js + 5 in hook-user-prompt.test.js + 10 in set-config.test.js = 26 tests).

- [ ] **Step 2: Run repo consistency check from repo root**

```bash
bash scripts/check-consistency.sh
```

Expected: passes.

- [ ] **Step 3: Manual smoke — default behavior**

Export a throwaway XDG path and run the session-start hook directly to simulate a fresh install:

```bash
export XDG_CONFIG_HOME="$(mktemp -d)"
node -e "require('$PWD/plugins/caveman/scripts/hook-session-start.js')"
```

Expected stdout: `caveman active at full level.`

- [ ] **Step 4: Manual smoke — permanent off**

```bash
node plugins/caveman/scripts/set-config.js off=true
node -e "require('$PWD/plugins/caveman/scripts/hook-session-start.js')"
```

Expected: set-config prints `caveman: wrote {"off":true}`, hook prints nothing.

- [ ] **Step 5: Manual smoke — permanent on + custom level**

```bash
node plugins/caveman/scripts/set-config.js off=false defaultLevel=lite
node -e "require('$PWD/plugins/caveman/scripts/hook-session-start.js')"
```

Expected hook stdout: `caveman active at lite level.`

- [ ] **Step 6: Clean up the throwaway config**

```bash
rm -rf "$XDG_CONFIG_HOME"
unset XDG_CONFIG_HOME
```

- [ ] **Step 7: Push**

```bash
git push
```

---

## Self-review notes

- **Spec coverage:** Sections 1 (architecture), 2 (components), 3 (data flow), 4 (error handling), 5 (testing) of the spec are each implemented across Tasks 1–7 (lib + scripts + tests), Task 8 (plugin.json wiring), Task 9 (skill rules), Task 10 (docs), Task 11 (verification). The four intent classes from the spec's "Off-switch toggle flow" appear verbatim in Task 9's `SKILL.md` patch.
- **Placeholder scan:** No `TBD`, `TODO`, or "similar to Task N" references. Every code block is complete.
- **Type consistency:** The `write(partial)` signature is introduced in Task 4 and used identically in Task 7 (`set-config.js`). `read()` returns the same merged-object shape across all consumers. `userConfigPath()` is single-source-of-truth for the config path, used by all three of `read`, `write`, and the test helpers.
- **Error handling:** Covered by tests in Tasks 3 (malformed user config), 4 (non-object partial), 6 (malformed stdin), 7 (bad CLI args). The `%APPDATA%` unset and `%USERPROFILE%` fallback are covered in Task 2's path tests.
