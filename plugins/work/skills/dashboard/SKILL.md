---
name: dashboard
description: Show GitHub Issues dashboard - what everyone is working on, open PRs, and backlog
---

# Work Dashboard

Show the current state of GitHub Issues and PRs for the project.

## Instructions

Run these commands and format the output as a dashboard:

```bash
# Active worktrees (if project uses them)
# Example: pnpm worktree list
# Or: git worktree list
# Skip if project doesn't use worktrees

# Issues assigned to team members
gh issue list --assignee {username} --state open --json number,title,labels,createdAt

# Open PRs
gh pr list --state open --json number,title,author,labels,reviewDecision,headRefName

# Backlog (unassigned issues)
gh issue list --state open --json number,title,labels,createdAt | jq '[.[] | select(.assignees == [] or .assignees == null)]'
```

**Note**: Adjust assignee names based on your team. Get team members from your project's `CLAUDE.md` or GitHub settings.

## Output Format

Present the dashboard like this:

```
## Active Worktrees (if applicable)
- Issue #5 (dark-mode) → port 4322 → http://localhost:4322
  Server: running (PID 12345)

- Issue #10 (mobile-nav) → port 4323 → http://localhost:4323
  Server: not running

## Your Work ({current-user})
- #5 Add dark mode [status:in-progress]
  Branch: {PROJECT_PREFIX}/issue-5-dark-mode
  {Worktree info if applicable}

## Team Member Work
- #{N} {Title} [status:in-progress]
  Branch: {PROJECT_PREFIX}/issue-{N}-{slug}
  {Worktree/PR info}

## Open PRs
- PR #{PR_NUM}: {Title} ({author}) - {Review status}
- PR #{PR_NUM}: {Title} ({author}) - Approved

## Backlog (unassigned)
- #{N} {Title}
- #{N} {Title}

Suggestion: Work on #{N} (oldest unassigned issue)
```

## Details

- Show status labels in brackets: `[status:in-progress]`, `[status:pr-ready]`
- For issues with PRs, show the PR number and review status
- For PRs, show: number, title, author, review decision (Approved/Changes requested/Review required)
- Detect current branch and highlight if it matches an issue
- Suggest the oldest unassigned issue for next work
- Skip worktree section if project doesn't use them

## Variants

- `/work mine` - Only show issues assigned to current user
- `/work prs` - Only show open PRs
- `/work next` - Just show the suggested next issue to work on

## Configuration

In your project's `CLAUDE.md`, set:

```markdown
## GitHub Workflow Configuration
PROJECT_PREFIX=your-project-name

## Team Members
- @username1
- @username2
```

Example configurations:
- `PROJECT_PREFIX=myapp`
- Team members list helps the skill know who to query for work status
