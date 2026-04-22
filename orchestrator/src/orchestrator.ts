import Database from 'better-sqlite3'
import { getAllAgents, updateZone, deltaMood, logEvent, getAgent, logResult } from './db/queries'
import { AgentRunner } from './agentRunner'
import { parseStreamLine, parsedToBubble } from './parser'
import { ensureWorktree } from './worktree'
import { pickChaosEvent } from './dramaEngine'
import { generateReaction } from './haiku'
import type { AgentState, Zone, WsMessage, UiCommand, AgentStatus } from '../../src/types'
import path from 'path'

const REPO_PATH = path.resolve(__dirname, '../../')

type Broadcast = (msg: WsMessage) => void

export class Orchestrator {
  dramaLevel = 25
  private broadcast: Broadcast = () => {}
  private runners = new Map<string, AgentRunner>()

  constructor(private db: Database.Database) {}

  setBroadcast(fn: Broadcast) { this.broadcast = fn }

  private buildAgentState(agentId: string, status: AgentStatus = 'idle'): AgentState | null {
    const a = getAgent(this.db, agentId)
    if (!a) return null
    return {
      id: a.id, name: a.name, sprite: a.sprite,
      mood: a.mood, zone: a.zone as Zone,
      status, bubble: null, progress: 0,
    }
  }

  getState() {
    const agents = getAllAgents(this.db).map(a => ({
      id: a.id, name: a.name, sprite: a.sprite,
      mood: a.mood, zone: a.zone as Zone,
      status: (this.runners.has(a.id) ? 'working' : 'idle') as AgentStatus,
      bubble: null, progress: 0,
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
        this.fireChaos()
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

  private async fireChaos() {
    const agents = getAllAgents(this.db)
    const event = pickChaosEvent(agents)

    logEvent(this.db, { type: 'chaos_event', agent: 'system', payload: { eventId: event.id } })

    this.broadcast({ type: 'drama_event', eventName: event.id, agentId: event.affectedAgents[0], description: event.description })
    this.broadcast({ type: 'feed_entry', entry: {
      id: `chaos-${Date.now()}`, agentId: 'system', color: '#e04040',
      message: `🎲 ${event.description}`, timestamp: Date.now(),
    }})

    for (const agentId of event.affectedAgents) {
      const delta = event.moodDeltas[agentId] ?? 0
      const newMood = deltaMood(this.db, agentId, delta)
      this.broadcast({ type: 'mood_changed', agentId, mood: newMood })

      if (event.zone) {
        updateZone(this.db, agentId, event.zone)
        this.broadcast({ type: 'zone_changed', agentId, zone: event.zone as Zone })
      }

      const agent = getAgent(this.db, agentId)
      if (agent && this.dramaLevel >= 20) {
        const reaction = await generateReaction({
          name: agent.name, trait: agent.personality,
          mood: newMood, dramaLevel: this.dramaLevel,
          event: event.description,
        })
        this.broadcast({ type: 'bubble', agentId, text: reaction, durationMs: 10000 })
        this.broadcast({ type: 'feed_entry', entry: {
          id: `react-${Date.now()}-${agentId}`, agentId, color: agentColor(agentId),
          message: reaction, timestamp: Date.now(),
        }})
      }
    }
  }

  private assignTask(agentId: string, task: string): string {
    if (!task) return ''

    // Reject if agent is already working
    if (this.runners.has(agentId)) {
      this.broadcast({ type: 'agent_busy', agentId })
      return ''
    }

    const taskId = `${agentId}-${Date.now()}`
    let worktreePath: string
    try {
      worktreePath = ensureWorktree(agentId, REPO_PATH)
    } catch (err) {
      this.broadcast({ type: 'feed_entry', entry: {
        id: taskId, agentId, color: agentColor(agentId),
        message: `error: worktree setup failed — ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      }})
      return ''
    }
    logEvent(this.db, { type: 'task_assigned', agent: agentId, payload: { task, taskId } })

    updateZone(this.db, agentId, 'work_area')
    const workingAgent = this.buildAgentState(agentId, 'working')
    if (workingAgent) this.broadcast({ type: 'agent_updated', agent: workingAgent })

    this.broadcast({ type: 'feed_entry', entry: {
      id: taskId, agentId, color: agentColor(agentId),
      message: `→ ${task}`, timestamp: Date.now(),
    }})

    const runner = new AgentRunner(agentId, worktreePath, (event) => {
      if (event.type === 'line') {
        const parsed = parseStreamLine(event.raw)
        if (!parsed) return
        const bubble = parsedToBubble(parsed)
        if (bubble) {
          this.broadcast({ type: 'bubble', agentId, text: bubble, durationMs: 10000 })
          this.broadcast({ type: 'feed_entry', entry: {
            id: `${Date.now()}-${Math.random()}`, agentId, color: agentColor(agentId),
            message: bubble, timestamp: Date.now(),
          }})
        }
      }

      if (event.type === 'complete') {
        deltaMood(this.db, agentId, +10)
        this.runners.delete(agentId)
        updateZone(this.db, agentId, 'lounge')
        const idleAgent = this.buildAgentState(agentId, 'idle')
        if (idleAgent) this.broadcast({ type: 'agent_updated', agent: idleAgent })

        const resultText = event.result && event.result !== 'done' ? event.result : 'task complete ✓'
        logResult(this.db, agentId, taskId, resultText)
        this.broadcast({ type: 'task_result', agentId, result: resultText, taskId })
        this.broadcast({ type: 'feed_entry', entry: {
          id: `${Date.now()}-${Math.random()}`, agentId, color: agentColor(agentId),
          message: resultText.slice(0, 200), // feed tiles are display-only; full result is in task_result
          timestamp: Date.now(),
        }})
      }

      if (event.type === 'error') {
        deltaMood(this.db, agentId, -10)
        this.runners.delete(agentId)
        const idleAgent = this.buildAgentState(agentId, 'idle')
        if (idleAgent) this.broadcast({ type: 'agent_updated', agent: idleAgent })
        this.broadcast({ type: 'feed_entry', entry: {
          id: `${Date.now()}-${Math.random()}`, agentId, color: agentColor(agentId),
          message: `error: ${event.message}`, timestamp: Date.now(),
        }})
      }
    })

    this.runners.set(agentId, runner)
    runner.spawn(task)
    return taskId
  }
}

const DYNAMIC_PALETTE = ['#ff9f7f', '#7fffcf', '#ff7fbf', '#cfff7f', '#7fcfff', '#ffcf7f', '#bf7fff', '#40e0d0']

function hashCode(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + (c.codePointAt(0) ?? 0)) | 0
  return Math.abs(h)
}

export function agentColor(id: string): string {
  const known: Record<string, string> = {
    coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff',
  }
  return known[id] ?? DYNAMIC_PALETTE[hashCode(id) % DYNAMIC_PALETTE.length]
}
