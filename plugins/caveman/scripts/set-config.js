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
