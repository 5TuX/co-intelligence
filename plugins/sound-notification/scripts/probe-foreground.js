const { execFileSync } = require('node:child_process');

function getAncestorsPosix(pid) {
    const ancestors = [];
    let cur = pid;
    for (let i = 0; i < 20 && cur && cur !== 1; i++) {
        try {
            const out = execFileSync('ps', ['-o', 'ppid=', '-p', String(cur)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
            const parent = parseInt(out.trim(), 10);
            if (!Number.isFinite(parent) || parent <= 0) break;
            ancestors.push(parent);
            cur = parent;
        } catch {
            break;
        }
    }
    return ancestors;
}

function getAncestorsWin32(pid) {
    const ancestors = [];
    let cur = pid;
    for (let i = 0; i < 20 && cur; i++) {
        try {
            const ps = `(Get-CimInstance Win32_Process -Filter "ProcessId=${cur}").ParentProcessId`;
            const out = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
            const parent = parseInt(out.trim(), 10);
            if (!Number.isFinite(parent) || parent <= 0) break;
            ancestors.push(parent);
            cur = parent;
        } catch {
            break;
        }
    }
    return ancestors;
}

function getAncestors(pid) {
    return process.platform === 'win32' ? getAncestorsWin32(pid) : getAncestorsPosix(pid);
}

function getForegroundPidFor(platform) {
    if (platform === 'win32') {
        const ps = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
}
"@
$h = [W32]::GetForegroundWindow()
$fgPid = 0
[W32]::GetWindowThreadProcessId($h, [ref]$fgPid) | Out-Null
Write-Output $fgPid
`;
        const out = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
        const pid = parseInt(out.trim(), 10);
        if (!Number.isFinite(pid) || pid <= 0) throw new Error('could not parse foreground PID on win32');
        return pid;
    }
    if (platform === 'darwin') {
        const out = execFileSync('osascript', ['-e', 'tell application "System Events" to unix id of first application process whose frontmost is true'], { encoding: 'utf8' });
        const pid = parseInt(out.trim(), 10);
        if (!Number.isFinite(pid) || pid <= 0) throw new Error('could not parse frontmost pid on darwin');
        return pid;
    }
    if (platform === 'linux') {
        if (process.env.WAYLAND_DISPLAY && !process.env.DISPLAY) {
            throw new Error('unsupported platform: wayland without X11 bridge');
        }
        const widRaw = execFileSync('xprop', ['-root', '_NET_ACTIVE_WINDOW'], { encoding: 'utf8' });
        const widMatch = widRaw.match(/0x[0-9a-fA-F]+/);
        if (!widMatch) throw new Error('could not parse active window id from xprop');
        const pidRaw = execFileSync('xprop', ['-id', widMatch[0], '_NET_WM_PID'], { encoding: 'utf8' });
        const pidMatch = pidRaw.match(/=\s*(\d+)/);
        if (!pidMatch) throw new Error('could not parse _NET_WM_PID from xprop');
        return parseInt(pidMatch[1], 10);
    }
    throw new Error(`unsupported platform: ${platform}`);
}

function isForeground(opts = {}) {
    const platform = opts.platform ?? process.platform;
    const getFgPid = opts.getForegroundPid ?? (() => getForegroundPidFor(platform));
    const getAnc = opts.getAncestors ?? getAncestors;
    const pid = opts.pid ?? process.ppid;
    const fg = getFgPid();
    const anc = getAnc(pid);
    return anc.includes(fg);
}

module.exports = { isForeground, getAncestors, getForegroundPidFor };
