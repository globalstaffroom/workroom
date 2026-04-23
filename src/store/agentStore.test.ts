import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAgentStore } from './agentStore'
import type { AgentState } from '../types'

const mockAgent: AgentState = {
  id: 'coder', name: 'coder', sprite: '🧑‍💻',
  mood: 50, zone: 'work_area', status: 'idle', bubble: null, progress: 0,
}

beforeEach(() => useAgentStore.setState({ agents: {}, dramaLevel: 25 }))

describe('agentStore', () => {
  it('upserts agent', () => {
    useAgentStore.getState().upsertAgent(mockAgent)
    expect(useAgentStore.getState().agents['coder'].mood).toBe(50)
  })
  it('updates mood', () => {
    useAgentStore.getState().upsertAgent(mockAgent)
    useAgentStore.getState().setMood('coder', 75)
    expect(useAgentStore.getState().agents['coder'].mood).toBe(75)
  })
  it('sets bubble and clears after duration', async () => {
    useAgentStore.getState().upsertAgent(mockAgent)
    useAgentStore.getState().setBubble('coder', 'hello', 100)
    expect(useAgentStore.getState().agents['coder'].bubble).toBe('hello')
    await new Promise(r => setTimeout(r, 150))
    expect(useAgentStore.getState().agents['coder'].bubble).toBeNull()
  })

  it('setMood is no-op for unknown agent', () => {
    const before = useAgentStore.getState().agents
    useAgentStore.getState().setMood('ghost', 99)
    expect(useAgentStore.getState().agents).toEqual(before)
  })

  it('setZone is no-op for unknown agent', () => {
    const before = useAgentStore.getState().agents
    useAgentStore.getState().setZone('ghost', 'lounge')
    expect(useAgentStore.getState().agents).toEqual(before)
  })

  it('setBubble is no-op for unknown agent', () => {
    const before = useAgentStore.getState().agents
    useAgentStore.getState().setBubble('ghost', 'text', 100)
    expect(useAgentStore.getState().agents).toEqual(before)
  })

  it('upsertAgent merges fields', () => {
    const agent: AgentState = { id: 'coder', name: 'Coder', sprite: '💻', mood: 80, zone: 'lounge', status: 'idle', bubble: null, progress: 0 }
    useAgentStore.getState().upsertAgent(agent)
    useAgentStore.getState().upsertAgent({ ...agent, mood: 50 })
    const stored = useAgentStore.getState().agents['coder']
    expect(stored.mood).toBe(50)
    expect(stored.name).toBe('Coder')
  })

  it('setBubble cancels previous timer', async () => {
    vi.useFakeTimers()
    const agent: AgentState = { id: 'coder', name: 'C', sprite: '💻', mood: 80, zone: 'lounge', status: 'idle', bubble: null, progress: 0 }
    useAgentStore.getState().upsertAgent(agent)
    useAgentStore.getState().setBubble('coder', 'first', 100)
    useAgentStore.getState().setBubble('coder', 'second', 500)
    vi.advanceTimersByTime(200)
    expect(useAgentStore.getState().agents['coder'].bubble).toBe('second')
    vi.advanceTimersByTime(400)
    expect(useAgentStore.getState().agents['coder'].bubble).toBeNull()
    vi.useRealTimers()
  })
})
