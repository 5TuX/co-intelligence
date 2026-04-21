const config = require('../scripts/caveman-config.js');

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
