---
description: Show GitHub Issues dashboard - what everyone is working on, open PRs, and backlog
---

# Work

Display the GitHub Issues dashboard showing current work status, open PRs, and available tasks.

## What it does

1. Shows active worktrees (if project uses them)
2. Lists in-progress issues by assignee
3. Shows open pull requests with review status
4. Displays backlog items (unassigned issues)
5. Suggests next work to pick up

## When to use

- When you want to see what's being worked on
- To find available tasks to pick up
- To check team status and blockers
- Before starting new work

## Usage

```bash
/work
```

The command will display:
- Active issues with `status:in-progress` label
- Open PRs and their review status
- Backlog items ready to start
- Suggested next task based on priority/age
