# @builtby.win/worktree

Git worktree management with SQLite database snapshots for parallel development.

[![npm version](https://img.shields.io/npm/v/@builtby.win/worktree.svg)](https://www.npmjs.com/package/@builtby.win/worktree)

## Installation

```bash
# Global install
npm install -g @builtby.win/worktree

# Or use npx (no install needed)
npx @builtby.win/worktree create 15 dark-mode
```

## Usage

```bash
# Create a worktree for issue #15
worktree create 15 dark-mode --start-server

# List active worktrees
worktree list

# Show details for a worktree
worktree info 15

# Delete a worktree
worktree delete 15
```

## Features

- **Isolated Development**: Create separate git worktrees for each issue/feature
- **Database Snapshots**: Automatically snapshot SQLite databases (Cloudflare D1, local .db files)
- **Port Management**: Auto-assign unique ports for dev servers
- **Dev Server Control**: Optionally start dev servers automatically
- **Package Manager Agnostic**: Works with npm, yarn, or pnpm

## Commands

### `create <issue-number> <slug> [options]`

Create a new worktree for an issue.

Options:
- `--start-server` - Start dev server after creating
- `--branch-prefix=<prefix>` - Branch prefix (default: PROJECT_PREFIX env or directory name)
- `--port=<port>` - Specific port (default: auto-assign)

### `delete <issue-number> [options]`

Delete a worktree.

Options:
- `--force` - Force delete even with uncommitted changes

### `list`

List all active worktrees with their status.

### `info <issue-number>`

Show detailed information for a specific worktree.

## Configuration

Set via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_PREFIX` | directory name | Branch naming prefix |
| `WORKTREE_BASE_PORT` | 4322 | Starting port for dev servers |
| `WORKTREE_MAIN_PORT` | 4321 | Main worktree port |
| `WORKTREE_DEV_COMMAND` | dev | npm script for dev server |
| `WORKTREE_DB_PATH` | - | Custom SQLite database path |

## Database Detection

Automatically finds SQLite databases in:

- **Cloudflare D1**: `.wrangler/state/v3/d1/*/`
- **Root directory**: `*.db`, `*.sqlite`, `*.sqlite3`
- **Custom paths**: Set `WORKTREE_DB_PATH`

## Example Workflow

```bash
# Start work on issue #20
$ worktree create 20 email-notifications --start-server

Creating worktree for issue #20...
  Project root: /home/user/myproject

  Creating git worktree...
  ✓ Git worktree created
  ✓ node_modules symlinked
  ✓ Database snapshot: .wrangler/state/v3/d1/... (1 file)
  ✓ Dev server started (PID 12345) on http://localhost:4322

✅ Worktree created successfully!
  Issue: #20
  Branch: myproject/issue-20-email-notifications
  Path: .worktrees/issue-20-email-notifications
  Port: 4322

# Work in the worktree
$ cd .worktrees/issue-20-email-notifications
$ git commit -am "Add email notifications"

# Clean up when done
$ cd ../..
$ worktree delete 20
```

## Integration with Claude Skills

This CLI is designed to work with the builtby-win/skills workflow:

- `/ship` - Creates worktrees when starting new issues
- `/done` - Cleans up worktrees after PR merge
- `/work` - Shows active worktrees in dashboard

## License

MIT
