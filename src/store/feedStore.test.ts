import { describe, it, expect, beforeEach } from 'vitest'
import { useFeedStore } from './feedStore'
import type { FeedEntry } from '../types'

const makeEntry = (id: string): FeedEntry => ({
  id, agentId: 'coder', message: 'msg', timestamp: Date.now(), color: '#fff'
})

describe('feedStore', () => {
  beforeEach(() => { useFeedStore.getState().clear() })

  it('addEntry prepends', () => {
    useFeedStore.getState().addEntry(makeEntry('a'))
    useFeedStore.getState().addEntry(makeEntry('b'))
    expect(useFeedStore.getState().entries[0].id).toBe('b')
  })

  it('caps at 200 entries', () => {
    for (let i = 0; i < 205; i++) useFeedStore.getState().addEntry(makeEntry(String(i)))
    expect(useFeedStore.getState().entries.length).toBe(200)
  })

  it('clear empties entries', () => {
    useFeedStore.getState().addEntry(makeEntry('x'))
    useFeedStore.getState().clear()
    expect(useFeedStore.getState().entries.length).toBe(0)
  })
})
