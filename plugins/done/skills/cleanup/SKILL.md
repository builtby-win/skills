---
name: cleanup
description: Clean up after a PR is merged - delete branches and confirm issue closure
---

# Done - Post-Merge Cleanup

Clean up local and remote branches after a PR is merged.

## When to Use

- After a PR is merged
- Claude should run this AUTOMATICALLY when detecting a merged PR
- Can also be invoked manually with `/done`

## Workflow

### Step 1: Detect Current Branch

```bash
git branch --show-current
```

If on an issue branch (pattern: `{PROJECT_PREFIX}/issue-{N}-*`), proceed with cleanup.

**Note**: `PROJECT_PREFIX` should be configured in your project's `CLAUDE.md`. Examples: `myproject`, `builtby-win-web`, etc.

### Step 2: Check PR Status

```bash
gh pr view --json state,mergedAt
```

Verify the PR was merged. If not merged, warn user.

### Step 3: Delete Worktree (If Present)

Check if a worktree exists for this issue and delete it:

```bash
# Extract issue number from branch name
ISSUE_NUM=$(git branch --show-current | grep -oP 'issue-\K[0-9]+')

# Try to delete worktree using the global CLI
# This will fail gracefully if no worktree exists
npx @anthropic/worktree delete ${ISSUE_NUM} 2>/dev/null && WORKTREE_DELETED=1
```

Alternatively with globally installed CLI:
```bash
worktree delete ${ISSUE_NUM} 2>/dev/null && WORKTREE_DELETED=1
```

If worktree was deleted, it will:
- Stop the dev server if running
- Remove `.worktrees/issue-{N}-{slug}/` directory
- Free up the assigned port
- Update `.worktree-metadata.json`

### Step 4: Switch to Main

```bash
git checkout main
git pull origin main
```

### Step 5: Delete Local Branch

```bash
git branch -d {PROJECT_PREFIX}/issue-{N}-{slug}
```

Use `-D` (force) if needed, but prefer `-d` to catch unmerged commits.

### Step 6: Delete Remote Branch

```bash
git push origin --delete {PROJECT_PREFIX}/issue-{N}-{slug}
```

### Step 7: Verify Issue Closed

```bash
gh issue view {N} --json state
```

The issue should be closed automatically by the `Closes #N` in the PR body.

### Step 8: Announce

Output:
```
PR #{PR_NUM} merged!

Cleanup complete:
- Switched to main
- Deleted local branch: {PROJECT_PREFIX}/issue-{N}-{slug}
- Deleted remote branch
- Issue #{N} is now closed

Ready for next task. Run /work to see what's available.
```

If worktree was deleted, also include:
```
- Deleted worktree: .worktrees/issue-{N}-{slug}
  - Stopped dev server (port {PORT} now available)
  - Removed {N} database snapshot(s)
```

## Auto-Detection

Claude should detect when a PR is merged by:
1. User mentions PR was merged
2. Checking PR state: `gh pr view --json state`
3. Detecting we're on a stale issue branch

When detected, automatically run cleanup.

## Edge Cases

- **PR not merged yet**: "PR #{PR_NUM} is still open. Merge it first, then run /done"
- **Already on main**: "Already on main. No cleanup needed."
- **Branch already deleted**: "Branch already cleaned up."

## Configuration

In your project's `CLAUDE.md`, set:

```markdown
## GitHub Workflow Configuration
PROJECT_PREFIX=your-project-name
```

Example configurations:
- `PROJECT_PREFIX=areyougo.ing` (for areyougo.ing project)
- `PROJECT_PREFIX=builtby-win-web` (for builtby.win/web)
- `PROJECT_PREFIX=myapp` (for any custom project)
