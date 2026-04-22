import { describe, it, expect } from 'vitest'
import { parseStreamLine, type ParsedLine } from './parser'

describe('parseStreamLine', () => {
  it('parses assistant text message', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Working on auth.ts' }] }
    })
    const result = parseStreamLine(line)
    expect(result?.kind).toBe('text')
    expect((result as any).text).toBe('Working on auth.ts')
  })

  it('parses tool use (Bash)', () => {
    const line = JSON.stringify({
      type: 'tool_use', name: 'Bash', input: { command: 'npm test' }
    })
    const result = parseStreamLine(line)
    expect(result?.kind).toBe('tool_use')
    expect((result as any).tool).toBe('Bash')
    expect((result as any).input).toContain('npm test')
  })

  it('parses result/completion', () => {
    const line = JSON.stringify({ type: 'result', subtype: 'success' })
    const result = parseStreamLine(line)
    expect(result?.kind).toBe('complete')
  })

  it('returns null for unknown lines', () => {
    expect(parseStreamLine('not json')).toBeNull()
    expect(parseStreamLine(JSON.stringify({ type: 'system' }))).toBeNull()
  })
})
