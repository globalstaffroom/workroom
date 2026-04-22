import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema } from './db/schema'
import { Orchestrator } from './orchestrator'
import { getWorktreePath } from './worktree'
import { setContext, getContext } from './db/queries'

let db: Database.Database
let orch: Orchestrator

beforeEach(() => {
  db = new Database(':memory:')
  applySchema(db)
  orch = new Orchestrator(db)
})

afterEach(() => db.close())

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
