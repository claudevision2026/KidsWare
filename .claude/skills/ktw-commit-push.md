---
name: ktw-commit-push
description: Commit all pending changes and push to DEV branch in KTW repository
---

# KTW Commit & Push to DEV

Commits all staged and unstaged changes to the DEV branch, then pushes to origin.

## Steps

1. **Check git status** — show all pending changes (staged and unstaged)
2. **Review changes** — display a summary of what will be committed
3. **Create commit** — stage all changes and commit with a descriptive message
4. **Push to DEV** — push the commit to `origin/DEV`

## Usage

```
/ktw-commit-push
```

Run from any directory in the D:\KPTW\KTW repository. The skill will:
- Show you all pending changes
- Ask you to confirm the commit message
- Stage, commit, and push automatically

## Notes

- Only commits to the **DEV** branch (current default)
- Pushes to `origin/DEV` — requires remote named `origin`
- If there are no changes, the skill exits safely without creating an empty commit
