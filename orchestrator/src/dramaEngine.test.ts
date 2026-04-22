import { describe, it, expect } from 'vitest'
import { pickChaosEvent, CHAOS_EVENTS } from './dramaEngine'

describe('CHAOS_EVENTS', () => {
  it('has at least 6 events', () => {
    expect(CHAOS_EVENTS.length).toBeGreaterThanOrEqual(6)
  })
  it('every event has id, description, affectedAgents', () => {
    for (const e of CHAOS_EVENTS) {
      expect(e.id).toBeTruthy()
      expect(e.description).toBeTruthy()
      expect(Array.isArray(e.affectedAgents)).toBe(true)
    }
  })
})

describe('pickChaosEvent', () => {
  it('returns one of the events', () => {
    const agents = [
      { id: 'coder', mood: 30 }, { id: 'tester', mood: 80 },
      { id: 'review', mood: 50 }, { id: 'search', mood: 45 },
    ]
    const event = pickChaosEvent(agents)
    expect(CHAOS_EVENTS.map(e => e.id)).toContain(event.id)
  })
})
