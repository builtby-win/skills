---
description: Clean up after a PR is merged - delete branches and confirm issue closure
---

# Done

Clean up the workspace after merging a PR.

## What it does

1. Deletes the feature branch locally and remotely
2. Switches to main branch
3. Pulls latest changes
4. Confirms the associated issue is closed

## When to use

- After a PR is successfully merged
- When you need to clean up stale branches
- To prepare your workspace for the next task

## Usage

```bash
/done
```

The command will automatically:
- Detect the current branch
- Check if its associated PR was merged
- Clean up branches and worktrees (if configured)
- Verify the issue is closed
