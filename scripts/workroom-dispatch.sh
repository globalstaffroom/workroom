#!/usr/bin/env bash
# Usage: workroom-dispatch.sh <agentId> "<task>" [--timeout <seconds>]
# Dispatches a task to a workroom agent and prints the result to stdout.
# Exit 0 on success, 1 on agent_busy or timeout.

set -euo pipefail

AGENT_ID="${1:?Usage: workroom-dispatch.sh <agentId> <task>}"
TASK="${2:?Usage: workroom-dispatch.sh <agentId> <task>}"
TIMEOUT="${3:-120}"
WS_URL="ws://localhost:7331"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WS_MODULE="$SCRIPT_DIR/../orchestrator/node_modules/ws"

node -e "
const WebSocket = require('$WS_MODULE')
const agentId = process.argv[1]
const task = process.argv[2]
const timeoutSec = parseInt(process.argv[3] || '120', 10)
const wsUrl = process.argv[4] || 'ws://localhost:7331'

const ws = new WebSocket(wsUrl)
let done = false

const timer = setTimeout(() => {
  if (!done) {
    process.stderr.write('workroom-dispatch: timeout waiting for result\n')
    ws.close()
    process.exit(1)
  }
}, timeoutSec * 1000)

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'assign_task', agentId, task }))
})

ws.on('message', (data) => {
  let msg
  try { msg = JSON.parse(data.toString()) } catch { return }

  if (msg.type === 'agent_busy' && msg.agentId === agentId) {
    process.stderr.write('workroom-dispatch: ' + agentId + ' is busy\n')
    done = true
    clearTimeout(timer)
    ws.close()
    process.exit(1)
  }

  if (msg.type === 'task_result' && msg.agentId === agentId) {
    done = true
    clearTimeout(timer)
    process.stdout.write(msg.result + '\n')
    ws.close()
    process.exit(0)
  }
})

ws.on('error', (err) => {
  process.stderr.write('workroom-dispatch: ' + err.message + '\n')
  process.exit(1)
})
" -- "$AGENT_ID" "$TASK" "$TIMEOUT" "$WS_URL"
