import { describe, it, expect } from 'vitest'
import { parseStreamLine, parsedToBubble, parsedToFeedMessage, type ParsedLine } from './parser'

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

describe('parsedToFeedMessage', () => {
  it('returns full text untruncated', () => {
    const long = 'x'.repeat(300)
    expect(parsedToFeedMessage({ kind: 'text', text: long })).toBe(long)
  })

  it('returns full tool input untruncated', () => {
    const cmd = 'npm run build && npm test && echo done'
    expect(parsedToFeedMessage({ kind: 'tool_use', tool: 'Bash', input: cmd })).toBe(`Bash: ${cmd}`)
  })

  it('returns null for complete', () => {
    expect(parsedToFeedMessage({ kind: 'complete' })).toBeNull()
  })
})

describe('parsedToBubble', () => {
  it('truncates text to 60 chars', () => {
    const result = parsedToBubble({ kind: 'text', text: 'x'.repeat(100) })
    expect(result?.length).toBe(60)
  })

  it('truncates tool input to 40 chars in bubble', () => {
    const result = parsedToBubble({ kind: 'tool_use', tool: 'Bash', input: 'x'.repeat(60) })
    expect(result).toBe(`Bash: ${'x'.repeat(40)}`)
  })
})
