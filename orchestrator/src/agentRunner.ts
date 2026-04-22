import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import fs from 'fs'
import os from 'os'

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

    // Ensure the working directory exists
    fs.mkdirSync(this.worktreePath, { recursive: true })

    const claudeBin = findClaude()
    console.log(`[runner:${this.agentId}] spawning ${claudeBin} in ${this.worktreePath}`)

    this.isRunning = true
    this.process = spawn(claudeBin, this.buildArgs(task), {
      cwd: this.worktreePath,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let buffer = ''
    let lastResult = ''

    this.process.stdout!.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) {
          // Capture the result text from the final result line
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
      if (code === 0) {
        this.onEvent({ type: 'complete', agentId: this.agentId, result: lastResult || 'done' })
      } else {
        this.onEvent({ type: 'error', agentId: this.agentId, message: `exited with code ${code}` })
      }
    })

    this.process.on('error', (err) => {
      this.isRunning = false
      this.process = null
      this.onEvent({ type: 'error', agentId: this.agentId, message: `spawn error: ${err.message}` })
    })
  }

  kill(): void {
    this.process?.kill('SIGTERM')
    this.isRunning = false
  }
}
