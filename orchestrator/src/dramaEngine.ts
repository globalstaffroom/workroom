interface ChaosEvent {
  id:             string
  description:    string
  affectedAgents: string[]
  moodDeltas:     Record<string, number>
  zone?:          string
}

export const CHAOS_EVENTS: ChaosEvent[] = [
  {
    id: 'printer_jams',
    description: 'The printer jams right as review tries to print their notes.',
    affectedAgents: ['review'],
    moodDeltas: { review: -8 },
    zone: 'copy_room',
  },
  {
    id: 'stolen_coffee',
    description: 'Someone drank the wrong coffee mug. Nobody is admitting it.',
    affectedAgents: ['coder', 'tester'],
    moodDeltas: { coder: -5, tester: -3 },
  },
  {
    id: 'rogue_bug_found',
    description: 'Search found a critical bug nobody asked about. It is definitely a problem.',
    affectedAgents: ['search', 'coder'],
    moodDeltas: { search: +5, coder: -10 },
  },
  {
    id: 'passive_sticky',
    description: "A pointed sticky note appeared on the coder's monitor. Nobody signed it.",
    affectedAgents: ['coder', 'tester'],
    moodDeltas: { coder: -12, tester: +5 },
  },
  {
    id: 'rogue_refactor',
    description: 'Coder started refactoring something completely off-scope.',
    affectedAgents: ['coder', 'review'],
    moodDeltas: { review: -8 },
    zone: 'work_area',
  },
  {
    id: 'pr_rejected_again',
    description: 'Third rejection on the same PR. Coder is not taking it well.',
    affectedAgents: ['coder', 'tester', 'review'],
    moodDeltas: { coder: -20, review: -5 },
  },
  {
    id: 'distracted',
    description: 'Search went down a Wikipedia rabbit hole and returned with fascinating but useless info.',
    affectedAgents: ['search'],
    moodDeltas: { search: +8 },
    zone: 'lounge',
  },
  {
    id: 'surprise_birthday',
    description: "Surprise — it's someone's birthday. Everyone stops working for 60 seconds.",
    affectedAgents: ['coder', 'tester', 'review', 'search'],
    moodDeltas: { coder: +10, tester: +10, review: +10, search: +10 },
  },
]

interface AgentMoodSnapshot { id: string; mood: number }

export function pickChaosEvent(agents: AgentMoodSnapshot[]): ChaosEvent {
  const weights = CHAOS_EVENTS.map(event => {
    const relevantMoods = agents
      .filter(a => event.affectedAgents.includes(a.id))
      .map(a => Math.abs(a.mood - 50))
    const avgExtremity = relevantMoods.length
      ? relevantMoods.reduce((s, v) => s + v, 0) / relevantMoods.length
      : 25
    return 1 + avgExtremity / 50  // weight 1.0–2.0
  })

  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < CHAOS_EVENTS.length; i++) {
    r -= weights[i]
    if (r <= 0) return CHAOS_EVENTS[i]
  }
  return CHAOS_EVENTS[0]
}
