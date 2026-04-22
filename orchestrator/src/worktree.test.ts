import { describe, it, expect, afterEach } from 'vitest'
import { execSync } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { ensureWorktree, getWorktreePath, removeWorktree } from './worktree'

const REPO_PATH = path.resolve(__dirname, '../../')
const TEST_AGENT = 'test-agent-worktree'
const WORKTREE_PATH = path.join(os.homedir(), '.workroom', 'worktrees', TEST_AGENT)

afterEach(() => {
  try { execSync(`git -C ${REPO_PATH} worktree remove --force ${WORKTREE_PATH}`, { stdio: 'pipe' }) } catch {}
  try { execSync(`git -C ${REPO_PATH} branch -D workroom-${TEST_AGENT}`, { stdio: 'pipe' }) } catch {}
  try { fs.rmSync(WORKTREE_PATH, { recursive: true, force: true }) } catch {}
})

describe('ensureWorktree', () => {
  it('creates a real git worktree (not a plain dir)', () => {
    ensureWorktree(TEST_AGENT, REPO_PATH)
    expect(fs.existsSync(path.join(WORKTREE_PATH, '.git'))).toBe(true)
  })

  it('is idempotent — calling twice does not throw', () => {
    ensureWorktree(TEST_AGENT, REPO_PATH)
    expect(() => ensureWorktree(TEST_AGENT, REPO_PATH)).not.toThrow()
  })

  it('creates branch named workroom-<agentId>', () => {
    ensureWorktree(TEST_AGENT, REPO_PATH)
    const branches = execSync(`git -C ${REPO_PATH} branch`, { encoding: 'utf8' })
    expect(branches).toContain(`workroom-${TEST_AGENT}`)
  })
})

describe('removeWorktree', () => {
  it('removes the worktree directory and branch', () => {
    ensureWorktree(TEST_AGENT, REPO_PATH)
    removeWorktree(TEST_AGENT, REPO_PATH)
    expect(fs.existsSync(WORKTREE_PATH)).toBe(false)
    const branches = execSync(`git -C ${REPO_PATH} branch`, { encoding: 'utf8' })
    expect(branches).not.toContain(`workroom-${TEST_AGENT}`)
  })
})

describe('getWorktreePath', () => {
  it('returns path containing agentId', () => {
    expect(getWorktreePath('coder')).toContain('coder')
  })
})
