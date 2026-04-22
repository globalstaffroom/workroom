export function moodLabel(mood: number): string {
  if (mood <= 20) return 'miserable'
  if (mood <= 35) return 'grumpy'
  if (mood <= 50) return 'neutral'
  if (mood <= 65) return 'okay'
  if (mood <= 80) return 'good'
  return 'great'
}

const MOOD_DELTAS: Record<string, number> = {
  task_complete:     +10,
  pr_approved:       +8,
  positive_reaction: +8,
  bug_found_own:     -10,
  pr_rejected:       -15,
  test_failed:       -8,
  chaos_event:       -5,
}

const IDLE_DECAY_PER_10MIN = -5

export function moodDeltaForEvent(eventType: string): number {
  return MOOD_DELTAS[eventType] ?? 0
}

export function idleDecayDelta(): number {
  return IDLE_DECAY_PER_10MIN
}

export interface ReactionContext {
  name:       string
  trait:      string
  mood:       number
  dramaLevel: number
  event:      string
}

export function buildReactionPrompt(ctx: ReactionContext): string {
  return [
    `You are ${ctx.name}, a software agent on a dev team.`,
    `Your personality: ${ctx.trait}`,
    `Your current mood: ${ctx.mood}/100 (${moodLabel(ctx.mood)}).`,
    `Drama level in the office: ${ctx.dramaLevel}/100.`,
    `Something just happened: ${ctx.event}`,
    `React in ONE short sentence, in character. At low drama be brief and professional.`,
    `At high drama (above 60) be more expressive, snarky, or emotional. Never break character.`,
    `Reply with ONLY the sentence — no quotes, no preamble.`,
  ].join(' ')
}
