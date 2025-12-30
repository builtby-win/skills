# GitHub Workflow Skills

Claude Code plugin marketplace providing automated GitHub workflow skills for issue management, branch creation, pull requests, and team coordination.

## Features

- **`/done`** - Clean up after PR merge (delete branches, verify issue closure)
- **`/pr`** - Create pull requests with pre-flight checks and optional screenshots
- **`/ship`** - Publish plans as GitHub issues and create feature branches
- **`/work`** - Display team dashboard (issues, PRs, backlog)

## Installation

### Add the Marketplace

```bash
/plugin marketplace add github.com/snoolord/skills
```

### Install Plugins

Install all skills:

```bash
/plugin install done@github-workflow-skills
/plugin install pr@github-workflow-skills
/plugin install ship@github-workflow-skills
/plugin install work@github-workflow-skills
```

Or install individually as needed:

```bash
/plugin install done@github-workflow-skills
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

If your project uses git worktrees, the skills will detect and integrate with them:
- `/ship` can create worktrees for isolated development
- `/done` will clean up worktrees when branches are deleted
- `/work` will show active worktrees

### Screenshots

The `/pr` skill supports capturing screenshots of UI changes:
- Requires Chrome DevTools MCP integration
- Project must have session authentication
- Screenshots are saved to `.github/pr-screenshots/`

## Contributing

Found a bug or have a feature request? [Open an issue](https://github.com/snoolord/skills/issues)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

**Winston Zhao** ([`@snoolord`](https://github.com/snoolord))

---

Made with [Claude Code](https://claude.com/claude-code)
