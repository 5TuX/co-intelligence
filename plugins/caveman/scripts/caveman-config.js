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
