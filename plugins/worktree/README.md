# Worktree Plugin

Git worktree management with SQLite database snapshots and port isolation for parallel development.

## Features

- **Isolated Development**: Create separate worktrees for each issue/feature
- **Database Snapshots**: Automatically snapshot SQLite databases for each worktree
- **Port Management**: Auto-assign ports to avoid conflicts between worktrees
- **Dev Server Control**: Optionally start dev servers automatically
- **Generic SQLite Support**: Works with Cloudflare D1, local .db files, and any SQLite database
- **Package Manager Agnostic**: Works with npm, yarn, or pnpm

## Installation

The worktree CLI is available as an npm package - no project-specific setup needed!

```bash
# Use directly with npx (recommended)
npx @builtby.win/worktree create 15 dark-mode --start-server

# Or install globally
npm install -g @builtby.win/worktree
worktree create 15 dark-mode --start-server
```

## Usage

```bash
# Create a worktree for issue #15
npx @builtby.win/worktree create 15 dark-mode --start-server

# List active worktrees
npx @builtby.win/worktree list

# Show worktree details
npx @builtby.win/worktree info 15

# Delete worktree when done
npx @builtby.win/worktree delete 15
```

## Integration with Claude Skills

This plugin integrates seamlessly with your workflow:

- **`/ship`** - Optionally creates worktrees when starting new issues
- **`/done`** - Automatically cleans up worktrees when issues are completed
- **`/work`** - Shows active worktrees in dashboard

## Database Detection

The CLI automatically finds SQLite databases in:

- **Cloudflare D1**: `.wrangler/state/v3/d1/*/`
- **Root directory**: `*.db`, `*.sqlite`, `*.sqlite3`
- **Custom paths**: Set `WORKTREE_DB_PATH` environment variable

## Commands

```bash
# Create worktree
npx @builtby.win/worktree create <issue-number> <slug> [--start-server] [--branch-prefix=prefix]

# List worktrees
npx @builtby.win/worktree list

# Show worktree info
npx @builtby.win/worktree info <issue-number>

# Delete worktree
npx @builtby.win/worktree delete <issue-number> [--force]
```

## Configuration

Optional environment variables (set in `CLAUDE.md` or `.env`):

- `PROJECT_PREFIX` - Branch prefix (default: directory name)
- `WORKTREE_BASE_PORT` - Starting port for dev servers (default: 4322)
- `WORKTREE_MAIN_PORT` - Main worktree port (default: 4321)
- `WORKTREE_DEV_COMMAND` - npm script to start dev (default: "dev")
- `WORKTREE_DB_PATH` - Custom SQLite database path

## When to Use Worktrees

**Use worktrees for:**
- Database/schema changes requiring isolated state
- Backend API changes needing separate dev server
- Parallel work on multiple features
- Testing migrations before merging

**Use regular branches for:**
- UI-only changes (styling, components)
- Documentation updates
- Simple fixes with no database interaction

## Example Workflow

```bash
# Claude creates issue #20 for email notifications feature
$ npx @builtby.win/worktree create 20 email-notifications --start-server

Creating worktree for issue #20...
  Project root: /home/user/myproject

  ✓ Git worktree created
  ✓ node_modules symlinked
  ✓ Database snapshot: .wrangler/state/v3/d1/... (1 file)
  ✓ Dev server started (PID 12345) on http://localhost:4322

✅ Worktree created successfully!
  Issue: #20
  Branch: myproject/issue-20-email-notifications
  Port: 4322
  Dev server: http://localhost:4322

# Work in the worktree
$ cd .worktrees/issue-20-email-notifications
$ git commit -am "Add email notification service"

# When done, clean up
$ cd ../..
$ npx @builtby.win/worktree delete 20
```

## Metadata

Worktree state is tracked in `.worktree-metadata.json`:

```json
{
  "worktrees": {
    "issue-20-email-notifications": {
      "issueNumber": 20,
      "branch": "myproject/issue-20-email-notifications",
      "port": 4322,
      "path": ".worktrees/issue-20-email-notifications",
      "createdAt": "2026-01-04T18:30:00.000Z",
      "dbSnapshots": [".wrangler/state/v3/d1/miniflare-D1DatabaseObject"],
      "devServerPid": 12345
    }
  },
  "nextPort": 4323
}
```

This file is git-ignored and tracks local worktree state.

## Package Manager Detection

The CLI auto-detects your package manager when starting dev servers:

- **pnpm**: If `pnpm-lock.yaml` exists
- **yarn**: If `yarn.lock` exists
- **npm**: Default fallback

## Troubleshooting

**No databases detected?**
- Worktrees still work, just won't snapshot any databases
- Set `WORKTREE_DB_PATH` if database is in non-standard location

**Port already in use?**
- CLI auto-detects and skips to next available port
- Check with: `npx @builtby.win/worktree list`

## Migration from Local Script

If you previously used `/setup-worktree` to install a local script, you can remove it:

```bash
# Remove local script (optional, won't conflict)
rm scripts/manage-worktree.ts

# Remove package.json script entry (optional)
# Edit package.json to remove "worktree" script

# Use npx instead
npx @builtby.win/worktree list
```

The npm CLI is fully compatible with existing `.worktree-metadata.json` files.
