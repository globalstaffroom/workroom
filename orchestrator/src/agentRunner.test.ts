import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentRunner } from './agentRunner'

describe('AgentRunner', () => {
  it('builds correct claude command args', () => {
    const runner = new AgentRunner('coder', '/tmp/test-worktree', vi.fn())
    const args = runner.buildArgs('fix auth.ts')
    expect(args).toContain('--output-format')
    expect(args).toContain('stream-json')
    expect(args).toContain('--print')
    expect(args.join(' ')).toContain('fix auth.ts')
  })

  it('isRunning is false before spawn', () => {
    const runner = new AgentRunner('coder', '/tmp/test-worktree', vi.fn())
    expect(runner.isRunning).toBe(false)
  })
})
