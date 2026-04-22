const { spawn: nodeSpawn } = require('node:child_process');

function resolveCommand(platform, absPath) {
    if (platform === 'win32') {
        const escaped = absPath.replace(/\\/g, '\\\\').replace(/'/g, "''");
        const ps = `Add-Type -AssemblyName presentationCore; $mp = [System.Windows.Media.MediaPlayer]::new(); $mp.Open([Uri]::new('${escaped}')); $mp.Play(); Start-Sleep 3`;
        return { exe: 'powershell', args: ['-NoProfile', '-Command', ps] };
    }
    if (platform === 'darwin') {
        return { exe: 'afplay', args: [absPath] };
    }
    if (platform === 'linux') {
        return { exe: 'paplay', args: [absPath] };
    }
    throw new Error(`unsupported platform: ${platform}`);
}

function defaultSpawn(exe, args, opts) {
    return nodeSpawn(exe, args, opts);
}

function play(absPath, opts = {}) {
    const platform = opts.platform ?? process.platform;
    const spawn = opts.spawn ?? defaultSpawn;
    let cmd;
    try {
        cmd = resolveCommand(platform, absPath);
    } catch (err) {
        process.stderr.write(`sound-notification: ${err.message}\n`);
        return;
    }
    try {
        const child = spawn(cmd.exe, cmd.args, { detached: true, stdio: 'ignore' });
        if (child && typeof child.unref === 'function') child.unref();
    } catch (err) {
        process.stderr.write(`sound-notification: spawn failed (${err.message})\n`);
    }
}

module.exports = { play, resolveCommand };
