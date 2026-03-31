---
name: setup
description: Use when the user asks to verify, repair, provision, or change the Claude Code setup on the current machine. Also use when hook errors appear, when setting up a new machine, or when syncing setup between devices.
argument-hint: "[edit <what>]"
---

# Claude Code Setup

Two modes: `apply` (default) and `edit`.

## Usage

```
/setup              converge machine to match reference (check, fix, detect drift)
/setup edit <what>  change the reference, then apply
```

## Argument Parsing

- If first arg is `edit` -> load and follow `edit.md`
- Otherwise (no args, or anything else) -> load and follow `apply.md`

## Data Directory

At the start of every invocation:

1. Resolve `CLAUDE_PLUGIN_DATA` env var -> `$PLUGIN_DATA`
2. Create `$PLUGIN_DATA/setup/` if it doesn't exist
3. If `$PLUGIN_DATA/setup/architecture.md` doesn't exist, copy from `templates/architecture.md` in this skill's directory
4. Read `$PLUGIN_DATA/config.local.yaml` for `admin_user`, `data_dir`, and `drive_root`
   - If missing, error: "Missing config. Run: `cp ${CLAUDE_PLUGIN_ROOT}/templates/config.local.yaml.example ${CLAUDE_PLUGIN_DATA}/config.local.yaml` and edit it."

All references to `architecture.md` and `config.local.yaml` below mean the copies in `$PLUGIN_DATA/`.

## Mode: apply (default)

Load and follow `apply.md` in this skill's directory.

**Summary:** Reads `architecture.md` expected state, checks each item against the machine (parallel independent bash calls), reports PASS/FAIL, offers to fix failures, then detects drift (machine items not in reference) and offers accept/accept-all/skip per item.

## Mode: edit

Load and follow `edit.md` in this skill's directory.

**Summary:** Parses user intent (add/remove/update + target), updates `architecture.md` to reflect the desired state, then runs apply to converge the machine.

## First-Time Setup

For setting up a brand new machine from scratch, see `bootstrap.md` in this skill's directory.

## Shared Rules

- **Platform detection:** Always detect OS at start (`uname -s`). Use Windows-appropriate commands (PowerShell, mklink, cygpath) or Linux commands accordingly.
- **Independent checks:** Each verification check must be a separate Bash call. Never chain checks - one failure must not cancel others.
- **No secrets in reference files:** Never write API keys into `architecture.md` or any file in the skill directory. Use `YOUR_KEY` placeholders. Real keys live in `~/.claude.json` (local, never synced).
- **Confirm before changes:** Always ask before modifying machine state. Print fix commands with `!` prefix so users can paste directly.
- **Data separation:** Skill directories contain code only. User/personal data lives in `$PLUGIN_DATA/` (via `CLAUDE_PLUGIN_DATA` env var) or in `config.local.yaml`.
- **Python path handling (Windows):** In Git Bash, `$HOME` expands to MSYS paths (`/c/Users/...`) that Python cannot read. Always use `cygpath -w` to convert before passing to Python, or pass via `sys.argv`.
