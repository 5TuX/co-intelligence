# sound-notification

Audible chime on every Claude Code Stop event. Cross-platform. Optional skip-when-CC-window-is-frontmost so the bell only rings when you have stepped away.

- Marketplace version: `0.1.0`

## Install

```text
/plugin marketplace add 5TuX/co-intelligence
/plugin install sound-notification@co-intelligence
```

## Usage

Trigger the skill with any of:

- `/sound-notification on`
- `/sound-notification off`
- `/sound-notification skip-if-active on`
- `/sound-notification skip-if-active off`

Natural language also works: "turn bell off", "ring always", "skip bell when I'm watching", etc.

## Configuration

The plugin ships defaults in `config.default.json`. User overrides persist across plugin updates at:

- **Linux / macOS:** `$XDG_CONFIG_HOME/sound-notification/config.json` (falls back to `~/.config/sound-notification/config.json`)
- **Windows:** `%APPDATA%\sound-notification\config.json` (falls back to `%USERPROFILE%\.config\sound-notification\config.json`)

Keys:

| Key            | Values                  | Default    | Effect                                                                             |
|----------------|-------------------------|------------|------------------------------------------------------------------------------------|
| `off`          | `true`, `false`         | `false`    | When `true`, the Stop hook is silent.                                              |
| `skipIfActive` | `true`, `false`         | `true`     | When `true`, the bell is suppressed if the CC terminal is the foreground window.   |
| `bellSound`    | `default`               | `default`  | Which bundled chime to play. Only `default` is shipped in v0.1.0.                  |

Ask the agent to change persistent settings in natural language or via `/sound-notification ...`. The skill calls `scripts/set-config.js` to write the user config.

## How the foreground-window skip works

On each Stop event, if `skipIfActive` is `true`, the hook:

1. Looks up the PID of the process owning the currently-focused OS window:
   - **Windows:** inline powershell P/Invoke to `user32!GetForegroundWindow` + `GetWindowThreadProcessId`.
   - **macOS:** `osascript` querying `System Events`.
   - **Linux (X11):** `xprop -root _NET_ACTIVE_WINDOW` → window id → `_NET_WM_PID`.
   - **Linux (Wayland):** unsupported in v0.1.0; the probe throws and the hook falls open (rings).
   - **WSL:** unsupported in v0.1.0; the probe throws and the hook falls open.
2. Walks the hook's own PID ancestors (`ps -o ppid=` on POSIX, `Get-CimInstance Win32_Process` on Windows).
3. If the foreground PID is one of those ancestors, the Stop hook is considered "in front" and the bell is suppressed. Otherwise, it rings.

If any step errors, the hook rings anyway — better to bell when you're already watching than miss a bell when you're away.

## Sound playback

- **Windows:** `powershell` `System.Windows.Media.MediaPlayer`.
- **macOS:** `afplay`.
- **Linux:** `paplay` (from pulseaudio-utils, standard on most desktops).

The sound is spawned in a detached subprocess and the hook exits immediately — it never blocks session termination.

## Attribution

Bundled chime is Pixabay upload ID 487898 by uploader `universfield`, titled *"film-special-effects-clear-bell-chime"*. The Pixabay Content License permits commercial and noncommercial use, modification, and redistribution; attribution is appreciated. The shipped file `assets/bell.ogg` is a lossless OGG/Vorbis conversion of the original MP3.

## License

MIT — plugin code. Bell asset: Pixabay Content License.
