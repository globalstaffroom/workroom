import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import { applySchema } from './schema'
import {
  getAgent, updateMood, logEvent, getRecentEvents, createAgent, getAllAgents,
  logResult, getRelationship, deltaMood, deltaTension,
} from './queries'

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
    const debuggers = getAllAgents(db).filter(a => a.id === 'debugger')
    expect(debuggers).toHaveLength(1)
  })

  it('uses id as name', () => {
    createAgent(db, 'debugger', '🐛', 'meticulous')
    expect(getAgent(db, 'debugger')!.name).toBe('debugger')
  })

  it('throws on empty id', () => {
    expect(() => createAgent(db, '', '🐛', 'trait')).toThrow('id must not be empty')
  })

  it('throws on whitespace-only id', () => {
    expect(() => createAgent(db, '   ', '🐛', 'trait')).toThrow('id must not be empty')
  })
})

describe('logResult', () => {
  it('writes to events table', () => {
    logResult(db, 'coder', 'task-1', 'the answer')
    const events = getRecentEvents(db, 1)
    expect(events[0].type).toBe('task_result')
    expect((events[0].payload as any).result).toBe('the answer')
    expect((events[0].payload as any).taskId).toBe('task-1')
  })

  it('does not throw when file write fails', () => {
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => { throw new Error('ENOSPC') })
    expect(() => logResult(db, 'coder', 'task-2', 'result')).not.toThrow()
    vi.restoreAllMocks()
  })
})

describe('getRelationship', () => {
  it('creates row with defaults on first call', () => {
    const rel = getRelationship(db, 'coder', 'tester')
    expect(rel.trust).toBe(50)
    expect(rel.tension).toBe(0)
    expect(rel.history_count).toBe(0)
  })

  it('is symmetric — reversed args return same canonical row', () => {
    const a = getRelationship(db, 'coder', 'tester')
    const b = getRelationship(db, 'tester', 'coder')
    expect(a.agent_a).toBe(b.agent_a)
    expect(a.agent_b).toBe(b.agent_b)
  })

  it('second call returns actual DB row, not hardcoded defaults', () => {
    getRelationship(db, 'coder', 'tester')
    db.prepare('UPDATE relationships SET trust = 99 WHERE agent_a = ? AND agent_b = ?')
      .run('coder', 'tester')
    const rel = getRelationship(db, 'coder', 'tester')
    expect(rel.trust).toBe(99)
  })
})

describe('deltaMood', () => {
  it('returns 50 sentinel for unknown agent', () => {
    expect(deltaMood(db, 'ghost', 10)).toBe(50)
  })

  it('applies delta and clamps', () => {
    const result = deltaMood(db, 'coder', 60)
    expect(result).toBe(100)
    expect(getAgent(db, 'coder')!.mood).toBe(100)
  })
})

describe('deltaTension', () => {
  beforeEach(() => {
    // Seed a relationship
    getRelationship(db, 'coder', 'tester')
  })

  it('increments tension', () => {
    deltaTension(db, 'coder', 'tester', 10)
    const rel = getRelationship(db, 'coder', 'tester')
    expect(rel.tension).toBe(10)
  })

  it('clamps at 100', () => {
    deltaTension(db, 'coder', 'tester', 200)
    const rel = getRelationship(db, 'coder', 'tester')
    expect(rel.tension).toBe(100)
  })

  it('clamps at 0', () => {
    deltaTension(db, 'coder', 'tester', 10)
    deltaTension(db, 'coder', 'tester', -50)
    const rel = getRelationship(db, 'coder', 'tester')
    expect(rel.tension).toBe(0)
  })

  it('increments history_count on each call', () => {
    deltaTension(db, 'coder', 'tester', 5)
    deltaTension(db, 'coder', 'tester', 5)
    const rel = getRelationship(db, 'coder', 'tester')
    expect(rel.history_count).toBe(2)
  })
})
