import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

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
    private readonly onEvent: OnEvent,
  ) {
    super()
  }

  buildArgs(task: string): string[] {
    return [
      '--output-format', 'stream-json',
      '--print',
      task,
    ]
  }

  spawn(task: string): void {
    if (this.isRunning) {
      console.warn(`[runner:${this.agentId}] already running`)
      return
    }

    this.isRunning = true
    this.process = spawn('claude', this.buildArgs(task), {
      cwd: this.worktreePath,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let buffer = ''

    this.process.stdout!.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) {
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
        this.onEvent({ type: 'complete', agentId: this.agentId, result: 'done' })
      } else {
        this.onEvent({ type: 'error', agentId: this.agentId, message: `exited with code ${code}` })
      }
    })
  }

  kill(): void {
    this.process?.kill('SIGTERM')
    this.isRunning = false
  }
}
