#!/usr/bin/env tsx

/**
 * Generic Worktree Management Script
 *
 * Features:
 * - Creates isolated git worktrees for parallel development
 * - Snapshots SQLite databases for each worktree
 * - Manages port allocation for dev servers
 * - Tracks metadata for all active worktrees
 *
 * Configuration (via CLAUDE.md or defaults):
 * - WORKTREE_DB_PATH: Path to SQLite database(s) to snapshot
 * - WORKTREE_BASE_PORT: Starting port for dev servers (default: 4322)
 * - WORKTREE_DEV_COMMAND: npm script to start dev server (default: "dev")
 */

import { execSync, spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const WORKTREE_DIR = '.worktrees'
const METADATA_FILE = '.worktree-metadata.json'
const BASE_PORT = parseInt(process.env.WORKTREE_BASE_PORT || '4322')
const MAIN_PORT = parseInt(process.env.WORKTREE_MAIN_PORT || '4321')
const DEV_COMMAND = process.env.WORKTREE_DEV_COMMAND || 'dev'

interface WorktreeInfo {
  issueNumber: number
  branch: string
  port: number
  path: string
  createdAt: string
  dbSnapshots: string[]
  devServerPid: number | null
}

interface WorktreeMetadata {
  worktrees: Record<string, WorktreeInfo>
  nextPort: number
}

function loadMetadata(): WorktreeMetadata {
  const metadataPath = path.join(rootDir, METADATA_FILE)

  if (!fs.existsSync(metadataPath)) {
    return {
      worktrees: {},
      nextPort: BASE_PORT,
    }
  }

  try {
    const content = fs.readFileSync(metadataPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Failed to load metadata, using defaults')
    return {
      worktrees: {},
      nextPort: BASE_PORT,
    }
  }
}

function saveMetadata(metadata: WorktreeMetadata): void {
  const metadataPath = path.join(rootDir, METADATA_FILE)
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
}

async function isPortInUse(port: number): Promise<boolean> {
  try {
    const result = execSync(`lsof -i :${port}`, { encoding: 'utf-8', stdio: 'pipe' })
    return result.trim().length > 0
  } catch {
    // lsof exits with non-zero if port not in use
    return false
  }
}

async function getNextAvailablePort(): Promise<number> {
  const metadata = loadMetadata()
  let port = metadata.nextPort

  // Check if port is actually available
  while (await isPortInUse(port)) {
    console.log(`  Port ${port} in use, trying next...`)
    port++
  }

  return port
}

/**
 * Auto-detect SQLite database files in the project
 */
function findSqliteDatabases(): string[] {
  const candidates: string[] = []

  // Check for Cloudflare D1 databases
  const d1Path = path.join(rootDir, '.wrangler/state/v3/d1')
  if (fs.existsSync(d1Path)) {
    const d1Dirs = fs.readdirSync(d1Path)
    for (const dir of d1Dirs) {
      const dbDir = path.join(d1Path, dir)
      if (fs.statSync(dbDir).isDirectory()) {
        candidates.push(dbDir)
      }
    }
  }

  // Check for .db, .sqlite, .sqlite3 files in root
  const rootFiles = fs.readdirSync(rootDir)
  for (const file of rootFiles) {
    if (file.match(/\.(db|sqlite|sqlite3)$/)) {
      candidates.push(path.join(rootDir, file))
    }
  }

  // Check for custom path from environment
  if (process.env.WORKTREE_DB_PATH) {
    const customPath = path.join(rootDir, process.env.WORKTREE_DB_PATH)
    if (fs.existsSync(customPath)) {
      candidates.push(customPath)
    }
  }

  return candidates
}

async function verifyDatabaseSnapshot(dbPath: string): Promise<boolean> {
  try {
    const result = execSync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    return result.trim() === 'ok'
  } catch (error) {
    console.error(`Database integrity check failed: ${error}`)
    return false
  }
}

async function snapshotDatabase(worktreePath: string, sourcePath: string): Promise<string> {
  const isDirectory = fs.statSync(sourcePath).isDirectory()

  if (isDirectory) {
    // Handle directory of SQLite files (e.g., D1)
    const relativePath = path.relative(rootDir, sourcePath)
    const targetPath = path.join(worktreePath, relativePath)

    fs.mkdirSync(targetPath, { recursive: true })

    const files = fs.readdirSync(sourcePath)
    const sqliteFiles = files.filter((f) => f.endsWith('.sqlite'))

    if (sqliteFiles.length === 0) {
      throw new Error(`No SQLite files found in ${sourcePath}`)
    }

    for (const file of sqliteFiles) {
      const src = path.join(sourcePath, file)
      const dest = path.join(targetPath, file)
      fs.copyFileSync(src, dest)

      const isValid = await verifyDatabaseSnapshot(dest)
      if (!isValid) {
        throw new Error(`Database snapshot failed integrity check: ${file}`)
      }
    }

    console.log(`  ✓ Database snapshot: ${relativePath} (${sqliteFiles.length} file(s))`)
    return targetPath
  } else {
    // Handle single SQLite file
    const relativePath = path.relative(rootDir, sourcePath)
    const targetPath = path.join(worktreePath, relativePath)

    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    fs.copyFileSync(sourcePath, targetPath)

    const isValid = await verifyDatabaseSnapshot(targetPath)
    if (!isValid) {
      throw new Error(`Database snapshot failed integrity check: ${relativePath}`)
    }

    console.log(`  ✓ Database snapshot: ${relativePath}`)
    return targetPath
  }
}

async function snapshotDatabases(worktreePath: string): Promise<string[]> {
  const databases = findSqliteDatabases()

  if (databases.length === 0) {
    console.warn('  ⚠ No SQLite databases found to snapshot')
    return []
  }

  const snapshots: string[] = []

  for (const dbPath of databases) {
    try {
      const snapshot = await snapshotDatabase(worktreePath, dbPath)
      snapshots.push(snapshot)
    } catch (error) {
      console.error(`  ❌ Failed to snapshot ${dbPath}: ${error}`)
    }
  }

  return snapshots
}

async function startDevServer(worktreePath: string, port: number): Promise<number> {
  console.log(`  Starting dev server on port ${port}...`)

  // Detect package manager
  const hasPackageJson = fs.existsSync(path.join(worktreePath, 'package.json'))
  if (!hasPackageJson) {
    throw new Error('No package.json found - cannot start dev server')
  }

  const hasPnpmLock = fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))
  const hasYarnLock = fs.existsSync(path.join(rootDir, 'yarn.lock'))
  const packageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm'

  const serverProcess = spawn(packageManager, [DEV_COMMAND, '--port', port.toString()], {
    cwd: worktreePath,
    detached: true,
    stdio: 'ignore',
  })

  serverProcess.unref() // Allow process to run independently

  const pid = serverProcess.pid
  if (!pid) {
    throw new Error('Failed to start dev server')
  }

  console.log(`  ✓ Dev server started (PID ${pid}) on http://localhost:${port}`)
  return pid
}

async function stopDevServer(pid: number | null): Promise<void> {
  if (!pid) return

  try {
    process.kill(pid, 'SIGTERM')
    console.log(`  ✓ Stopped dev server (PID ${pid})`)
  } catch (error) {
    console.warn(`  ⚠ Failed to stop dev server (PID ${pid}): Process may have already exited`)
  }
}

async function createWorktree(
  issueNumber: number,
  slug: string,
  options: { startServer?: boolean; branchPrefix?: string } = {},
): Promise<void> {
  console.log(`\nCreating worktree for issue #${issueNumber}...\n`)

  const metadata = loadMetadata()
  const worktreeName = `issue-${issueNumber}-${slug}`
  const worktreePath = path.join(rootDir, WORKTREE_DIR, worktreeName)

  // Get branch prefix from options or environment
  const branchPrefix = options.branchPrefix || process.env.PROJECT_PREFIX || path.basename(rootDir)
  const branchName = `${branchPrefix}/issue-${issueNumber}-${slug}`

  // Check if worktree already exists
  if (metadata.worktrees[worktreeName]) {
    throw new Error(
      `Worktree for issue #${issueNumber} already exists at ${metadata.worktrees[worktreeName].path}`,
    )
  }

  // Ensure .worktrees directory exists
  const worktreesDir = path.join(rootDir, WORKTREE_DIR)
  if (!fs.existsSync(worktreesDir)) {
    fs.mkdirSync(worktreesDir, { recursive: true })
  }

  // Get next available port
  const port = await getNextAvailablePort()

  // Create git worktree
  console.log(`  Creating git worktree at ${WORKTREE_DIR}/${worktreeName}...`)
  try {
    // Check if branch already exists
    const branchExists =
      execSync(`git branch --list "${branchName}"`, {
        cwd: rootDir,
        encoding: 'utf-8',
      }).trim().length > 0

    if (branchExists) {
      // Branch exists, checkout existing branch
      execSync(`git worktree add "${worktreePath}" "${branchName}"`, {
        cwd: rootDir,
        stdio: 'inherit',
      })
    } else {
      // Branch doesn't exist, create new branch
      execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, {
        cwd: rootDir,
        stdio: 'inherit',
      })
    }
    console.log(`  ✓ Git worktree created`)
  } catch (error) {
    throw new Error(`Failed to create git worktree: ${error}`)
  }

  // Symlink node_modules to avoid duplication
  const nodeModulesLink = path.join(worktreePath, 'node_modules')
  const nodeModulesTarget = path.join(rootDir, 'node_modules')

  if (fs.existsSync(nodeModulesTarget)) {
    console.log(`  Symlinking node_modules...`)
    try {
      fs.symlinkSync(nodeModulesTarget, nodeModulesLink, 'dir')
      console.log(`  ✓ node_modules symlinked`)
    } catch (error) {
      console.warn(`  ⚠ Failed to symlink node_modules: ${error}`)
    }
  }

  // Copy database snapshots
  const dbSnapshots = await snapshotDatabases(worktreePath)

  // Update metadata
  metadata.worktrees[worktreeName] = {
    issueNumber,
    branch: branchName,
    port,
    path: `${WORKTREE_DIR}/${worktreeName}`,
    createdAt: new Date().toISOString(),
    dbSnapshots,
    devServerPid: null,
  }
  metadata.nextPort = port + 1

  // Start dev server if requested
  if (options.startServer) {
    try {
      const pid = await startDevServer(worktreePath, port)
      metadata.worktrees[worktreeName].devServerPid = pid
    } catch (error) {
      console.warn(`  ⚠ Failed to start dev server: ${error}`)
      console.warn(
        `  You can start it manually with: cd ${WORKTREE_DIR}/${worktreeName} && pnpm dev --port ${port}`,
      )
    }
  }

  saveMetadata(metadata)

  console.log(`\n✅ Worktree created successfully!\n`)
  console.log(`  Issue: #${issueNumber}`)
  console.log(`  Branch: ${branchName}`)
  console.log(`  Path: ${WORKTREE_DIR}/${worktreeName}`)
  console.log(`  Port: ${port}`)
  console.log(`  Dev server: ${options.startServer ? `http://localhost:${port}` : 'not started'}`)
  console.log(`\nNavigate to worktree:`)
  console.log(`  cd ${WORKTREE_DIR}/${worktreeName}\n`)
}

async function deleteWorktree(issueNumber: number, force = false): Promise<void> {
  console.log(`\nDeleting worktree for issue #${issueNumber}...\n`)

  const metadata = loadMetadata()

  // Find worktree by issue number
  const worktreeName = Object.keys(metadata.worktrees).find(
    (name) => metadata.worktrees[name].issueNumber === issueNumber,
  )

  if (!worktreeName) {
    throw new Error(`No worktree found for issue #${issueNumber}`)
  }

  const worktree = metadata.worktrees[worktreeName]
  const worktreePath = path.join(rootDir, worktree.path)

  // Stop dev server if running
  if (worktree.devServerPid) {
    console.log(`  Stopping dev server (PID ${worktree.devServerPid})...`)
    await stopDevServer(worktree.devServerPid)
  }

  // Remove git worktree
  console.log(`  Removing git worktree...`)
  try {
    const forceFlag = force ? '--force' : ''
    execSync(`git worktree remove "${worktreePath}" ${forceFlag}`, {
      cwd: rootDir,
      stdio: 'inherit',
    })
    console.log(`  ✓ Git worktree removed`)
  } catch (error) {
    if (!force) {
      console.error(`  ❌ Failed to remove worktree. Use --force to force removal.`)
      throw error
    }
    console.warn(`  ⚠ Force removed worktree despite errors`)
  }

  // Remove from metadata
  delete metadata.worktrees[worktreeName]
  saveMetadata(metadata)

  console.log(`\n✅ Worktree deleted successfully!\n`)
  console.log(`  Port ${worktree.port} is now available`)
  console.log(`  Issue #${issueNumber} worktree cleaned up\n`)
}

async function listWorktrees(): Promise<void> {
  const metadata = loadMetadata()

  const worktreeNames = Object.keys(metadata.worktrees)

  if (worktreeNames.length === 0) {
    console.log('\nNo active worktrees\n')
    console.log(`Main worktree on port ${MAIN_PORT}\n`)
    return
  }

  console.log('\n=== Active Worktrees ===\n')

  // Sort by issue number
  const sortedNames = worktreeNames.sort((a, b) => {
    return metadata.worktrees[a].issueNumber - metadata.worktrees[b].issueNumber
  })

  for (const name of sortedNames) {
    const worktree = metadata.worktrees[name]
    const serverStatus = worktree.devServerPid
      ? `running (PID ${worktree.devServerPid})`
      : 'not running'

    console.log(`Issue #${worktree.issueNumber} (${name})`)
    console.log(`  Branch: ${worktree.branch}`)
    console.log(`  Path: ${worktree.path}`)
    console.log(`  Port: ${worktree.port} → http://localhost:${worktree.port}`)
    console.log(`  Server: ${serverStatus}`)
    console.log(`  Created: ${new Date(worktree.createdAt).toLocaleString()}`)
    if (worktree.dbSnapshots.length > 0) {
      console.log(`  Databases: ${worktree.dbSnapshots.length} snapshot(s)`)
    }
    console.log('')
  }

  console.log(`Main worktree on port ${MAIN_PORT}\n`)
}

async function showWorktreeInfo(issueNumber: number): Promise<void> {
  const metadata = loadMetadata()

  const worktreeName = Object.keys(metadata.worktrees).find(
    (name) => metadata.worktrees[name].issueNumber === issueNumber,
  )

  if (!worktreeName) {
    throw new Error(`No worktree found for issue #${issueNumber}`)
  }

  const worktree = metadata.worktrees[worktreeName]

  console.log(`\n=== Worktree Info: Issue #${issueNumber} ===\n`)
  console.log(`  Name: ${worktreeName}`)
  console.log(`  Branch: ${worktree.branch}`)
  console.log(`  Path: ${worktree.path}`)
  console.log(`  Port: ${worktree.port}`)
  console.log(`  URL: http://localhost:${worktree.port}`)
  console.log(`  Created: ${new Date(worktree.createdAt).toLocaleString()}`)

  if (worktree.dbSnapshots.length > 0) {
    console.log(`  Database Snapshots:`)
    for (const snapshot of worktree.dbSnapshots) {
      console.log(`    - ${snapshot}`)
    }
  }

  if (worktree.devServerPid) {
    console.log(`  Dev Server: running (PID ${worktree.devServerPid})`)
  } else {
    console.log(`  Dev Server: not running`)
    console.log(`\n  Start with: cd ${worktree.path} && pnpm dev --port ${worktree.port}`)
  }

  console.log('')
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  try {
    switch (command) {
      case 'create': {
        const issueNumber = parseInt(args[1])
        const slug = args[2]
        const startServer = args.includes('--start-server')
        const branchPrefixArg = args.find((arg) => arg.startsWith('--branch-prefix='))
        const branchPrefix = branchPrefixArg?.split('=')[1]

        if (!issueNumber || !slug) {
          console.error('Usage: pnpm worktree create <issue-number> <slug> [--start-server] [--branch-prefix=prefix]')
          process.exit(1)
        }

        await createWorktree(issueNumber, slug, { startServer, branchPrefix })
        break
      }

      case 'delete': {
        const issueNumber = parseInt(args[1])
        const force = args.includes('--force')

        if (!issueNumber) {
          console.error('Usage: pnpm worktree delete <issue-number> [--force]')
          process.exit(1)
        }

        await deleteWorktree(issueNumber, force)
        break
      }

      case 'list': {
        await listWorktrees()
        break
      }

      case 'info': {
        const issueNumber = parseInt(args[1])

        if (!issueNumber) {
          console.error('Usage: pnpm worktree info <issue-number>')
          process.exit(1)
        }

        await showWorktreeInfo(issueNumber)
        break
      }

      default: {
        console.log('\nWorktree Management CLI\n')
        console.log('Commands:')
        console.log('  create <issue-number> <slug> [--start-server] [--branch-prefix=prefix]')
        console.log('                                                Create a new worktree')
        console.log('  delete <issue-number> [--force]              Delete a worktree')
        console.log('  list                                         List all worktrees')
        console.log('  info <issue-number>                          Show worktree details')
        console.log('\nExamples:')
        console.log('  pnpm worktree create 15 dark-mode --start-server')
        console.log('  pnpm worktree create 15 dark-mode --branch-prefix=myproject')
        console.log('  pnpm worktree list')
        console.log('  pnpm worktree delete 15')
        console.log('\nConfiguration (optional environment variables):')
        console.log('  PROJECT_PREFIX         - Default branch prefix (default: directory name)')
        console.log('  WORKTREE_BASE_PORT     - Starting port for dev servers (default: 4322)')
        console.log('  WORKTREE_MAIN_PORT     - Main worktree port (default: 4321)')
        console.log('  WORKTREE_DEV_COMMAND   - npm script to start dev server (default: "dev")')
        console.log('  WORKTREE_DB_PATH       - Custom SQLite database path to snapshot')
        console.log('')
        process.exit(command ? 1 : 0)
      }
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}\n`)
    process.exit(1)
  }
}

main()
