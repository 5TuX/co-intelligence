const config = require('../scripts/caveman-config.js');

// Drain the PostToolUse payload — we don't inspect it, we just use the event
// firing as a heartbeat to inject the caveman drift reminder into autonomous
// turns (where UserPromptSubmit never fires).
let stdin = '';
process.stdin.on('data', (chunk) => { stdin += chunk; });
process.stdin.on('end', () => {
    const cfg = config.read();
    if (cfg.off || !cfg.remindEveryTurn) {
        process.stdout.write('{}\n');
        return;
    }
    const payload = {
        hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: 'keep talk caveman'
        }
    };
    process.stdout.write(JSON.stringify(payload) + '\n');
});
