# Update-User (`/job-search update-user <handle>`)

1. Read existing `users/<handle>/profile.yaml`
2. Display current profile summary: name, location priority, top skills (strong/learning/gaps), ethical preferences (exclude/prioritize), search notes, sources count
3. Ask: "What would you like to update?" — accept free-form description or specific field names
4. For each change: show current value → ask for new value → update profile.yaml
5. Optionally: "Add/remove custom sources?" → edit `users/<handle>/sources.yaml`
6. Optionally: "Update career files (CV, Direction)?" → open for editing
7. Show diff summary and confirm changes
