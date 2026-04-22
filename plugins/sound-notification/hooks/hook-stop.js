const path = require('node:path');

function resolveSoundDefault(bellSound, platform = process.platform) {
    const ext = platform === 'linux' ? 'ogg' : 'wav';
    const assets = { default: path.join(__dirname, '..', 'assets', `bell.${ext}`) };
    return assets[bellSound] ?? assets.default;
}

function run({ readConfig, probe, play, resolveSound }) {
    const cfg = readConfig();
    if (cfg.off) return;
    if (cfg.skipIfActive) {
        try {
            if (probe()) return;
        } catch {
            // fail-open → play
        }
    }
    play(resolveSound(cfg.bellSound));
}

if (require.main === module) {
    const config = require('../scripts/bell-config.js');
    const probe = require('../scripts/probe-foreground.js');
    const player = require('../scripts/play-sound.js');
    run({
        readConfig: () => config.read(),
        probe: () => probe.isForeground(),
        play: (p) => player.play(p),
        resolveSound: resolveSoundDefault,
    });
}

module.exports = { run, resolveSoundDefault };
