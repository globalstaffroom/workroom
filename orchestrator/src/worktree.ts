import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

const WORKTREE_BASE = path.join(os.homedir(), '.workroom', 'worktrees')

export function ensureWorktree(agentId: string, repoPath: string): string {
  fs.mkdirSync(WORKTREE_BASE, { recursive: true })
  const worktreePath = path.join(WORKTREE_BASE, agentId)

  if (fs.existsSync(worktreePath)) return worktreePath

  try {
    const branch = `workroom-${agentId}`
    execSync(`git worktree add -B ${branch} ${worktreePath}`, { cwd: repoPath, stdio: 'pipe' })
  } catch {
    // Not a git repo or already exists — use plain directory
    fs.mkdirSync(worktreePath, { recursive: true })
  }

  return worktreePath
}

export function getWorktreePath(agentId: string): string {
  return path.join(WORKTREE_BASE, agentId)
}
