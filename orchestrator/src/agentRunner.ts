import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import fs from 'fs'
import os from 'os'

const TASK_TIMEOUT_MS = 5 * 60 * 1000

function findClaude(): string {
  const home = os.homedir()
  const candidates = [
    `${home}/.local/bin/claude`,
    `${home}/.nvm/versions/node/current/bin/claude`,
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return 'claude'
}

export type RunnerEvent =
  | { type: 'line';     agentId: string; raw: string }
  | { type: 'complete'; agentId: string; result: string }
  | { type: 'error';    agentId: string; message: string }

type OnEvent = (event: RunnerEvent) => void

export class AgentRunner extends EventEmitter {
  private process: ChildProcess | null = null
  private watchdog: ReturnType<typeof setTimeout> | null = null
  private killed = false
  isRunning = false

  constructor(
    public readonly agentId: string,
    private readonly worktreePath: string,
    public readonly onEvent: OnEvent,
  ) {
    super()
  }

  buildArgs(task: string): string[] {
    return [
      '--output-format', 'stream-json',
      '--verbose',
      '--print',
      task,
    ]
  }

  spawn(task: string): void {
    if (this.isRunning) {
      console.warn(`[runner:${this.agentId}] already running`)
      return
    }

    fs.mkdirSync(this.worktreePath, { recursive: true })

    const claudeBin = findClaude()
    console.log(`[runner:${this.agentId}] spawning ${claudeBin} in ${this.worktreePath}`)

    this.isRunning = true
    this.killed = false
    this.process = spawn(claudeBin, this.buildArgs(task), {
      cwd: this.worktreePath,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let settled = false
    const settle = (ev: RunnerEvent) => {
      if (settled) return
      settled = true
      if (this.watchdog) { clearTimeout(this.watchdog); this.watchdog = null }
      this.onEvent(ev)
    }

    this.watchdog = setTimeout(() => {
      console.warn(`[runner:${this.agentId}] task timeout after 5 minutes`)
      settle({ type: 'error', agentId: this.agentId, message: 'task timed out after 5 minutes' })
      this.process?.kill('SIGTERM')
    }, TASK_TIMEOUT_MS)

    let buffer = ''
    let lastResult = ''

    this.process.stdout!.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.type === 'result' && parsed.subtype === 'success' && typeof parsed.result === 'string') {
              lastResult = parsed.result
            }
          } catch { /* ignore */ }
          this.onEvent({ type: 'line', agentId: this.agentId, raw: line })
        }
      }
    })

    this.process.stderr!.on('data', (chunk: Buffer) => {
      console.error(`[runner:${this.agentId}] stderr:`, chunk.toString())
    })

    this.process.on('close', (code) => {
      this.isRunning = false
      this.process = null
      if (this.killed) {
        settle({ type: 'complete', agentId: this.agentId, result: 'cancelled' })
      } else if (code === 0) {
        settle({ type: 'complete', agentId: this.agentId, result: lastResult || 'done' })
      } else {
        settle({ type: 'error', agentId: this.agentId, message: `exited with code ${code}` })
      }
    })

    this.process.on('error', (err) => {
      this.isRunning = false
      this.process = null
      settle({ type: 'error', agentId: this.agentId, message: `spawn error: ${err.message}` })
    })
  }

  kill(): void {
    this.killed = true
    this.process?.kill('SIGTERM')
    this.isRunning = false
  }
}
