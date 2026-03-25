#!/usr/bin/env bash
set -euo pipefail

# Install career Python package into PLUGIN_DATA venv (if not already installed).
# Runs at SessionStart so career-* CLI tools are available when skills are invoked.

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:-}"

# Not running in plugin context — skip silently
if [ -z "$PLUGIN_ROOT" ] || [ -z "$PLUGIN_DATA" ]; then
  exit 0
fi

CAREER_DIR="$PLUGIN_ROOT/skills/career"
VENV_DIR="$PLUGIN_DATA/career-venv"

# Need Python and uv
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null || true)
if [ -z "$PY" ] || ! command -v uv &>/dev/null; then
  exit 0
fi

# Only reinstall if pyproject.toml changed (hash-based skip)
MARKER="$VENV_DIR/.installed-hash"
CURRENT_HASH=$(sha256sum "$CAREER_DIR/pyproject.toml" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
INSTALLED_HASH=$(cat "$MARKER" 2>/dev/null || echo "none")

if [ "$CURRENT_HASH" != "$INSTALLED_HASH" ]; then
  mkdir -p "$PLUGIN_DATA"
  uv venv "$VENV_DIR" --python "$PY" 2>/dev/null || true
  uv pip install --python "$VENV_DIR/bin/python" -e "$CAREER_DIR" 2>/dev/null || \
    uv pip install --python "$VENV_DIR/Scripts/python" -e "$CAREER_DIR" 2>/dev/null || true
  echo "$CURRENT_HASH" > "$MARKER"
fi
