import { describe, it, expect } from 'vitest'
import { buildReactionPrompt, moodLabel, moodDeltaForEvent } from './personality'

describe('moodLabel', () => {
  it('labels 0-20 as miserable', () => expect(moodLabel(10)).toBe('miserable'))
  it('labels 50 as neutral',     () => expect(moodLabel(50)).toBe('neutral'))
  it('labels 80-100 as great',   () => expect(moodLabel(90)).toBe('great'))
})

describe('moodDeltaForEvent', () => {
  it('task_complete gives +10',  () => expect(moodDeltaForEvent('task_complete')).toBe(10))
  it('pr_rejected gives -15',    () => expect(moodDeltaForEvent('pr_rejected')).toBe(-15))
  it('unknown event gives 0',    () => expect(moodDeltaForEvent('random_thing')).toBe(0))
})

describe('buildReactionPrompt', () => {
  it('includes agent name, trait, mood and event', () => {
    const prompt = buildReactionPrompt({
      name: 'tester', trait: 'Pedantic.', mood: 30, dramaLevel: 60,
      event: 'coder shipped the same bug again',
    })
    expect(prompt).toContain('tester')
    expect(prompt).toContain('Pedantic')
    expect(prompt).toContain('30')
    expect(prompt).toContain('60')
    expect(prompt).toContain('coder shipped the same bug again')
  })
})
