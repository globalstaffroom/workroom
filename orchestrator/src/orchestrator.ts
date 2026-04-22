import Database from 'better-sqlite3'
import { getAllAgents, updateZone, deltaMood, logEvent, getAgent } from './db/queries'
import { AgentRunner } from './agentRunner'
import { parseStreamLine, parsedToBubble } from './parser'
import { getWorktreePath } from './worktree'
import type { AgentState, Zone, WsMessage, UiCommand } from '../../src/types'

type Broadcast = (msg: WsMessage) => void

export class Orchestrator {
  dramaLevel = 25
  private broadcast: Broadcast = () => {}
  private runners = new Map<string, AgentRunner>()

  constructor(private db: Database.Database) {}

  setBroadcast(fn: Broadcast) { this.broadcast = fn }

  getState() {
    const agents = getAllAgents(this.db).map(a => ({
      id: a.id, name: a.name, sprite: a.sprite,
      mood: a.mood, zone: a.zone as Zone,
      status: 'idle' as const, bubble: null, progress: 0,
    }))
    return { agents }
  }

  setDrama(level: number) {
    this.dramaLevel = Math.max(0, Math.min(100, level))
  }

  handleCommand(cmd: UiCommand) {
    switch (cmd.type) {
      case 'get_state':
        this.broadcast({ type: 'init', agents: this.getState().agents })
        break
      case 'set_drama':
        this.setDrama(cmd.level)
        break
      case 'assign_task':
        this.assignTask(cmd.agentId, cmd.task)
        break
      case 'fire_chaos':
        // implemented in Task 14
        break
    }
  }

  startIdleDecay(): void {
    setInterval(() => {
      const agents = getAllAgents(this.db)
      for (const agent of agents) {
        if (!this.runners.has(agent.id)) {
          const newMood = deltaMood(this.db, agent.id, -5)
          if (newMood !== agent.mood) {
            this.broadcast({ type: 'mood_changed', agentId: agent.id, mood: newMood })
          }
        }
      }
    }, 10 * 60 * 1000)
  }

  private assignTask(agentId: string, task: string) {
    if (!task) return

    const worktreePath = getWorktreePath(agentId)
    logEvent(this.db, { type: 'task_assigned', agent: agentId, payload: { task } })

    updateZone(this.db, agentId, 'work_area')
    this.broadcast({ type: 'zone_changed', agentId, zone: 'work_area' })
    this.broadcast({ type: 'feed_entry', entry: {
      id: `${Date.now()}`, agentId, color: agentColor(agentId),
      message: `→ ${task}`, timestamp: Date.now(),
    }})

    const runner = new AgentRunner(agentId, worktreePath, (event) => {
      if (event.type === 'line') {
        const parsed = parseStreamLine(event.raw)
        if (!parsed) return

        const bubble = parsedToBubble(parsed)
        if (bubble) {
          this.broadcast({ type: 'bubble', agentId, text: bubble, durationMs: 4000 })
          this.broadcast({ type: 'feed_entry', entry: {
            id: `${Date.now()}-${Math.random()}`, agentId, color: agentColor(agentId),
            message: bubble, timestamp: Date.now(),
          }})
        }
      }

      if (event.type === 'complete') {
        deltaMood(this.db, agentId, +10)
        updateZone(this.db, agentId, 'lounge')
        this.broadcast({ type: 'zone_changed', agentId, zone: 'lounge' })
        this.broadcast({ type: 'feed_entry', entry: {
          id: `${Date.now()}`, agentId, color: agentColor(agentId),
          message: 'task complete ✓', timestamp: Date.now(),
        }})
        this.runners.delete(agentId)
      }

      if (event.type === 'error') {
        deltaMood(this.db, agentId, -10)
        this.broadcast({ type: 'feed_entry', entry: {
          id: `${Date.now()}`, agentId, color: agentColor(agentId),
          message: `error: ${event.message}`, timestamp: Date.now(),
        }})
        this.runners.delete(agentId)
      }
    })

    this.runners.set(agentId, runner)
    runner.spawn(task)
  }
}

export function agentColor(id: string): string {
  return ({ coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff' } as Record<string, string>)[id] ?? '#888'
}
