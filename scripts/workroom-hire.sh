#!/usr/bin/env bash
# Usage: workroom-hire.sh <agentId> "<sprite>" "<personality>"
# Hires a new permanent agent. No-op if the agent already exists.
# Exit 0 on success, 1 if the orchestrator is not running or times out.

set -euo pipefail

AGENT_ID="${1:?Usage: workroom-hire.sh <agentId> <sprite> <personality>}"
SPRITE="${2:?Usage: workroom-hire.sh <agentId> <sprite> <personality>}"
PERSONALITY="${3:?Usage: workroom-hire.sh <agentId> <sprite> <personality>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WS_MODULE="$SCRIPT_DIR/../orchestrator/node_modules/ws"

WORKROOM_WS_MOD="$WS_MODULE" node -e "
const WebSocket = require(process.env.WORKROOM_WS_MOD)
const [, agentId, sprite, personality] = process.argv
const ws = new WebSocket('ws://localhost:7331')
let confirmed = false

const timeout = setTimeout(() => {
  if (!confirmed) {
    process.stderr.write('workroom-hire: timed out waiting for server confirmation\n')
    ws.close()
    process.exit(1)
  }
}, 5000)

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'create_agent', id: agentId, sprite, personality }))
})

ws.on('message', (data) => {
  let msg
  try { msg = JSON.parse(data.toString()) } catch { return }
  if (
    (msg.type === 'agent_updated' && msg.agent && msg.agent.id === agentId) ||
    (msg.type === 'feed_entry' && msg.entry && msg.entry.message && msg.entry.message.includes(agentId))
  ) {
    confirmed = true
    clearTimeout(timeout)
    ws.close()
    process.exit(0)
  }
})

ws.on('close', () => { if (!confirmed) process.exit(1) })
ws.on('error', (err) => {
  process.stderr.write('workroom-hire: ' + err.message + '\n')
  clearTimeout(timeout)
  process.exit(1)
})
" -- "$AGENT_ID" "$SPRITE" "$PERSONALITY"
