import Anthropic from '@anthropic-ai/sdk'
import { buildReactionPrompt, type ReactionContext } from './personality'

export type { ReactionContext }

export async function generateReaction(ctx: ReactionContext): Promise<string> {
  const client = new Anthropic() // reads ANTHROPIC_API_KEY from env
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: buildReactionPrompt(ctx),
      }],
    })
    const block = response.content[0]
    if (block?.type === 'text' && block.text.trim()) {
      return block.text.trim()
    }
    return '...'
  } catch (err) {
    console.error('[haiku] reaction failed:', err)
    return '...'
  }
}
