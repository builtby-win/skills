#!/usr/bin/env node

/**
 * Worktree CLI - Git worktree management with SQLite database snapshots
 *
 * Usage:
 *   npx @anthropic/worktree create <issue-number> <slug> [options]
 *   npx @anthropic/worktree delete <issue-number> [--force]
 *   npx @anthropic/worktree list
 *   npx @anthropic/worktree info <issue-number>
 */

import { createWorktree, deleteWorktree, listWorktrees, showWorktreeInfo } from './index.js'

const VERSION = '0.1.0'

function printHelp(): void {
  console.log(`
Worktree CLI v${VERSION}
Git worktree management with SQLite database snapshots

Usage:
  worktree <command> [options]

Commands:
  create <issue> <slug>  Create a new worktree for an issue
  delete <issue>         Delete a worktree
  list                   List all active worktrees
  info <issue>           Show details for a worktree

Create Options:
  --start-server         Start dev server after creating worktree
  --branch-prefix=<p>    Branch prefix (default: PROJECT_PREFIX env or dir name)
  --port=<port>          Specify port (default: auto-assign from WORKTREE_BASE_PORT)

Delete Options:
  --force                Force delete even if uncommitted changes

Environment Variables:
  PROJECT_PREFIX         Default branch prefix
  WORKTREE_BASE_PORT     Starting port for dev servers (default: 4322)
  WORKTREE_MAIN_PORT     Main worktree port (default: 4321)
  WORKTREE_DEV_COMMAND   npm script to start dev server (default: "dev")
  WORKTREE_DB_PATH       Custom SQLite database path to snapshot

Examples:
  worktree create 15 dark-mode --start-server
  worktree create 42 api-refactor --branch-prefix=myapp
  worktree list
  worktree info 15
  worktree delete 15 --force

Works with npm, yarn, and pnpm - auto-detects from lockfiles.
`)
}

function parseArgs(args: string[]): {
  command: string
  positional: string[]
  flags: Record<string, string | boolean>
} {
  const command = args[0] || ''
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      flags[key] = value ?? true
    } else if (arg.startsWith('-')) {
      flags[arg.slice(1)] = true
    } else {
      positional.push(arg)
    }
  }

  return { command, positional, flags }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION)
    process.exit(0)
  }

  const { command, positional, flags } = parseArgs(args)

  try {
    switch (command) {
      case 'create': {
        const issueNumber = parseInt(positional[0])
        const slug = positional[1]

        if (!issueNumber || isNaN(issueNumber) || !slug) {
          console.error('Error: create requires <issue-number> and <slug>')
          console.error('Usage: worktree create <issue-number> <slug> [--start-server]')
          process.exit(1)
        }

        await createWorktree(issueNumber, slug, {
          startServer: Boolean(flags['start-server']),
          branchPrefix: typeof flags['branch-prefix'] === 'string' ? flags['branch-prefix'] : undefined,
          port: typeof flags['port'] === 'string' ? parseInt(flags['port']) : undefined,
        })
        break
      }

      case 'delete': {
        const issueNumber = parseInt(positional[0])

        if (!issueNumber || isNaN(issueNumber)) {
          console.error('Error: delete requires <issue-number>')
          console.error('Usage: worktree delete <issue-number> [--force]')
          process.exit(1)
        }

        await deleteWorktree(issueNumber, Boolean(flags['force']))
        break
      }

      case 'list': {
        await listWorktrees()
        break
      }

      case 'info': {
        const issueNumber = parseInt(positional[0])

        if (!issueNumber || isNaN(issueNumber)) {
          console.error('Error: info requires <issue-number>')
          console.error('Usage: worktree info <issue-number>')
          process.exit(1)
        }

        await showWorktreeInfo(issueNumber)
        break
      }

      default: {
        console.error(`Unknown command: ${command}`)
        console.error('Run "worktree --help" for usage information')
        process.exit(1)
      }
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}\n`)
    process.exit(1)
  }
}

main()
