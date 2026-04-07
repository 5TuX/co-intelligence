#!/usr/bin/env bash
# Scoped autoresearch stop hook - only blocks the session that owns the loop.
# Reads session's transcript_path from stdin JSON and matches against .loop-active.
INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty')

for f in ~/.claude/plugins/data/*/autoresearch/*/.loop-active; do
  [ -f "$f" ] || continue
  STORED=$(grep -oP 'transcript=\K\S+' "$f" 2>/dev/null || true)
  if [ -n "$STORED" ] && [ "$STORED" = "$TRANSCRIPT" ]; then
    DIR=$(dirname "$f")
    echo "AUTORESEARCH LOOP ACTIVE in $DIR. Read $DIR/.autoresearch-directives. NEVER stop. Write the next approach NOW." >&2
    exit 2
  fi
done
exit 0
