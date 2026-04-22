import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

const WORKTREE_BASE = path.join(os.homedir(), '.workroom', 'worktrees')

export function ensureWorktree(agentId: string, repoPath: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(agentId)) {
    throw new Error(`ensureWorktree: invalid agentId "${agentId}"`)
  }
  fs.mkdirSync(WORKTREE_BASE, { recursive: true })
  const worktreePath = path.join(WORKTREE_BASE, agentId)
  if (fs.existsSync(path.join(worktreePath, '.git'))) return worktreePath

  const branch = `workroom-${agentId}`
  try {
    execSync(`git worktree add -B ${branch} ${worktreePath}`, {
      cwd: repoPath,
      stdio: 'pipe',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? (err as NodeJS.ErrnoException & { stderr?: Buffer }).stderr?.toString() ?? err.message : String(err)
    if (!msg.includes('already exists') && !msg.includes('already registered')) throw err
    try {
      execSync(`git worktree prune`, { cwd: repoPath, stdio: 'pipe' })
    } catch {}
    execSync(`git worktree add ${worktreePath} ${branch}`, {
      cwd: repoPath,
      stdio: 'pipe',
    })
  }
  return worktreePath
}

export function removeWorktree(agentId: string, repoPath: string): void {
  const worktreePath = path.join(WORKTREE_BASE, agentId)
  try {
    execSync(`git worktree remove --force ${worktreePath}`, { cwd: repoPath, stdio: 'pipe' })
  } catch (err) {
    process.stderr.write(`[removeWorktree] git worktree remove: ${err}\n`)
  }
  try {
    execSync(`git branch -D workroom-${agentId}`, { cwd: repoPath, stdio: 'pipe' })
  } catch (err) {
    process.stderr.write(`[removeWorktree] git branch -D: ${err}\n`)
  }
  fs.rmSync(worktreePath, { recursive: true, force: true })
  try {
    execSync(`git worktree prune`, { cwd: repoPath, stdio: 'pipe' })
  } catch {}
}

export function getWorktreePath(agentId: string): string {
  return path.join(WORKTREE_BASE, agentId)
}
