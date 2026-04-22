import { describe, it, expect, beforeEach } from 'vitest'
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
})
