---
description: Update the co-intelligence plugin to the latest version from GitHub
---

# Self-Update

Pull the latest version from GitHub and reinstall.

## Steps

1. Pull the marketplace cache:
```bash
cd ~/.claude/plugins/marketplaces/co-intelligence && git pull origin main
```

2. Read the new version:
```bash
grep '"version"' ~/.claude/plugins/marketplaces/co-intelligence/.claude-plugin/marketplace.json
```

3. Reinstall:
```bash
claude plugin install co-intelligence@co-intelligence
```

4. Tell the user to run `/reload-plugins` to pick up the changes in the current session.
