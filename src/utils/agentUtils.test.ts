import { describe, it, expect } from 'vitest'
import { hashCode, agentColor, dynamicPos, DYNAMIC_PALETTE } from './agentUtils'

describe('hashCode', () => {
  it('is deterministic', () => {
    expect(hashCode('coder')).toBe(hashCode('coder'))
  })
  it('differs for different strings', () => {
    expect(hashCode('coder')).not.toBe(hashCode('tester'))
  })
  it('is non-negative', () => {
    expect(hashCode('anything')).toBeGreaterThanOrEqual(0)
  })
})

describe('agentColor', () => {
  it('returns known color for seed agents', () => {
    expect(agentColor('coder')).toBe('#58a6ff')
    expect(agentColor('tester')).toBe('#7ec850')
    expect(agentColor('review')).toBe('#f0c040')
    expect(agentColor('search')).toBe('#aa88ff')
  })
  it('returns a palette color for unknown agents', () => {
    const c = agentColor('unknown-agent')
    expect(DYNAMIC_PALETTE).toContain(c)
  })
  it('is deterministic for unknown agents', () => {
    expect(agentColor('bot')).toBe(agentColor('bot'))
  })
})

describe('dynamicPos', () => {
  it('returns coords within zone bounds for work_area', () => {
    const pos = dynamicPos('bot', 'work_area')
    expect(pos.top).toBeGreaterThanOrEqual(90)
    expect(pos.top).toBeLessThan(140)
    expect(pos.left).toBeGreaterThanOrEqual(60)
    expect(pos.left).toBeLessThan(280)
  })
  it('is deterministic', () => {
    expect(dynamicPos('bot', 'lounge')).toEqual(dynamicPos('bot', 'lounge'))
  })
  it('returns fallback for unknown zone', () => {
    const pos = dynamicPos('bot', 'unknown_zone' as any)
    expect(pos).toEqual({ top: 90, left: 60 })
  })
})
