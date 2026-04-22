# Dynamic Agent Hiring — Design Spec

**Date:** 2026-04-23

---

## Problem

The four workroom agents are hardcoded. Claude sessions cannot add new agents to the workforce at runtime. The goal is to let any session hire a permanent new agent with a name, sprite, and personality — exactly like onboarding a new team member.

---

## What This Is Not

- **Not temporary.** Agents persist in the DB between sessions. Once hired, they're always in the room.
- **Not auto-created on dispatch.** A typo in `workroom-dispatch.sh` should not silently spawn a new hire. Hiring is an explicit act.

---

## Hiring Flow

```
workroom-hire.sh <id> "<emoji>" "<traits>"
```

Example:
```
workroom-hire.sh debugger "🐛" "meticulous, finds edge cases, asks clarifying questions"
```

The script connects to `ws://localhost:7331`, sends `{ type: 'create_agent', id, sprite, personality }`, and exits 0. The orchestrator inserts the agent into the DB (zone: `lounge`, mood: 50), creates their git worktree, and broadcasts `agent_updated` to all connected clients. The agent appears in the lounge immediately.

Dispatching to a hired agent works identically to the four original agents:
```
workroom-dispatch.sh debugger "Find the null pointer in src/auth.ts"
```

---

## Architecture

```
workroom-hire.sh
      │
      │  WS: { type: 'create_agent', id, sprite, personality }
      ▼
Orchestrator
      ├── INSERT INTO agents (id, name, sprite, personality, mood=50, zone='lounge')
      ├── ensureWorktree(id, REPO_PATH)
      └── broadcast: { type: 'agent_updated', agent }
            │
            ▼
         Room UI — adds agent to store, renders in lounge
```

---

## Changes Required

| File | Change |
|---|---|
| `src/types/index.ts` | Add `create_agent` to `UiCommand` union |
| `orchestrator/src/db/queries.ts` | Add `createAgent()` — INSERT OR IGNORE |
| `orchestrator/src/orchestrator.ts` | Handle `create_agent` command |
| `src/components/Room.tsx` | Replace hardcoded `ZONE_POSITIONS` with dynamic fallback |
| `src/components/FeedPanel.tsx` | Replace hardcoded `AGENT_COLORS` with hash-based fallback |
| `scripts/workroom-hire.sh` | New script |
| `~/.claude/CLAUDE.md` | Add hire instructions |

---

## Detail: Dynamic Positions

`ZONE_POSITIONS` currently hardcodes pixel positions for all four agents in all four zones. For unknown agents, positions are computed deterministically from a simple hash of `agentId`:

```typescript
function hashCode(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function dynamicPos(agentId: string, zone: Zone): { top: number; left: number } {
  const h = hashCode(agentId)
  const zoneBounds: Record<Zone, { top: [number, number]; left: [number, number] }> = {
    work_area:    { top: [90, 140],  left: [60, 280] },
    lounge:       { top: [70, 110],  left: [420, 620] },
    copy_room:    { top: [280, 340], left: [60, 220] },
    meeting_room: { top: [290, 340], left: [380, 590] },
  }
  const b = zoneBounds[zone]
  return {
    top:  b.top[0]  + (h % (b.top[1]  - b.top[0])),
    left: b.left[0] + ((h >> 4) % (b.left[1] - b.left[0])),
  }
}
```

The hardcoded positions for the four original agents are kept — they only fall through to `dynamicPos` for agents not in the table.

---

## Detail: Dynamic Colors

`AGENT_COLORS` and `STATUS_COLORS` lookup maps are supplemented with a hash-based fallback palette for unknown agent IDs:

```typescript
const DYNAMIC_PALETTE = ['#ff9f7f', '#7fffcf', '#ff7fbf', '#cfff7f', '#7fcfff', '#ffcf7f', '#bf7fff', '#7fffff']

function agentColor(id: string): string {
  const known: Record<string, string> = {
    coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff',
  }
  return known[id] ?? DYNAMIC_PALETTE[hashCode(id) % DYNAMIC_PALETTE.length]
}
```

The same function is used in both `FeedPanel.tsx` and `orchestrator.ts` (the orchestrator already has `agentColor` — it will be kept in sync or the UI will derive color client-side from the same algorithm).

---

## Detail: `createAgent` DB function

```typescript
export function createAgent(
  db: Database.Database,
  id: string,
  sprite: string,
  personality: string
): void {
  db.prepare(`
    INSERT OR IGNORE INTO agents (id, name, sprite, personality, mood, energy, zone)
    VALUES (?, ?, ?, ?, 50, 100, 'lounge')
  `).run(id, id, sprite, personality)
}
```

`name` defaults to `id` — simple and consistent with the original four agents.

---

## Detail: `workroom-hire.sh`

```bash
#!/usr/bin/env bash
# Usage: workroom-hire.sh <agentId> "<sprite>" "<personality>"
# Hires a new permanent agent. No-op if the agent already exists.

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
ws.on('error', (err) => {
  process.stderr.write('workroom-hire: ' + err.message + '\n')
  process.exit(1)
})
" -- "$AGENT_ID" "$SPRITE" "$PERSONALITY"
```

---

## Detail: `~/.claude/CLAUDE.md` addition

```
## Hiring a new agent
workroom-hire.sh <id> "<emoji>" "<traits>"
# e.g. workroom-hire.sh debugger "🐛" "meticulous, finds edge cases, asks clarifying questions"
# Agent persists permanently. Dispatch to them with workroom-dispatch.sh as normal.
```

---

## Error Handling

- **Duplicate hire:** `INSERT OR IGNORE` — silent no-op, exit 0.
- **Orchestrator not running:** `ws.on('error')` fires, exit 1 with message.
- **Worktree creation fails:** logged as a warning (same pattern as startup init); agent is still created in the DB and visible in the room. Dispatch will retry worktree creation.

---

## What This Does Not Do

- **No UI for hiring** — hiring is done from the CLI or a Claude session. The room just receives and renders.
- **No agent removal** — out of scope. Agents can be ignored but not deleted for now.
- **No per-agent zone layout** — positions are deterministic-hash, not user-configurable.

---

## Validation Criteria

1. `workroom-hire.sh debugger "🐛" "meticulous"` — agent appears in lounge immediately without restarting the app.
2. Running the same command again — no error, no duplicate.
3. `workroom-dispatch.sh debugger "Find the null pointer in src/auth.ts"` — agent moves to work_area, completes, returns to lounge.
4. After restarting the app, hired agent is still in the room.
