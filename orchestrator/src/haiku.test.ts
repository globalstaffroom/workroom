import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateReaction } from './haiku'

// Shared mock function so tests can override it
const mockCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'Classic. Same bug, different day.' }]
})

// Mock the Anthropic SDK so tests don't make real API calls
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  }
}))

describe('generateReaction', () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Classic. Same bug, different day.' }]
    })
  })

  it('returns a non-empty string', async () => {
    const reaction = await generateReaction({
      name: 'tester', trait: 'Pedantic.', mood: 30, dramaLevel: 50,
      event: 'coder pushed broken auth again',
    })
    expect(typeof reaction).toBe('string')
    expect(reaction.length).toBeGreaterThan(0)
  })

  it('returns fallback on empty content', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    ;(Anthropic.prototype as any).messages = {
      create: vi.fn().mockResolvedValue({ content: [] })
    }
    mockCreate.mockResolvedValue({ content: [] })
    const reaction = await generateReaction({
      name: 'coder', trait: 'Overconfident.', mood: 70, dramaLevel: 25,
      event: 'test passed',
    })
    expect(reaction).toBe('...')
  })
})
