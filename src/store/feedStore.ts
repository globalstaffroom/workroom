import { create } from 'zustand'
import type { FeedEntry } from '../types'

interface FeedStore {
  entries: FeedEntry[]
  addEntry: (entry: FeedEntry) => void
  clear: () => void
}

export const useFeedStore = create<FeedStore>((set) => ({
  entries: [],
  addEntry: (entry) =>
    set(s => ({ entries: [entry, ...s.entries].slice(0, 200) })),
  clear: () => set({ entries: [] }),
}))
