/**
 * Worktree Management Library
 *
 * Git worktree management with SQLite database snapshots
 * for parallel development workflows.
 */

import { execSync, spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

const WORKTREE_DIR = '.worktrees'
const METADATA_FILE = '.worktree-metadata.json'
const DEFAULT_BASE_PORT = 4322
const DEFAULT_MAIN_PORT = 4321
const DEFAULT_DEV_COMMAND = 'dev'

export interface WorktreeInfo {
  issueNumber: number
  branch: string
  port: number
  path: string
  createdAt: string
  dbSnapshots: string[]
  devServerPid: number | null
}

export interface WorktreeMetadata {
  worktrees: Record<string, WorktreeInfo>
  nextPort: number
}

export interface CreateOptions {
  startServer?: boolean
  branchPrefix?: string
  port?: number
}

/**
 * Find the project root by looking for package.json or .git
 */
function findProjectRoot(startDir: string = process.cwd()): string {
  let dir = startDir

  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, '.git'))) {
      return dir
    }
    dir = path.dirname(dir)
  }

  // Fall back to cwd if no project root found
  return process.cwd()
}

function getConfig() {
  const basePort = parseInt(process.env.WORKTREE_BASE_PORT || String(DEFAULT_BASE_PORT))
  const mainPort = parseInt(process.env.WORKTREE_MAIN_PORT || String(DEFAULT_MAIN_PORT))
  const devCommand = process.env.WORKTREE_DEV_COMMAND || DEFAULT_DEV_COMMAND

  return { basePort, mainPort, devCommand }
}

function loadMetadata(rootDir: string): WorktreeMetadata {
  const { basePort } = getConfig()
  const metadataPath = path.join(rootDir, METADATA_FILE)

  if (!fs.existsSync(metadataPath)) {
    return {
      worktrees: {},
      nextPort: basePort,
    }
  }

  try {
    const content = fs.readFileSync(metadataPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    console.error('Failed to load metadata, using defaults')
    return {
      worktrees: {},
      nextPort: basePort,
    }
  }
}

function saveMetadata(rootDir: string, metadata: WorktreeMetadata): void {
  const metadataPath = path.join(rootDir, METADATA_FILE)
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
}

async function isPortInUse(port: number): Promise<boolean> {
  try {
    const result = execSync(`lsof -i :${port}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    return result.trim().length > 0
  } catch {
    return false
  }
}

async function getNextAvailablePort(rootDir: string, preferredPort?: number): Promise<number> {
  const metadata = loadMetadata(rootDir)
  let port = preferredPort ?? metadata.nextPort

  while (await isPortInUse(port)) {
    console.log(`  Port ${port} in use, trying next...`)
    port++
  }

  return port
}

/**
 * Auto-detect SQLite database files in the project
 */
function findSqliteDatabases(rootDir: string): string[] {
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
  } catch {
    return false
  }
}

async function snapshotDatabase(
  rootDir: string,
  worktreePath: string,
  sourcePath: string,
): Promise<string> {
  const isDirectory = fs.statSync(sourcePath).isDirectory()

  if (isDirectory) {
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

async function snapshotDatabases(rootDir: string, worktreePath: string): Promise<string[]> {
  const databases = findSqliteDatabases(rootDir)

  if (databases.length === 0) {
    console.log('  ⚠ No SQLite databases found to snapshot')
    return []
  }

  const snapshots: string[] = []

  for (const dbPath of databases) {
    try {
      const snapshot = await snapshotDatabase(rootDir, worktreePath, dbPath)
      snapshots.push(snapshot)
    } catch (error) {
      console.error(`  ❌ Failed to snapshot ${dbPath}: ${error}`)
    }
  }

  return snapshots
}

function detectPackageManager(rootDir: string): 'pnpm' | 'yarn' | 'npm' {
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

async function startDevServer(
  rootDir: string,
  worktreePath: string,
  port: number,
): Promise<number> {
  const { devCommand } = getConfig()
  console.log(`  Starting dev server on port ${port}...`)

  const hasPackageJson = fs.existsSync(path.join(worktreePath, 'package.json'))
  if (!hasPackageJson) {
    throw new Error('No package.json found - cannot start dev server')
  }

  const packageManager = detectPackageManager(rootDir)

  const serverProcess = spawn(packageManager, [devCommand, '--port', port.toString()], {
    cwd: worktreePath,
    detached: true,
    stdio: 'ignore',
  })

  serverProcess.unref()

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
  } catch {
    console.warn(`  ⚠ Dev server (PID ${pid}) may have already exited`)
  }
}

/**
 * Create a new worktree for an issue
 */
export async function createWorktree(
  issueNumber: number,
  slug: string,
  options: CreateOptions = {},
): Promise<WorktreeInfo> {
  const rootDir = findProjectRoot()
  console.log(`\nCreating worktree for issue #${issueNumber}...`)
  console.log(`  Project root: ${rootDir}\n`)

  const metadata = loadMetadata(rootDir)
  const worktreeName = `issue-${issueNumber}-${slug}`
  const worktreePath = path.join(rootDir, WORKTREE_DIR, worktreeName)

  const branchPrefix = options.branchPrefix || process.env.PROJECT_PREFIX || path.basename(rootDir)
  const branchName = `${branchPrefix}/issue-${issueNumber}-${slug}`

  if (metadata.worktrees[worktreeName]) {
    throw new Error(
      `Worktree for issue #${issueNumber} already exists at ${metadata.worktrees[worktreeName].path}`,
    )
  }

  const worktreesDir = path.join(rootDir, WORKTREE_DIR)
  if (!fs.existsSync(worktreesDir)) {
    fs.mkdirSync(worktreesDir, { recursive: true })
  }

  const port = await getNextAvailablePort(rootDir, options.port)

  // Create git worktree
  console.log(`  Creating git worktree at ${WORKTREE_DIR}/${worktreeName}...`)
  try {
    const branchExists =
      execSync(`git branch --list "${branchName}"`, {
        cwd: rootDir,
        encoding: 'utf-8',
      }).trim().length > 0

    if (branchExists) {
      execSync(`git worktree add "${worktreePath}" "${branchName}"`, {
        cwd: rootDir,
        stdio: 'inherit',
      })
    } else {
      execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, {
        cwd: rootDir,
        stdio: 'inherit',
      })
    }
    console.log(`  ✓ Git worktree created`)
  } catch (error) {
    throw new Error(`Failed to create git worktree: ${error}`)
  }

  // Symlink node_modules
  const nodeModulesLink = path.join(worktreePath, 'node_modules')
  const nodeModulesTarget = path.join(rootDir, 'node_modules')

  if (fs.existsSync(nodeModulesTarget) && !fs.existsSync(nodeModulesLink)) {
    console.log(`  Symlinking node_modules...`)
    try {
      fs.symlinkSync(nodeModulesTarget, nodeModulesLink, 'dir')
      console.log(`  ✓ node_modules symlinked`)
    } catch (error) {
      console.warn(`  ⚠ Failed to symlink node_modules: ${error}`)
    }
  }

  // Snapshot databases
  const dbSnapshots = await snapshotDatabases(rootDir, worktreePath)

  // Create worktree info
  const worktreeInfo: WorktreeInfo = {
    issueNumber,
    branch: branchName,
    port,
    path: `${WORKTREE_DIR}/${worktreeName}`,
    createdAt: new Date().toISOString(),
    dbSnapshots,
    devServerPid: null,
  }

  metadata.worktrees[worktreeName] = worktreeInfo
  metadata.nextPort = port + 1

  // Start dev server if requested
  if (options.startServer) {
    try {
      const pid = await startDevServer(rootDir, worktreePath, port)
      metadata.worktrees[worktreeName].devServerPid = pid
      worktreeInfo.devServerPid = pid
    } catch (error) {
      console.warn(`  ⚠ Failed to start dev server: ${error}`)
      const pm = detectPackageManager(rootDir)
      console.warn(
        `  Start manually: cd ${WORKTREE_DIR}/${worktreeName} && ${pm} ${getConfig().devCommand} --port ${port}`,
      )
    }
  }

  saveMetadata(rootDir, metadata)

  console.log(`\n✅ Worktree created successfully!\n`)
  console.log(`  Issue: #${issueNumber}`)
  console.log(`  Branch: ${branchName}`)
  console.log(`  Path: ${WORKTREE_DIR}/${worktreeName}`)
  console.log(`  Port: ${port}`)
  console.log(`  Dev server: ${options.startServer ? `http://localhost:${port}` : 'not started'}`)
  console.log(`\nTo work in this worktree:`)
  console.log(`  cd ${WORKTREE_DIR}/${worktreeName}\n`)

  return worktreeInfo
}

/**
 * Delete a worktree
 */
export async function deleteWorktree(issueNumber: number, force = false): Promise<void> {
  const rootDir = findProjectRoot()
  console.log(`\nDeleting worktree for issue #${issueNumber}...\n`)

  const metadata = loadMetadata(rootDir)

  const worktreeName = Object.keys(metadata.worktrees).find(
    (name) => metadata.worktrees[name].issueNumber === issueNumber,
  )

  if (!worktreeName) {
    throw new Error(`No worktree found for issue #${issueNumber}`)
  }

  const worktree = metadata.worktrees[worktreeName]
  const worktreePath = path.join(rootDir, worktree.path)

  // Stop dev server
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

  delete metadata.worktrees[worktreeName]
  saveMetadata(rootDir, metadata)

  console.log(`\n✅ Worktree deleted successfully!\n`)
  console.log(`  Port ${worktree.port} is now available`)
  console.log(`  Issue #${issueNumber} worktree cleaned up\n`)
}

/**
 * List all active worktrees
 */
export async function listWorktrees(): Promise<WorktreeInfo[]> {
  const rootDir = findProjectRoot()
  const { mainPort } = getConfig()
  const metadata = loadMetadata(rootDir)

  const worktreeNames = Object.keys(metadata.worktrees)

  if (worktreeNames.length === 0) {
    console.log('\nNo active worktrees\n')
    console.log(`Main worktree on port ${mainPort}\n`)
    return []
  }

  console.log('\n=== Active Worktrees ===\n')

  const sortedNames = worktreeNames.sort((a, b) => {
    return metadata.worktrees[a].issueNumber - metadata.worktrees[b].issueNumber
  })

  const worktrees: WorktreeInfo[] = []

  for (const name of sortedNames) {
    const worktree = metadata.worktrees[name]
    worktrees.push(worktree)

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

  console.log(`Main worktree on port ${mainPort}\n`)
  return worktrees
}

/**
 * Show info for a specific worktree
 */
export async function showWorktreeInfo(issueNumber: number): Promise<WorktreeInfo> {
  const rootDir = findProjectRoot()
  const metadata = loadMetadata(rootDir)

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
    const pm = detectPackageManager(rootDir)
    console.log(`  Dev Server: not running`)
    console.log(
      `\n  Start with: cd ${worktree.path} && ${pm} ${getConfig().devCommand} --port ${worktree.port}`,
    )
  }

  console.log('')
  return worktree
}
