#!/usr/bin/env bash
# Builds two git repos in $1:
#   $1/upstream/      — fake upstream with 3 commits
#   $1/plugin-root/   — fake repo containing plugins/fake-plugin/ pinned to c1
#
# Designed to be re-runnable: wipes $1 first.

set -euo pipefail

base="${1:?usage: init.sh <target-dir>}"
rm -rf "$base"
mkdir -p "$base"

# ─── fake upstream ────────────────────────────────────────────────
up="$base/upstream"
mkdir -p "$up"
cd "$up"
git init -q -b main
git config user.email test@example.com
git config user.name test

mkdir -p skills/foo
cat > skills/foo/SKILL.md <<'EOF'
initial foo skill content
EOF
cat > install.sh <<'EOF'
#!/usr/bin/env bash
echo install
EOF
cat > README.md <<'EOF'
upstream readme
EOF
mkdir -p docs
cat > docs/guide.md <<'EOF'
original guide
EOF
git add -A
git commit -q -m "c1: initial"
c1=$(git rev-parse HEAD)
echo "$c1" > "$base/c1.sha"

cat > skills/foo/SKILL.md <<'EOF'
updated foo skill content
with a second line
EOF
mkdir -p skills/bar
cat > skills/bar/SKILL.md <<'EOF'
new bar skill
EOF
git add -A
git commit -q -m "c2: update foo, add bar"
echo "$(git rev-parse HEAD)" > "$base/c2.sha"

cat > docs/guide.md <<'EOF'
updated guide
EOF
git add -A
git commit -q -m "c3: update guide"
echo "$(git rev-parse HEAD)" > "$base/c3.sha"

# ─── fake plugin root ─────────────────────────────────────────────
root="$base/plugin-root"
mkdir -p "$root/plugins/fake-plugin/skills/foo"
mkdir -p "$root/plugins/fake-plugin/scripts"
cd "$root"
git init -q -b main
git config user.email test@example.com
git config user.name test

cat > plugins/fake-plugin/skills/foo/SKILL.md <<'EOF'
initial foo skill content
EOF
cat > plugins/fake-plugin/scripts/our-custom.js <<'EOF'
// ours-only, not in upstream
EOF
cat > plugins/fake-plugin/README.md <<'EOF'
# fake-plugin

## What's different from upstream

test fixture
EOF

# Lock file pinned at c1 by default; tests may overwrite.
cat > plugins/fake-plugin/upstream.lock.json <<EOF
{
  "repo": "$up",
  "pinned_sha": "$c1",
  "pinned_tag": "c1",
  "last_synced_date": "2026-01-01",
  "ignore_globs": ["install.sh", "README.md"]
}
EOF

git add -A
git commit -q -m "initial fake plugin"
