export type ParsedLine =
  | { kind: 'text';     text: string }
  | { kind: 'tool_use'; tool: string; input: string }
  | { kind: 'complete'; result?: string }
  | { kind: 'error';    message: string }

export function parseStreamLine(raw: string): ParsedLine | null {
  let json: Record<string, unknown>
  try { json = JSON.parse(raw) } catch { return null }

  switch (json.type) {
    case 'assistant': {
      const content = (json.message as any)?.content
      if (!Array.isArray(content)) return null
      // Prefer text block; fall back to tool_use block embedded in assistant message
      const textBlock = content.find((b: any) => b.type === 'text')
      if (textBlock) return { kind: 'text', text: textBlock.text ?? '' }
      const toolBlock = content.find((b: any) => b.type === 'tool_use')
      if (toolBlock) {
        const tool = toolBlock.name as string
        const inputObj = toolBlock.input ?? {}
        const input = tool === 'Bash'
          ? (inputObj as any).command ?? ''
          : tool === 'Write' || tool === 'Edit'
            ? (inputObj as any).file_path ?? ''
            : JSON.stringify(inputObj).slice(0, 80)
        return { kind: 'tool_use', tool, input }
      }
      return null
    }
    case 'tool_use': {
      const tool = json.name as string
      const inputObj = json.input ?? {}
      const input = tool === 'Bash'
        ? (inputObj as any).command ?? ''
        : tool === 'Write' || tool === 'Edit'
          ? (inputObj as any).file_path ?? ''
          : JSON.stringify(inputObj).slice(0, 80)
      return { kind: 'tool_use', tool, input }
    }
    case 'result':
      return json.subtype === 'error'
        ? { kind: 'error', message: (json.error as string) ?? 'unknown error' }
        : { kind: 'complete', result: (json.result as string) ?? undefined }
    default:
      return null
  }
}

/** Convert a ParsedLine to a short display string for speech bubbles (max 60 chars) */
export function parsedToBubble(line: ParsedLine): string | null {
  switch (line.kind) {
    case 'text':     return line.text.slice(0, 60)
    case 'tool_use': return `${line.tool}: ${line.input.slice(0, 40)}`
    case 'complete': return null
    case 'error':    return `error: ${line.message.slice(0, 40)}`
  }
}
