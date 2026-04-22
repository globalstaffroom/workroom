import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema } from './db/schema'
import { Orchestrator } from './orchestrator'

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
