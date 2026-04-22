import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

const WORKTREE_BASE = path.join(os.homedir(), '.workroom', 'worktrees')

export function ensureWorktree(agentId: string, repoPath: string): string {
  fs.mkdirSync(WORKTREE_BASE, { recursive: true })
  const worktreePath = path.join(WORKTREE_BASE, agentId)
  if (fs.existsSync(path.join(worktreePath, '.git'))) return worktreePath

  const branch = `workroom-${agentId}`
  try {
    execSync(`git worktree add -B ${branch} ${worktreePath}`, {
      cwd: repoPath,
      stdio: 'pipe',
    })
  } catch (err) {
    // Branch may already exist from a prior run — try without -B
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
  } catch {}
  try {
    execSync(`git branch -D workroom-${agentId}`, { cwd: repoPath, stdio: 'pipe' })
  } catch {}
  fs.rmSync(worktreePath, { recursive: true, force: true })
}

export function getWorktreePath(agentId: string): string {
  return path.join(WORKTREE_BASE, agentId)
}
