const config = require("./bell-config.js");

const SCHEMA = {
    off:          { type: "bool" },
    skipIfActive: { type: "bool" },
    bellSound:    { type: "enum", values: ["default"] },
};

function usage() {
    process.stderr.write([
        "usage: node set-config.js <key>=<value> [<key>=<value> ...]",
        "keys: off=true|false, skipIfActive=true|false, bellSound=default",
    ].join("\n") + "\n");
}

function parseArg(arg) {
    const eq = arg.indexOf("=");
    if (eq < 0) {
        process.stderr.write(`stop-bell: '${arg}' must be key=value\n`);
        return null;
    }
    const key = arg.slice(0, eq);
    const raw = arg.slice(eq + 1);
    const schema = SCHEMA[key];
    if (!schema) {
        process.stderr.write(`stop-bell: unknown key '${key}'\n`);
        return null;
    }
    if (schema.type === "bool") {
        if (raw !== "true" && raw !== "false") {
            process.stderr.write(`stop-bell: '${key}' must be true or false (got '${raw}')\n`);
            return null;
        }
        return [key, raw === "true"];
    }
    if (schema.type === "enum") {
        if (!schema.values.includes(raw)) {
            process.stderr.write(`stop-bell: '${key}' must be one of ${schema.values.join("|")} (got '${raw}')\n`);
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
    process.stdout.write(`stop-bell: wrote ${JSON.stringify(partial)}\n`);
} catch (err) {
    process.stderr.write(`stop-bell: write failed: ${err.message}\n`);
    process.exit(1);
}
