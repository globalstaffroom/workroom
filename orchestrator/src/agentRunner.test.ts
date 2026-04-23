import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import { AgentRunner } from './agentRunner'

// ── spawn mock ────────────────────────────────────────────────────────────────
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>()
  return { ...actual, spawn: vi.fn() }
})

import { spawn } from 'child_process'

function makeFakeProcess() {
  const stdout = new EventEmitter()
  const stderr = new EventEmitter()
  const proc = new EventEmitter() as any
  proc.stdout = stdout
  proc.stderr = stderr
  proc.kill = vi.fn()
  return proc
}

function makeRunner(agentId = 'coder') {
  const events: any[] = []
  const runner = new AgentRunner(agentId, '/tmp/fake-worktree', (e) => events.push(e))
  return { runner, events }
}

// ── original tests ─────────────────────────────────────────────────────────────
describe('AgentRunner', () => {
  it('builds correct claude command args', () => {
    const runner = new AgentRunner('coder', '/tmp/test-worktree', vi.fn())
    const args = runner.buildArgs('fix auth.ts')
    expect(args).toContain('--output-format')
    expect(args).toContain('stream-json')
    expect(args).toContain('--print')
    expect(args.join(' ')).toContain('fix auth.ts')
  })

  it('isRunning is false before spawn', () => {
    const runner = new AgentRunner('coder', '/tmp/test-worktree', vi.fn())
    expect(runner.isRunning).toBe(false)
  })
})

// ── spawn lifecycle tests ─────────────────────────────────────────────────────
describe('AgentRunner spawn lifecycle', () => {
  let proc: ReturnType<typeof makeFakeProcess>

  beforeEach(() => {
    proc = makeFakeProcess()
    vi.mocked(spawn).mockReset()
    vi.mocked(spawn).mockReturnValue(proc)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('exit code 0 emits complete with parsed lastResult', () => {
    const { runner, events } = makeRunner()
    runner.spawn('task')
    proc.stdout.emit('data', Buffer.from('{"type":"result","subtype":"success","result":"the answer"}\n'))
    proc.emit('close', 0)
    expect(events).toContainEqual(expect.objectContaining({ type: 'complete', result: 'the answer' }))
  })

  it('exit code 0 with no result line emits complete with "done"', () => {
    const { runner, events } = makeRunner()
    runner.spawn('task')
    proc.emit('close', 0)
    expect(events).toContainEqual(expect.objectContaining({ type: 'complete', result: 'done' }))
  })

  it('non-zero exit code emits error', () => {
    const { runner, events } = makeRunner()
    runner.spawn('task')
    proc.emit('close', 1)
    expect(events).toContainEqual(expect.objectContaining({ type: 'error', message: 'exited with code 1' }))
  })

  it('process error event emits error — settled flag prevents double-emit on close', () => {
    const { runner, events } = makeRunner()
    runner.spawn('task')
    proc.emit('error', new Error('ENOENT spawn error'))
    proc.emit('close', null)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    expect(events[0].message).toContain('spawn error')
  })

  it('watchdog timeout fires and subsequent close does not double-emit', () => {
    vi.useFakeTimers()
    const { runner, events } = makeRunner()
    runner.spawn('task')
    vi.advanceTimersByTime(5 * 60 * 1000 + 1)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    expect(events[0].message).toContain('timed out')
    proc.emit('close', 0)
    expect(events).toHaveLength(1)
  })

  it('kill() on live process: sets killed, emits complete not error, calls SIGTERM', () => {
    const { runner, events } = makeRunner()
    runner.spawn('task')
    runner.kill()
    proc.emit('close', null)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'complete', result: 'cancelled' })
    expect(proc.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('kill() on idle runner does not set killed flag', () => {
    const { runner } = makeRunner()
    runner.kill()
    expect((runner as any).killed).toBe(false)
  })

  it('double spawn call is ignored while already running', () => {
    const { runner } = makeRunner()
    runner.spawn('task1')
    runner.spawn('task2')
    expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1)
  })
})
