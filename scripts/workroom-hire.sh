#!/usr/bin/env bash
# Usage: workroom-hire.sh <agentId> "<sprite>" "<personality>"
# Hires a new permanent agent. No-op if the agent already exists.
# Exit 0 on success, 1 if the orchestrator is not running.

set -euo pipefail

AGENT_ID="${1:?Usage: workroom-hire.sh <agentId> <sprite> <personality>}"
SPRITE="${2:?Usage: workroom-hire.sh <agentId> <sprite> <personality>}"
PERSONALITY="${3:?Usage: workroom-hire.sh <agentId> <sprite> <personality>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WS_MODULE="$SCRIPT_DIR/../orchestrator/node_modules/ws"

node -e "
const WebSocket = require('$WS_MODULE')
const [,, agentId, sprite, personality] = process.argv
const ws = new WebSocket('ws://localhost:7331')
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'create_agent', id: agentId, sprite, personality }))
  setTimeout(() => { ws.close(); process.exit(0) }, 500)
})
ws.on('close', () => { process.exit(0) })
ws.on('error', (err) => {
  process.stderr.write('workroom-hire: ' + err.message + '\n')
  process.exit(1)
})
" -- "$AGENT_ID" "$SPRITE" "$PERSONALITY"
