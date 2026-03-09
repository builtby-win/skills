---
name: todo
description: Add tasks to beads repositories with smart project inference
license: See LICENSE.txt
---


# Add Task to Beads

Add a new task to a beads repository with smart project inference.

## When to Use

- User says `/todo <task description>`
- User wants to quickly capture a task
- User mentions adding something to their todo list

## Workflow

### Step 1: Parse Command Arguments

Extract from the user's input:
- Task title (required) - everything not a flag
- Priority (`-p` or `--priority`, default: 2)
- Project (`--project`, optional)
- Tags (`--tag`, optional, can be multiple)

Example parsing:
```
/todo -p 1 Fix critical login bug --tag security --tag urgent
  -> title: "Fix critical login bug"
  -> priority: 1
  -> tags: ["security", "urgent"]

/todo --project homebase Add dark mode
  -> title: "Add dark mode"
  -> project: "homebase"
  -> priority: 2 (default)
```

### Step 2: Determine Target Repository

Use smart inference to find the right beads repo:

```python
import os
import subprocess
import json
from pathlib import Path

def find_beads_in_cwd():
    """Check if current directory has .beads"""
    cwd = Path.cwd()
    beads_dir = cwd / '.beads'
    if beads_dir.exists():
        return beads_dir
    return None

def find_beads_in_git_root():
    """Check if git root has .beads"""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--show-toplevel'],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            git_root = Path(result.stdout.strip())
            beads_dir = git_root / '.beads'
            if beads_dir.exists():
                return beads_dir
    except:
        pass
    return None

def find_all_beads_repos():
    """Find all .beads directories for project selection."""
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

def match_project_by_name(name, repos):
    """Match explicit project name to a beads repo."""
    # Exact match first
    for repo in repos:
        project_name = repo.parent.name
        if project_name.lower() == name.lower():
            return repo

    # Fuzzy match (contains)
    for repo in repos:
        project_name = repo.parent.name
        if name.lower() in project_name.lower():
            return repo

    return None

def infer_target_repo(explicit_project=None):
    """
    Smart inference logic:
    1. If explicit project given, find it
    2. If cwd has .beads, use it
    3. If cwd is in git repo with .beads, use it
    4. If ambiguous, return list for user selection
    """
    all_repos = find_all_beads_repos()

    if not all_repos:
        return None, "NO_REPOS"

    # Explicit project specified
    if explicit_project:
        repo = match_project_by_name(explicit_project, all_repos)
        if repo:
            return repo, None
        return all_repos, f"NO_MATCH:{explicit_project}"

    # Check current directory
    local_repo = find_beads_in_cwd()
    if local_repo:
        return local_repo, None

    # Check git root
    git_repo = find_beads_in_git_root()
    if git_repo:
        return git_repo, None

    # Ambiguous - need user selection
    if len(all_repos) == 1:
        return all_repos[0], None

    return all_repos, "AMBIGUOUS"
```

### Step 3: Handle Selection Scenarios

**If `NO_REPOS`:**
```
No beads repositories found on this system.

To initialize beads in a project:
  cd /path/to/project
  bd init

Or manually:
  mkdir -p .beads && touch .beads/issues.jsonl
```

**If `NO_MATCH:<project>`:**
```
No beads repository found matching "{project}".

Available projects:
1. homebase (~/homebase)
2. skills (~/builtby.win/skills)

Use: /todo --project homebase <task>
```

**If `AMBIGUOUS`:**
```
Multiple beads repositories found. Where should this task go?

1. homebase (~/homebase)
2. skills (~/builtby.win/skills)
3. myapp (~/code/myapp)

Enter number or project name:
```

Then wait for user input before proceeding.

### Step 4: Generate Task ID

```python
import random
import string

def get_project_prefix(beads_dir):
    """Get prefix from existing tasks or derive from project name."""
    issues_file = beads_dir / 'issues.jsonl'

    if issues_file.exists():
        with open(issues_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        task = json.loads(line)
                        task_id = task.get('id', '')
                        if '-' in task_id:
                            # Extract prefix from existing ID pattern
                            return task_id.rsplit('-', 1)[0]
                    except json.JSONDecodeError:
                        continue

    # Derive from project name
    project_name = beads_dir.parent.name
    return project_name.lower().replace(' ', '-').replace('_', '-')

def generate_task_id(beads_dir):
    """Generate a unique task ID."""
    prefix = get_project_prefix(beads_dir)
    chars = string.ascii_lowercase + string.digits
    suffix = ''.join(random.choices(chars, k=3))
    return f"{prefix}-{suffix}"
```

### Step 5: Create Task Object

```python
from datetime import datetime, timezone

def create_task(task_id, title, priority=2, tags=None, description=None):
    """Create a task object compatible with beads format."""
    now = datetime.now(timezone.utc).astimezone().isoformat()
    user = os.environ.get('USER', 'unknown')

    task = {
        "id": task_id,
        "title": title,
        "status": "open",
        "priority": priority,
        "issue_type": "task",
        "created_at": now,
        "created_by": user,
        "updated_at": now
    }

    if description:
        task["description"] = description

    if tags:
        task["tags"] = tags

    return task
```

### Step 6: Append to issues.jsonl

```python
def append_task(beads_dir, task):
    """Append task to issues.jsonl file."""
    issues_file = beads_dir / 'issues.jsonl'

    # Create file if it doesn't exist
    if not issues_file.exists():
        issues_file.touch()

    with open(issues_file, 'a') as f:
        f.write(json.dumps(task) + '\n')

    return True
```

### Step 7: Sync with bd (Optional)

```bash
# If bd is available, sync the changes
if command -v bd >/dev/null 2>&1; then
  cd "{project_path}"
  bd sync 2>/dev/null || true
fi
```

### Step 8: Confirm Creation

Display confirmation:

```
Task created!

ID: homebase-7xy
Title: Add dark mode toggle
Priority: 2 (medium)
Project: homebase (~/homebase)

Check the target repo's Beads task list to see the new entry.
```

If tags were added:
```
Task created!

ID: webapp-2cd
Title: Fix mobile layout
Priority: 2 (medium)
Tags: frontend, urgent
Project: webapp (~/code/webapp)
```

## Complete Example Flow

**User input:**
```
/todo -p 1 --tag security Fix XSS vulnerability in login form
```

**Claude execution:**
1. Parse: title="Fix XSS vulnerability in login form", priority=1, tags=["security"]
2. Check cwd for `.beads/` - not found
3. Check git root for `.beads/` - found at `~/webapp/.beads/`
4. Generate ID: `webapp-8ab`
5. Create task object with all fields
6. Append to `~/webapp/.beads/issues.jsonl`
7. Run `bd sync` if available
8. Display confirmation

**Output:**
```
Task created!

ID: webapp-8ab
Title: Fix XSS vulnerability in login form
Priority: 1 (high)
Tags: security
Project: webapp (~/webapp)
```

## Edge Cases

### Empty issues.jsonl
Create the task anyway - the file will be created or appended to.

### Duplicate Task ID (very rare)
The 3-character random suffix makes collisions extremely unlikely. If it happens, the task is still valid - beads uses the ID as a reference, not a unique key.

### No Permission to Write
```
Error: Cannot write to ~/protected/.beads/issues.jsonl
Check file permissions and try again.
```

### Invalid Priority
If priority is not 1, 2, or 3, default to 2:
```python
priority = max(1, min(3, int(priority_arg))) if priority_arg else 2
```

## Configuration

Optional settings in project's `CLAUDE.md`:
```markdown
## Beads Configuration
DEFAULT_BEADS_PRIORITY=2
BEADS_PROJECT_PREFIX=myapp
```

The prefix from CLAUDE.md takes precedence over auto-detection.
