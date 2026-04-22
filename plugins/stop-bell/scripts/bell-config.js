const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const PLUGIN_DEFAULT_PATH = path.join(__dirname, '..', 'config.default.json');

function userConfigPath() {
    if (process.platform === 'win32') {
        const base = process.env.APPDATA || path.join(process.env.USERPROFILE || os.homedir(), '.config');
        return path.join(base, 'stop-bell', 'config.json');
    }
    const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(base, 'stop-bell', 'config.json');
}

function readPluginDefault() {
    try {
        return JSON.parse(fs.readFileSync(PLUGIN_DEFAULT_PATH, 'utf8'));
    } catch (err) {
        process.stderr.write(`stop-bell: plugin default unreadable (${err.message}), using fallback\n`);
        return { off: false, skipIfActive: true, bellSound: 'default' };
    }
}

function readUserConfig() {
    const p = userConfigPath();
    if (!fs.existsSync(p)) return {};
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
        process.stderr.write(`stop-bell: user config malformed (${err.message}), ignoring\n`);
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
