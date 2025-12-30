# GitHub Workflow Skills - Usage Guide

This document explains how to use the GitHub workflow skills in your project.

## Quick Start

### 1. Install the Skills

```bash
/plugin marketplace add github.com/builtby-win/skills
/plugin install done pr ship work@github-workflow-skills
```

### 2. Configure Your Project

Add to your project's `CLAUDE.md`:

```markdown
## GitHub Workflow Configuration
PROJECT_PREFIX=your-project-name
REPO_OWNER=your-github-username
REPO_NAME=your-repo-name

## Team Members
- @username1
- @username2
```

### 3. Set Up GitHub Labels

Create status labels in your repository:

```bash
gh label create "status:in-progress" --color "0E8A16"
gh label create "status:pr-ready" --color "FBCA04"
gh label create "status:in-review" --color "D93F0B"
```

## Workflow

### Standard Development Cycle

```
┌─────────┐
│  /work  │  View dashboard, pick task
└────┬────┘
     │
     ▼
┌─────────┐
│  Plan   │  Enter plan mode, design solution
└────┬────┘
     │
     ▼
┌─────────┐
│  /ship  │  Create issue + branch
└────┬────┘
     │
     ▼
┌─────────┐
│  Code   │  Implement, test, commit
└────┬────┘
     │
     ▼
┌─────────┐
│   /pr   │  Create pull request
└────┬────┘
     │
     ▼
┌─────────┐
│ Review  │  Code review, approval
└────┬────┘
     │
     ▼
┌─────────┐
│  Merge  │  Merge to main
└────┬────┘
     │
     ▼
┌─────────┐
│  /done  │  Clean up branches
└─────────┘
```

## Branch Naming Convention

All feature branches follow this pattern:
```
{PROJECT_PREFIX}/issue-{number}-{brief-slug}
```

Examples:
- `myapp/issue-42-fix-login`
- `builtby-win/issue-15-dark-mode`
- `api/issue-8-rate-limiting`

## GitHub Issue Labels

### Status Labels

- **`status:in-progress`** - Issue is actively being worked on
  - Applied by: `/ship`
  - Removed by: `/pr`

- **`status:pr-ready`** - Pull request created, awaiting review
  - Applied by: `/pr`
  - Removed by: Merging the PR

- **`status:in-review`** - Under active code review
  - Applied manually by reviewers

### Type Labels (Recommended)

- `type:feature` - New feature
- `type:bug` - Bug fix
- `type:docs` - Documentation
- `type:refactor` - Code refactoring
- `migration` - Database migration (if applicable)

## Commands Reference

### `/work` - Dashboard

**Usage:** `/work [variant]`

**Variants:**
- `/work` - Full dashboard
- `/work mine` - Only your issues
- `/work prs` - Only PRs
- `/work next` - Next suggested task

**Output:**
- Active worktrees (if configured)
- In-progress issues by assignee
- Open pull requests
- Backlog items
- Next suggested work

### `/ship` - Create Issue & Branch

**Usage:** `/ship`

**Prerequisites:**
- Plan mode complete (or manual plan)

**Actions:**
1. Creates GitHub Issue with plan
2. Creates branch: `{PROJECT_PREFIX}/issue-{N}-{slug}`
3. Adds `status:in-progress` label
4. Creates worktree (if configured)

**Output:**
- Issue URL
- Branch name
- Worktree info (if applicable)

### `/pr` - Create Pull Request

**Usage:** `/pr`

**Prerequisites:**
- On a feature branch
- Commits pushed
- Typecheck passes (if configured)
- Lint passes (if configured)

**Actions:**
1. Runs pre-flight checks
2. Optionally captures screenshot
3. Creates PR with "Closes #N"
4. Updates label to `status:pr-ready`

**Output:**
- PR URL
- Issue reference
- Review status

### `/done` - Clean Up

**Usage:** `/done`

**Prerequisites:**
- PR is merged

**Actions:**
1. Deletes local branch
2. Deletes remote branch
3. Switches to main
4. Pulls latest changes
5. Deletes worktree (if configured)
6. Verifies issue closed

**Output:**
- Cleanup summary
- Port freed (if worktree)
- Next suggested work

## Project-Specific Customization

### Worktrees

If your project uses git worktrees, configure:

```markdown
## Worktree Configuration
WORKTREE_ROOT=.worktrees
START_PORT=4322
```

The skills will automatically:
- Create worktrees for new branches
- Start dev servers on unique ports
- Clean up on `/done`

### Screenshots

For projects with web UIs, enable screenshot capture:

```markdown
## Screenshot Configuration
SCREENSHOT_DIR=.github/pr-screenshots
SESSION_URL=https://yourapp.com/dev/session
```

The `/pr` skill will:
- Ask for session token
- Capture UI screenshot
- Include in PR description

### Custom Commands

Adjust commands in your `CLAUDE.md`:

```markdown
## Build Commands
TYPECHECK_CMD=npm run typecheck
LINT_CMD=npm run lint
CHECK_CMD=npm run check
DEV_CMD=npm run dev
```

## Best Practices

### 1. Always Use Plan Mode

Before `/ship`, enter plan mode to:
- Explore the codebase
- Design the solution
- Identify files to modify
- Consider edge cases

### 2. One Issue Per Branch

- Each branch should address one issue
- Keep changes focused
- Easier code review

### 3. Regular Commits

- Commit frequently as you work
- Use conventional commits (feat:, fix:, etc.)
- Push to remote regularly

### 4. Pre-flight Checks

Before creating a PR:
- Run tests locally
- Fix linting errors
- Verify build passes

### 5. Clean Up Promptly

After PR merge:
- Run `/done` immediately
- Don't accumulate stale branches

## Troubleshooting

### "Branch naming pattern not recognized"

Ensure `PROJECT_PREFIX` is set in your `CLAUDE.md`.

### "Pre-flight checks failed"

1. Run `npm run check` (or equivalent) to auto-fix
2. Fix remaining errors manually
3. Re-run `/pr`

### "Worktree not found"

If you don't use worktrees:
- Skip worktree steps
- The skills work without them

### "Screenshot capture failed"

Screenshot capture is optional:
- Requires Chrome DevTools MCP
- Requires session authentication
- Can skip this step

## Examples

### Example 1: Bug Fix

```bash
# View open issues
/work

# Plan the fix
# (Enter plan mode, investigate, design solution)

# Create issue and branch
/ship

# Fix the bug, test, commit
git commit -m "fix: resolve login redirect loop"

# Create PR
/pr

# After review and merge
/done
```

### Example 2: New Feature

```bash
# Plan the feature
# (Enter plan mode, design implementation)

# Create issue and branch
/ship

# Implement feature across multiple commits
git commit -m "feat: add user profile page"
git commit -m "feat: add profile edit form"
git commit -m "test: add profile page tests"

# Create PR
/pr

# After approval and merge
/done
```

## Integration with Other Tools

### GitHub Actions

Skills work alongside GitHub Actions:
- Pre-flight checks run locally
- CI runs on PR creation
- Merge requires both passing

### Code Review Tools

Skills integrate with review tools:
- PR includes issue context
- Labels track review status
- Auto-closes issues on merge

## Support

Questions or issues? Open an issue on the skills repository:
https://github.com/builtby-win/skills/issues
