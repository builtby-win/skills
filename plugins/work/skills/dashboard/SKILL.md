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
- `/work global` - Aggregate tasks from ALL beads repositories on the system
- `/work global <project>` - Global view filtered to a specific project

---

## Global Variant (`/work global`)

When invoked with `/work global`, aggregate tasks from ALL beads repositories across the system.

### Step 1: Find All Beads Repositories

```bash
# Use fd if available (faster), fallback to find
if command -v fd >/dev/null 2>&1; then
  fd -H -t d '^\.beads$' ~ 2>/dev/null
else
  find ~ -type d -name '.beads' 2>/dev/null
fi
```

### Step 2: Parse and Aggregate Tasks

For each `.beads` directory found, read `issues.jsonl`:

```python
import json
import os
import subprocess
from pathlib import Path
from datetime import datetime

def find_beads_repos():
    """Find all .beads directories from home."""
    home = os.path.expanduser('~')

    # Try fd first (faster)
    try:
        result = subprocess.run(
            ['fd', '-H', '-t', 'd', r'^\.beads$', home],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return [Path(p.strip()) for p in result.stdout.strip().split('\n') if p.strip()]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # Fallback to find
    try:
        result = subprocess.run(
            ['find', home, '-type', 'd', '-name', '.beads', '-not', '-path', '*/node_modules/*'],
            capture_output=True, text=True, timeout=60
        )
        if result.stdout.strip():
            return [Path(p.strip()) for p in result.stdout.strip().split('\n') if p.strip()]
    except subprocess.TimeoutExpired:
        pass

    return []

def get_project_name(beads_dir):
    """Extract project name from beads directory path."""
    return beads_dir.parent.name

def parse_issues(beads_dir):
    """Parse issues.jsonl and return list of task dicts."""
    issues_file = beads_dir / 'issues.jsonl'
    if not issues_file.exists():
        return []

    issues = []
    with open(issues_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    issues.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return issues

def is_task_ready(task, all_tasks_by_id):
    """Check if task is open and has no unresolved dependencies."""
    if task.get('status') != 'open':
        return False

    depends_on = task.get('depends_on', [])
    if not depends_on:
        return True

    for dep_id in depends_on:
        dep = all_tasks_by_id.get(dep_id)
        if dep and dep.get('status') == 'open':
            return False  # Dependency still open
    return True

def aggregate_global_tasks(filter_project=None):
    """Aggregate tasks from all beads repos."""
    beads_dirs = find_beads_repos()

    if not beads_dirs:
        return None, None, "No beads repositories found."

    projects = {}
    all_tasks = []

    for beads_dir in beads_dirs:
        project_name = get_project_name(beads_dir)

        # Skip if filtering and doesn't match
        if filter_project and filter_project.lower() != project_name.lower():
            continue

        issues = parse_issues(beads_dir)

        projects[project_name] = {
            'path': str(beads_dir.parent),
            'open_count': sum(1 for i in issues if i.get('status') == 'open'),
            'total_count': len(issues)
        }

        for issue in issues:
            issue['_project'] = project_name
            issue['_project_path'] = str(beads_dir.parent)
        all_tasks.extend(issues)

    # Build lookup for dependency resolution
    tasks_by_id = {t.get('id', ''): t for t in all_tasks if t.get('id')}

    # Find ready tasks
    ready_tasks = [t for t in all_tasks if is_task_ready(t, tasks_by_id)]

    # Sort by priority (1=high, 2=medium, 3=low), then by created_at
    ready_tasks.sort(key=lambda t: (t.get('priority', 2), t.get('created_at', '')))

    return projects, ready_tasks, None

# Run aggregation
filter_project = None  # Set from /work global <project> argument if provided
projects, ready_tasks, error = aggregate_global_tasks(filter_project)
```

### Step 3: Display Global Dashboard

Format the output as:

```
## Global Beads Dashboard

### Projects ({N} with open tasks)

| Project | Open | Total | Path |
|---------|------|-------|------|
| homebase | 3 | 8 | ~/homebase |
| skills | 1 | 2 | ~/builtby.win/skills |

### Ready Tasks (unblocked, sorted by priority)

[P1] homebase-5wb: Critical security patch
     Project: homebase | Created: 2026-01-08

[P2] skills-3xy: Add global beads view
     Project: skills | Created: 2026-01-07

[P3] homebase-2ab: Refactor config module
     Project: homebase | Created: 2026-01-05

---

Quick Actions:
- `/todo <task>` - Add task (auto-detects project)
- `/work global <project>` - Filter to specific project
```

### Edge Cases

**No beads repos found:**
```
No beads repositories found on this system.

To initialize beads in a project:
  cd /path/to/project
  bd init

Or manually:
  mkdir -p .beads && touch .beads/issues.jsonl
```

**Filter project not found:**
```
No beads repository found matching "projectname".

Available projects:
- homebase (~/homebase)
- skills (~/builtby.win/skills)
```

**Tasks with dependencies:**
Show blocked tasks separately if requested, but the default "Ready Tasks" section only shows unblocked tasks.

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
