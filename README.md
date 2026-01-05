# GitHub Workflow Skills

Claude Code plugin marketplace providing automated GitHub workflow skills for issue management, branch creation, pull requests, and team coordination.

## Features

### Core Workflow Skills

- **`/done`** - Clean up after PR merge (delete branches, verify issue closure)
- **`/pr`** - Create pull requests with pre-flight checks and optional screenshots
- **`/ship`** - Publish plans as GitHub issues and create feature branches
- **`/work`** - Display team dashboard (issues, PRs, backlog)

### Optional Plugins

- **`worktree`** - Git worktree management with SQLite database snapshots and port isolation for parallel development

## Installation

### Add the Marketplace

```bash
/plugin marketplace add builtby-win/skills
```

### Install Plugins

Install core workflow skills:

```bash
/plugin install done@builtby-win-skills
/plugin install pr@builtby-win-skills
/plugin install ship@builtby-win-skills
/plugin install work@builtby-win-skills
```

Optionally install the worktree plugin for parallel development:

```bash
/plugin install worktree@builtby-win-skills
```

## Configuration

After installation, configure your project by adding to `CLAUDE.md`:

```markdown
## GitHub Workflow Configuration
PROJECT_PREFIX=your-project-name

## Team Members
- @your-username
- @teammate1
- @teammate2
```

### Configuration Options

- **`PROJECT_PREFIX`** - Branch naming prefix (e.g., `myapp`, `builtby-win-web`)
  - Branches will be named: `{PROJECT_PREFIX}/issue-{N}-{slug}`
  - Example: `myapp/issue-42-fix-login`

- **Team Members** - List of GitHub usernames for dashboard queries

## Usage

### `/ship` - Start New Work

After planning a feature or fix:

```bash
/ship
```

This will:
1. Create a GitHub Issue with your plan
2. Create a feature branch: `{PROJECT_PREFIX}/issue-{N}-{slug}`
3. Mark the issue as `status:in-progress`
4. Prepare your workspace for implementation

### `/work` - View Dashboard

Check what's being worked on:

```bash
/work
```

Shows:
- In-progress issues by assignee
- Open pull requests with review status
- Backlog items (unassigned issues)
- Suggested next task

### `/pr` - Create Pull Request

When implementation is complete:

```bash
/pr
```

This will:
1. Run pre-flight checks (typecheck, lint)
2. Optionally capture a screenshot
3. Push commits to remote
4. Create PR with "Closes #N" reference
5. Update issue to `status:pr-ready`

### `/done` - Clean Up After Merge

After your PR is merged:

```bash
/done
```

This will:
1. Delete local and remote branches
2. Switch to main and pull latest
3. Verify the issue is closed
4. Clean up worktrees (if configured)

## Requirements

- **Claude Code** v1.0.33 or later
- **GitHub CLI** (`gh`) - [Installation guide](https://cli.github.com/)
- **Git** - For branch management

## Workflow Example

```bash
# 1. View what needs work
/work

# 2. Start on issue #42
# (Plan the implementation first)
/ship

# 3. Implement the feature
# (Write code, test, commit)

# 4. Create pull request
/pr

# 5. After PR is reviewed and merged
/done
```

## Labels

This workflow uses GitHub labels to track issue status:

- `status:in-progress` - Currently being worked on
- `status:pr-ready` - PR created, awaiting review
- `status:in-review` - Under code review

Create these labels in your repository:

```bash
gh label create "status:in-progress" --color "0E8A16" --description "Currently being worked on"
gh label create "status:pr-ready" --color "FBCA04" --description "PR created, awaiting review"
gh label create "status:in-review" --color "D93F0B" --description "Under code review"
```

## Advanced: Project-Specific Features

### Worktrees

For projects with SQLite databases or when you need parallel development, use the worktree plugin:

#### Quick Setup

```bash
# Install the plugin
/plugin install worktree@builtby-win-skills

# Set up your project (run once)
/setup-worktree
```

#### Features

- **Isolated Development**: Separate git worktrees for each issue/feature
- **Database Snapshots**: Automatically snapshot SQLite databases for each worktree
  - Supports Cloudflare D1 (`.wrangler/state/v3/d1/`)
  - Supports local `.db`, `.sqlite`, `.sqlite3` files
  - Custom paths via `WORKTREE_DB_PATH` environment variable
- **Port Management**: Auto-assign unique ports to avoid conflicts (4322, 4323, etc.)
- **Dev Server Control**: Optionally start dev servers automatically
- **Package Manager Agnostic**: Works with npm, yarn, or pnpm

#### Usage

```bash
# Create worktree for issue #15 with dev server
pnpm worktree create 15 dark-mode --start-server

# List active worktrees
pnpm worktree list

# Show worktree details
pnpm worktree info 15

# Delete worktree when done
pnpm worktree delete 15
```

#### Integration with Skills

When the worktree script is detected, the skills automatically integrate:
- **`/ship`** - Creates worktrees for new issues (if project has SQLite databases)
- **`/done`** - Cleans up worktrees after PR merge
- **`/work`** - Shows active worktrees in the dashboard

#### When to Use Worktrees

**Use worktrees for:**
- Database/schema changes requiring isolated state
- Backend API changes needing separate dev server
- Parallel work on multiple features
- Testing migrations before merging

**Use regular branches for:**
- UI-only changes (styling, components)
- Documentation updates
- Simple fixes with no database interaction

See the [worktree plugin README](plugins/worktree/README.md) for full documentation.

### Screenshots

The `/pr` skill supports capturing screenshots of UI changes:
- Requires Chrome DevTools MCP integration
- Project must have session authentication
- Screenshots are saved to `.github/pr-screenshots/`

## Contributing

Found a bug or have a feature request? [Open an issue](https://github.com/builtby-win/skills/issues)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

**Winston Zhao** ([`@snoolord`](https://github.com/snoolord))

---

Made with [Claude Code](https://claude.com/claude-code)
