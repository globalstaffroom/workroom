import { create } from 'zustand'
import type { AgentState, Zone } from '../types'

interface AgentStore {
  agents: Record<string, AgentState>
  dramaLevel: number
  upsertAgent: (agent: AgentState) => void
  setMood: (id: string, mood: number) => void
  setZone: (id: string, zone: Zone) => void
  setBubble: (id: string, text: string, durationMs: number) => void
  setProgress: (id: string, progress: number) => void
  setDrama: (level: number) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: {},
  dramaLevel: 25,

  upsertAgent: (agent) =>
    set(s => ({ agents: { ...s.agents, [agent.id]: { ...s.agents[agent.id], ...agent } } })),

  setMood: (id, mood) =>
    set(s => ({ agents: { ...s.agents, [id]: { ...s.agents[id], mood } } })),

  setZone: (id, zone) =>
    set(s => ({ agents: { ...s.agents, [id]: { ...s.agents[id], zone } } })),

  setBubble: (id, text, durationMs) => {
    set(s => ({ agents: { ...s.agents, [id]: { ...s.agents[id], bubble: text } } }))
    setTimeout(() => {
      set(s => ({ agents: { ...s.agents, [id]: { ...s.agents[id], bubble: null } } }))
    }, durationMs)
  },

  setProgress: (id, progress) =>
    set(s => ({ agents: { ...s.agents, [id]: { ...s.agents[id], progress } } })),

  setDrama: (level) => set({ dramaLevel: level }),
}))
