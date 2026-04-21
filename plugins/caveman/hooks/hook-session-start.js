const path = require('node:path');
const config = require('../scripts/caveman-config.js');

// Persist absolute pluginRoot so the skill can locate set-config.js in any
// session without relying on CLAUDE_PLUGIN_ROOT (which leaks between plugins
// when the skill is invoked from the main agent rather than a plugin hook).
const pluginRoot = path.resolve(__dirname, '..');
try {
    config.write({ pluginRoot });
} catch (err) {
    process.stderr.write(`caveman: failed to persist pluginRoot (${err.message})\n`);
}

const cfg = config.read();
if (cfg.off) process.exit(0);
process.stdout.write(`caveman active at ${cfg.defaultLevel} level.\n`);
