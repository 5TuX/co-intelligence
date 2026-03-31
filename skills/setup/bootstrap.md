# Bootstrap: First-Time Setup

How to go from a bare machine to a fully working co-intelligence setup.

After completing these steps, use `/setup` (apply mode) to verify everything and `/setup edit` to evolve the setup over time.

---

## Basic Setup

These steps are all most users need.

### Step 1 - Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### Step 2 - Install the plugin

```bash
claude plugin marketplace add 5TuX/co-intelligence
claude plugin install co-intelligence@co-intelligence
```

### Step 3 - Create local config

```bash
cp ${CLAUDE_PLUGIN_ROOT}/templates/config.local.yaml.example ${CLAUDE_PLUGIN_DATA}/config.local.yaml
```

Edit `config.local.yaml` with your user handle and data directory path.

### Step 4 - Configure MCP servers (optional)

Some skills work better with MCP servers for web search and documentation lookup. Add any you like with `claude mcp add -s user`. Use `/setup edit add mcp <name>` to register them in the setup reference.

### Step 5 - Verify

Start a new Claude Code session and run:
```
/co-intelligence:setup
```

This checks your setup and reports any issues.

---

## Advanced: Multi-Machine Sync

If you use Claude Code on multiple machines, you can sync settings via cloud storage (Google Drive, Dropbox, etc.) by symlinking config files from a shared directory into `~/.claude/`. This is entirely optional.

See the "Advanced: Multi-Machine Sync" section in `architecture.md` for the generic pattern.

---

## Troubleshooting

- **Skills not showing in autocomplete:** Restart Claude Code after plugin install, or run `/reload-plugins`.
- **`python3` not found (Windows):** Windows uses `python`, not `python3`. The setup skill handles this automatically.
- **Plugin not updating:** Run `/co-intelligence:update` to pull latest from GitHub and reinstall.
