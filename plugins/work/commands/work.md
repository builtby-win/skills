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
/work           # Current project dashboard (GitHub Issues)
/work mine      # Only your issues
/work prs       # Only open PRs
/work next      # Next suggested task
/work global    # All beads tasks across all projects
/work global <project>  # Global view filtered to one project
```

The command will display:
- Active issues with `status:in-progress` label
- Open PRs and their review status
- Backlog items ready to start
- Suggested next task based on priority/age

## Global Variant

Use `/work global` to see tasks from ALL beads repositories on your system:

```bash
/work global           # All projects
/work global homebase  # Filter to homebase project only
```

This scans your home directory for `.beads/` folders and aggregates tasks, showing:
- Projects with open task counts
- Ready tasks (unblocked, sorted by priority)
- Quick actions for task management
