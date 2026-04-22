const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const SCRIPT = path.resolve(__dirname, "..", "scripts", "set-config.js");

function run(args, tmp) {
    return spawnSync(process.execPath, [SCRIPT, ...args], {
        env: { ...process.env, APPDATA: tmp, XDG_CONFIG_HOME: tmp },
        encoding: "utf8",
    });
}

function withTmp(fn) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stop-bell-setcfg-"));
    try { return fn(tmp); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

test("set-config: off=true writes config", () => {
    withTmp((tmp) => {
        const res = run(["off=true"], tmp);
        assert.strictEqual(res.status, 0, res.stderr);
        const stored = JSON.parse(fs.readFileSync(path.join(tmp, "stop-bell", "config.json"), "utf8"));
        assert.deepStrictEqual(stored, { off: true });
    });
});

test("set-config: off=false writes config", () => {
    withTmp((tmp) => {
        const res = run(["off=false"], tmp);
        assert.strictEqual(res.status, 0, res.stderr);
        const stored = JSON.parse(fs.readFileSync(path.join(tmp, "stop-bell", "config.json"), "utf8"));
        assert.deepStrictEqual(stored, { off: false });
    });
});

test("set-config: skipIfActive=false writes config", () => {
    withTmp((tmp) => {
        const res = run(["skipIfActive=false"], tmp);
        assert.strictEqual(res.status, 0, res.stderr);
        const stored = JSON.parse(fs.readFileSync(path.join(tmp, "stop-bell", "config.json"), "utf8"));
        assert.deepStrictEqual(stored, { skipIfActive: false });
    });
});

test("set-config: bellSound=default writes config", () => {
    withTmp((tmp) => {
        const res = run(["bellSound=default"], tmp);
        assert.strictEqual(res.status, 0, res.stderr);
        const stored = JSON.parse(fs.readFileSync(path.join(tmp, "stop-bell", "config.json"), "utf8"));
        assert.deepStrictEqual(stored, { bellSound: "default" });
    });
});

test("set-config: multiple args merge", () => {
    withTmp((tmp) => {
        const res = run(["off=true", "skipIfActive=false"], tmp);
        assert.strictEqual(res.status, 0, res.stderr);
        const stored = JSON.parse(fs.readFileSync(path.join(tmp, "stop-bell", "config.json"), "utf8"));
        assert.deepStrictEqual(stored, { off: true, skipIfActive: false });
    });
});

test("set-config: no args -> exit 1 with usage", () => {
    withTmp((tmp) => {
        const res = run([], tmp);
        assert.strictEqual(res.status, 1);
        assert.match(res.stderr, /usage:/);
    });
});

test("set-config: unknown key -> exit 1 with specific error", () => {
    withTmp((tmp) => {
        const res = run(["bogus=1"], tmp);
        assert.strictEqual(res.status, 1);
        assert.match(res.stderr, /unknown key .bogus./);
    });
});

test("set-config: invalid bool -> exit 1", () => {
    withTmp((tmp) => {
        const res = run(["off=maybe"], tmp);
        assert.strictEqual(res.status, 1);
        assert.match(res.stderr, /must be true or false/);
    });
});

test("set-config: invalid bellSound enum value -> exit 1", () => {
    withTmp((tmp) => {
        const res = run(["bellSound=bogus"], tmp);
        assert.strictEqual(res.status, 1);
        assert.match(res.stderr, /bellSound.*must be one of.*default/);
    });
});
