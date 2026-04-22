import Database from 'better-sqlite3'
import { getAllAgents, updateZone, deltaMood, logEvent } from './db/queries'
import type { AgentState, Zone, WsMessage, UiCommand } from '../../src/types'

type Broadcast = (msg: WsMessage) => void

export class Orchestrator {
  dramaLevel = 25
  private broadcast: Broadcast = () => {}

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

  private assignTask(agentId: string, task: string) {
    if (!task) return
    logEvent(this.db, { type: 'task_assigned', agent: agentId, payload: { task } })
    this.broadcast({ type: 'feed_entry', entry: {
      id: `${Date.now()}`, agentId, color: agentColor(agentId),
      message: `→ ${task}`, timestamp: Date.now(),
    }})
    // Agent runner integration added in Task 11
  }
}

export function agentColor(id: string): string {
  return ({ coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff' } as Record<string, string>)[id] ?? '#888'
}
