import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema } from './db/schema'
import { Orchestrator } from './orchestrator'
import { getAgent } from './db/queries'
import { getWorktreePath } from './worktree'
import { setContext, getContext } from './db/queries'

// Class-level mock so `new AgentRunner(...)` works in orchestrator.ts
vi.mock('./agentRunner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./agentRunner')>()
  class MockAgentRunner {
    agentId: string
    worktreePath: string
    onEvent: any
    isRunning = false
    spawn = vi.fn()
    kill = vi.fn()
    constructor(agentId: string, worktreePath: string, onEvent: any) {
      this.agentId = agentId
      this.worktreePath = worktreePath
      this.onEvent = onEvent
    }
  }
  return { ...actual, AgentRunner: MockAgentRunner }
})

let db: Database.Database
let orch: Orchestrator
let broadcasts: any[]

beforeEach(() => {
  db = new Database(':memory:')
  applySchema(db)
  orch = new Orchestrator(db)
  broadcasts = []
  orch.setBroadcast((msg) => broadcasts.push(msg))
})

afterEach(() => {
  vi.restoreAllMocks()
  db.close()
})

// ── original tests ────────────────────────────────────────────────────────────
describe('Orchestrator.getState', () => {
  it('returns all 4 seeded agents', () => {
    const state = orch.getState()
    expect(state.agents).toHaveLength(4)
    expect(state.agents.map(a => a.id)).toContain('coder')
  })
})

describe('Orchestrator.setDrama', () => {
  it('clamps drama to 0-100', () => {
    orch.setDrama(150)
    expect(orch.dramaLevel).toBe(100)
    orch.setDrama(-10)
    expect(orch.dramaLevel).toBe(0)
  })
})

describe('getWorktreePath', () => {
  it('returns a path containing the agentId', () => {
    expect(getWorktreePath('coder')).toContain('coder')
  })
})

describe('context handoff', () => {
  it('context written by one agent is readable', () => {
    setContext(db, 'last_task_summary', 'refactored auth.ts, JWT in middleware', 'coder')
    const ctx = getContext(db)
    expect(ctx['last_task_summary']).toContain('JWT')
  })
})

describe('assignTask — busy agent rejection', () => {
  it('broadcasts agent_busy when agent already has a runner', () => {
    ;(orch as any).runners.set('coder', { kill: vi.fn(), isRunning: true, spawn: vi.fn() })
    orch.handleCommand({ type: 'assign_task', agentId: 'coder', task: 'do something' })
    expect(broadcasts).toContainEqual(expect.objectContaining({ type: 'agent_busy', agentId: 'coder' }))
  })

  it('does not kill the existing runner on busy', () => {
    const killFn = vi.fn()
    ;(orch as any).runners.set('coder', { kill: killFn, isRunning: true, spawn: vi.fn() })
    orch.handleCommand({ type: 'assign_task', agentId: 'coder', task: 'do something' })
    expect(killFn).not.toHaveBeenCalled()
  })
})

describe('assignTask — task_result emission', () => {
  it('assignTask returns a taskId string', async () => {
    vi.spyOn(await import('./worktree'), 'ensureWorktree').mockReturnValue('/tmp/fake-search-worktree')
    const taskId = (orch as any).assignTask('search', 'say hi')
    expect(typeof taskId).toBe('string')
    expect(taskId).toContain('search')
  })
})

describe('create_agent command', () => {
  it('inserts the agent and broadcasts agent_updated', () => {
    orch.handleCommand({ type: 'create_agent', id: 'debugger', sprite: '🐛', personality: 'meticulous' })
    const broadcast = broadcasts.find(m => m.type === 'agent_updated')
    expect(broadcast).toBeDefined()
    expect(broadcast.agent.id).toBe('debugger')
    expect(broadcast.agent.zone).toBe('lounge')
    expect(broadcast.agent.status).toBe('idle')
  })

  it('is idempotent — calling twice does not throw', () => {
    orch.handleCommand({ type: 'create_agent', id: 'debugger', sprite: '🐛', personality: 'meticulous' })
    expect(() =>
      orch.handleCommand({ type: 'create_agent', id: 'debugger', sprite: '🐛', personality: 'meticulous' })
    ).not.toThrow()
  })

  it('does not broadcast for empty id', () => {
    orch.handleCommand({ type: 'create_agent', id: '', sprite: '🐛', personality: 'meticulous' })
    expect(broadcasts.find((m: any) => m.type === 'agent_updated')).toBeUndefined()
  })
})

// ── new tests ─────────────────────────────────────────────────────────────────
describe('hireAgent — id validation', () => {
  it('rejects id with spaces — no DB insert, no broadcast', () => {
    orch.handleCommand({ type: 'create_agent', id: 'my agent', sprite: '🐛', personality: 'x' })
    expect(getAgent(db, 'my agent')).toBeUndefined()
    expect(broadcasts.find(m => m.type === 'agent_updated')).toBeUndefined()
  })

  it('rejects id with path traversal', () => {
    orch.handleCommand({ type: 'create_agent', id: '../evil', sprite: '🐛', personality: 'x' })
    expect(getAgent(db, '../evil')).toBeUndefined()
  })

  it('rejects id with dot', () => {
    orch.handleCommand({ type: 'create_agent', id: 'a.b', sprite: '🐛', personality: 'x' })
    expect(getAgent(db, 'a.b')).toBeUndefined()
  })
})

describe('assignTask — empty task', () => {
  it('returns early with no broadcasts', () => {
    orch.handleCommand({ type: 'assign_task', agentId: 'coder', task: '' })
    expect(broadcasts).toHaveLength(0)
  })
})

describe('get_state command', () => {
  it('broadcasts init with agent list', () => {
    orch.handleCommand({ type: 'get_state' })
    const init = broadcasts.find(m => m.type === 'init')
    expect(init).toBeDefined()
    expect(Array.isArray(init.agents)).toBe(true)
    expect(init.agents.length).toBeGreaterThan(0)
  })
})

describe('getState — working status', () => {
  it('returns working status for agents with active runners', () => {
    ;(orch as any).runners.set('coder', { kill: vi.fn(), isRunning: true, spawn: vi.fn() })
    const state = orch.getState()
    const coder = state.agents.find(a => a.id === 'coder')
    expect(coder?.status).toBe('working')
  })

  it('returns idle status for agents with no runner', () => {
    const state = orch.getState()
    const coder = state.agents.find(a => a.id === 'coder')
    expect(coder?.status).toBe('idle')
  })
})

describe('assignTask — worktree failure', () => {
  it('broadcasts feed_entry error and does not register runner', async () => {
    vi.spyOn(await import('./worktree'), 'ensureWorktree').mockImplementation(() => {
      throw new Error('git not found')
    })
    orch.handleCommand({ type: 'assign_task', agentId: 'coder', task: 'do work' })
    const errorEntry = broadcasts.find(m => m.type === 'feed_entry' && m.entry.message.includes('worktree'))
    expect(errorEntry).toBeDefined()
    expect((orch as any).runners.has('coder')).toBe(false)
  })
})

describe('assignTask — runner callbacks', () => {
  beforeEach(async () => {
    vi.spyOn(await import('./worktree'), 'ensureWorktree').mockReturnValue('/tmp/fake')
  })

  it('complete callback: broadcasts task_result, updates zone to lounge, removes runner', () => {
    orch.handleCommand({ type: 'assign_task', agentId: 'coder', task: 'work' })
    const runner = (orch as any).runners.get('coder') as any
    expect(runner).toBeDefined()

    runner.onEvent({ type: 'complete', agentId: 'coder', result: 'done well' })

    expect(broadcasts).toContainEqual(expect.objectContaining({ type: 'task_result', agentId: 'coder', result: 'done well' }))
    expect(broadcasts).toContainEqual(expect.objectContaining({
      type: 'agent_updated', agent: expect.objectContaining({ zone: 'lounge' }),
    }))
    expect((orch as any).runners.has('coder')).toBe(false)
  })

  it('error callback: broadcasts feed_entry error, moves agent to lounge, removes runner', () => {
    orch.handleCommand({ type: 'assign_task', agentId: 'coder', task: 'work' })
    const runner = (orch as any).runners.get('coder') as any
    runner.onEvent({ type: 'error', agentId: 'coder', message: 'something broke' })

    const errEntry = broadcasts.find(m => m.type === 'feed_entry' && m.entry.message.includes('something broke'))
    expect(errEntry).toBeDefined()
    expect(broadcasts).toContainEqual(expect.objectContaining({
      type: 'agent_updated', agent: expect.objectContaining({ zone: 'lounge' }),
    }))
    expect((orch as any).runners.has('coder')).toBe(false)
  })
})
