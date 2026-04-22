import { describe, it, expect } from 'vitest'
import type { AgentState, FeedEntry, WsMessage } from './index'

describe('types', () => {
  it('AgentState has required fields', () => {
    const a: AgentState = { id: 'coder', name: 'coder', sprite: '🧑‍💻', mood: 50, zone: 'work_area', status: 'idle', bubble: null, progress: 0 }
    expect(a.id).toBe('coder')
  })
  it('FeedEntry has required fields', () => {
    const f: FeedEntry = { id: '1', agentId: 'coder', message: 'hello', timestamp: Date.now(), color: '#58a6ff' }
    expect(f.agentId).toBe('coder')
  })
})
