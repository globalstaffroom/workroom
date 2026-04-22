import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema } from './schema'
import { getAgent, updateMood, logEvent, getRecentEvents, createAgent, getAllAgents } from './queries'

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  applySchema(db)
})

afterEach(() => db.close())

describe('getAgent', () => {
  it('returns agent by id', () => {
    const agent = getAgent(db, 'coder')
    expect(agent).not.toBeNull()
    expect(agent!.name).toBe('coder')
    expect(agent!.mood).toBe(50)
  })
})

describe('updateMood', () => {
  it('clamps mood to 0-100', () => {
    updateMood(db, 'coder', 200)
    expect(getAgent(db, 'coder')!.mood).toBe(100)
    updateMood(db, 'coder', -999)
    expect(getAgent(db, 'coder')!.mood).toBe(0)
  })
})

describe('logEvent', () => {
  it('persists event and getRecentEvents returns it', () => {
    logEvent(db, { type: 'test_failed', agent: 'coder', payload: { file: 'auth.ts' } })
    const events = getRecentEvents(db, 5)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('test_failed')
  })
})

describe('createAgent', () => {
  it('inserts a new agent with correct fields', () => {
    createAgent(db, 'debugger', '🐛', 'meticulous, finds edge cases')
    const agent = getAgent(db, 'debugger')
    expect(agent).not.toBeNull()
    expect(agent!.id).toBe('debugger')
    expect(agent!.sprite).toBe('🐛')
    expect(agent!.personality).toBe('meticulous, finds edge cases')
    expect(agent!.zone).toBe('lounge')
    expect(agent!.mood).toBe(50)
  })

  it('is idempotent — calling twice does not throw or duplicate', () => {
    createAgent(db, 'debugger', '🐛', 'meticulous')
    expect(() => createAgent(db, 'debugger', '🐛', 'meticulous')).not.toThrow()
    const agents = getAllAgents(db)
    const debuggers = agents.filter(a => a.id === 'debugger')
    expect(debuggers).toHaveLength(1)
  })

  it('uses id as name', () => {
    createAgent(db, 'debugger', '🐛', 'meticulous')
    const agent = getAgent(db, 'debugger')
    expect(agent!.name).toBe('debugger')
  })
})
