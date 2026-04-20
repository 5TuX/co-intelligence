const config = require('./caveman-config.js');

const cfg = config.read();
if (cfg.off) process.exit(0);
process.stdout.write(`caveman active at ${cfg.defaultLevel} level.\n`);
