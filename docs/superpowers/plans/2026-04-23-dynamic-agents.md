# Dynamic Agent Hiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any Claude session permanently hire new workroom agents at runtime via `workroom-hire.sh <id> "<sprite>" "<traits>"`.

**Architecture:** A bash script sends a `create_agent` WS command to the orchestrator, which inserts the agent into SQLite, creates a git worktree, and broadcasts `agent_updated` to the UI. The UI renders new agents using deterministic hash-based positions and colors so unknown agents always land somewhere reasonable.

**Tech Stack:** TypeScript (orchestrator + React), better-sqlite3, bash, WebSocket (ws), Vitest.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/types/index.ts` | Modify | Add `create_agent` to `UiCommand` union |
| `orchestrator/src/db/queries.ts` | Modify | Add `createAgent()` — INSERT OR IGNORE |
| `orchestrator/src/db/queries.test.ts` | Modify | Add tests for `createAgent` |
| `orchestrator/src/orchestrator.ts` | Modify | Handle `create_agent` command; update `agentColor` to use dynamic palette |
| `orchestrator/src/orchestrator.test.ts` | Modify | Add test for `create_agent` broadcast |
| `src/components/Room.tsx` | Modify | Add `hashCode` + `dynamicPos`; fall through to them for unknown agents |
| `src/components/FeedPanel.tsx` | Modify | Replace `AGENT_COLORS` constant lookup with `agentColor()` function using dynamic palette |
| `scripts/workroom-hire.sh` | Create | Bash bridge: send `create_agent`, exit 0 on success |
| `~/.claude/CLAUDE.md` | Modify | Add hire instructions |

---

### Task 1: Add `create_agent` to types and `createAgent` to queries

**Files:**
- Modify: `src/types/index.ts`
- Modify: `orchestrator/src/db/queries.ts`
- Modify: `orchestrator/src/db/queries.test.ts` (create if absent)

- [ ] **Step 1: Add `create_agent` to `UiCommand` in `src/types/index.ts`**

The current `UiCommand` union ends with `| { type: 'get_state' }`. Add one line after it:

```typescript
// Commands sent from UI → orchestrator
export type UiCommand =
  | { type: 'assign_task';   agentId: string; task: string }
  | { type: 'set_drama';     level: number }
  | { type: 'fire_chaos' }
  | { type: 'get_state' }
  | { type: 'create_agent';  id: string; sprite: string; personality: string }
```

- [ ] **Step 2: Write failing tests for `createAgent` in `orchestrator/src/db/queries.test.ts`**

Check if `orchestrator/src/db/queries.test.ts` exists. If not, create it. Add these tests:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { applySchema } from './schema'
import { createAgent, getAgent, getAllAgents } from './queries'

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  applySchema(db)
})

afterEach(() => db.close())

describe('createAgent', () => {
  it('inserts a new agent with correct fields', () => {
    createAgent(db, 'debugger', '🐛', 'meticulous, finds edge cases')
    const agent = getAgent(db, 'debugger')
    expect(agent).not.toBeNull()
    expect(agent!.id).toBe('debugger')
    expect(agent!.sprite).toBe('🐛')
    expect(agent!.personality).toBe('meticulous, finds edge cases')
    expect(agent!.zone).toBe('lounge')
    expect(agent!.mood).toBe(50)
  })

  it('is idempotent — calling twice does not throw or duplicate', () => {
    createAgent(db, 'debugger', '🐛', 'meticulous')
    expect(() => createAgent(db, 'debugger', '🐛', 'meticulous')).not.toThrow()
    const agents = getAllAgents(db)
    const debuggers = agents.filter(a => a.id === 'debugger')
    expect(debuggers).toHaveLength(1)
  })

  it('uses id as name', () => {
    createAgent(db, 'debugger', '🐛', 'meticulous')
    const agent = getAgent(db, 'debugger')
    expect(agent!.name).toBe('debugger')
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd /Users/biphwork/Desktop/workroom/orchestrator && npm test -- queries.test.ts
```

Expected: FAIL — `createAgent is not exported`

- [ ] **Step 4: Add `createAgent` to `orchestrator/src/db/queries.ts`**

Append after the `logResult` function:

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

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd /Users/biphwork/Desktop/workroom/orchestrator && npm test -- queries.test.ts
```

Expected: all 3 `createAgent` tests PASS plus all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts orchestrator/src/db/queries.ts orchestrator/src/db/queries.test.ts
git commit -m "feat: add create_agent UiCommand type and createAgent DB function"
```

---

### Task 2: Handle `create_agent` in the orchestrator

**Files:**
- Modify: `orchestrator/src/orchestrator.ts`
- Modify: `orchestrator/src/orchestrator.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the end of `orchestrator/src/orchestrator.test.ts`:

```typescript
describe('create_agent command', () => {
  it('inserts the agent and broadcasts agent_updated', () => {
    const messages: unknown[] = []
    orch.setBroadcast((msg) => messages.push(msg))

    orch.handleCommand({ type: 'create_agent', id: 'debugger', sprite: '🐛', personality: 'meticulous' })

    expect(messages).toContainEqual(
      expect.objectContaining({ type: 'agent_updated' })
    )
    const broadcast = (messages as any[]).find(m => m.type === 'agent_updated')
    expect(broadcast.agent.id).toBe('debugger')
    expect(broadcast.agent.zone).toBe('lounge')
    expect(broadcast.agent.status).toBe('idle')
  })

  it('is idempotent — calling twice does not throw', () => {
    orch.handleCommand({ type: 'create_agent', id: 'debugger', sprite: '🐛', personality: 'meticulous' })
    expect(() =>
      orch.handleCommand({ type: 'create_agent', id: 'debugger', sprite: '🐛', personality: 'meticulous' })
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/biphwork/Desktop/workroom/orchestrator && npm test -- orchestrator.test.ts
```

Expected: FAIL — `create_agent` not handled in switch

- [ ] **Step 3: Add `create_agent` handling to `orchestrator/src/orchestrator.ts`**

First add the import at the top (add `createAgent` to the existing queries import):

```typescript
import { getAllAgents, updateZone, deltaMood, logEvent, getAgent, logResult, createAgent } from './db/queries'
```

Then add a case to `handleCommand` (after `case 'fire_chaos':`):

```typescript
      case 'create_agent':
        this.hireAgent(cmd.id, cmd.sprite, cmd.personality)
        break
```

Then add the `hireAgent` private method after `assignTask`:

```typescript
  private hireAgent(id: string, sprite: string, personality: string): void {
    createAgent(this.db, id, sprite, personality)
    try {
      ensureWorktree(id, REPO_PATH)
    } catch (err) {
      console.warn(`[orchestrator] worktree setup failed for ${id}:`, err)
    }
    const agent = this.buildAgentState(id, 'idle')
    if (agent) this.broadcast({ type: 'agent_updated', agent })
  }
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/biphwork/Desktop/workroom/orchestrator && npm test -- orchestrator.test.ts
```

Expected: all 9 orchestrator tests PASS.

- [ ] **Step 5: Run full suite**

```bash
cd /Users/biphwork/Desktop/workroom/orchestrator && npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add orchestrator/src/orchestrator.ts orchestrator/src/orchestrator.test.ts
git commit -m "feat: handle create_agent command — insert to DB, create worktree, broadcast"
```

---

### Task 3: Update `agentColor` in orchestrator to use dynamic palette

**Files:**
- Modify: `orchestrator/src/orchestrator.ts`

The existing `agentColor` at the bottom of `orchestrator.ts` only handles 4 known IDs and falls back to `#888` for unknowns. Replace it with the dynamic palette version.

- [ ] **Step 1: Replace `agentColor` at the bottom of `orchestrator/src/orchestrator.ts`**

Find:
```typescript
export function agentColor(id: string): string {
  return ({ coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff' } as Record<string, string>)[id] ?? '#888'
}
```

Replace with:
```typescript
const DYNAMIC_PALETTE = ['#ff9f7f', '#7fffcf', '#ff7fbf', '#cfff7f', '#7fcfff', '#ffcf7f', '#bf7fff', '#7fffff']

function hashCode(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function agentColor(id: string): string {
  const known: Record<string, string> = {
    coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff',
  }
  return known[id] ?? DYNAMIC_PALETTE[hashCode(id) % DYNAMIC_PALETTE.length]
}
```

- [ ] **Step 2: Run full suite to confirm no breakage**

```bash
cd /Users/biphwork/Desktop/workroom/orchestrator && npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add orchestrator/src/orchestrator.ts
git commit -m "feat: dynamic palette for unknown agent colors in orchestrator"
```

---

### Task 4: Update `Room.tsx` with dynamic positions

**Files:**
- Modify: `src/components/Room.tsx`

- [ ] **Step 1: Add `hashCode` and `dynamicPos` helpers, update position lookup**

In `Room.tsx`, find the line:
```typescript
const DEFAULT_POS = { top: 200, left: 300 }
```

Replace it and the `ZONE_POSITIONS` constant + the rendering line with the following. First, add after the imports:

```typescript
function hashCode(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function dynamicPos(agentId: string, zone: Zone): { top: number; left: number } {
  const h = hashCode(agentId)
  const zoneBounds: Record<Zone, { top: [number, number]; left: [number, number] }> = {
    work_area:    { top: [90,  140], left: [60,  280] },
    lounge:       { top: [70,  110], left: [420, 620] },
    copy_room:    { top: [280, 340], left: [60,  220] },
    meeting_room: { top: [290, 340], left: [380, 590] },
  }
  const b = zoneBounds[zone]
  return {
    top:  b.top[0]  + (h        % (b.top[1]  - b.top[0])),
    left: b.left[0] + ((h >> 4) % (b.left[1] - b.left[0])),
  }
}
```

Keep `ZONE_POSITIONS` as-is (for the four known agents). Change the `DEFAULT_POS` line and the rendering lookup to use `dynamicPos` as fallback:

Remove:
```typescript
const DEFAULT_POS = { top: 200, left: 300 }
```

And change the rendering block from:
```typescript
      const zonePos = ZONE_POSITIONS[agent.zone]
      const pos = zonePos?.[agent.id] ?? DEFAULT_POS
```

To:
```typescript
      const zonePos = ZONE_POSITIONS[agent.zone]
      const pos = zonePos?.[agent.id] ?? dynamicPos(agent.id, agent.zone)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/biphwork/Desktop/workroom && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Room.tsx
git commit -m "feat: dynamic hash-based zone positions for unknown agents"
```

---

### Task 5: Update `FeedPanel.tsx` with dynamic colors

**Files:**
- Modify: `src/components/FeedPanel.tsx`

- [ ] **Step 1: Replace `AGENT_COLORS` constant with a function**

In `FeedPanel.tsx`, find:
```typescript
const AGENT_COLORS: Record<string, string> = {
  coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff',
}
```

Replace with:
```typescript
const DYNAMIC_PALETTE = ['#ff9f7f', '#7fffcf', '#ff7fbf', '#cfff7f', '#7fcfff', '#ffcf7f', '#bf7fff', '#7fffff']

function hashCode(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function agentColor(id: string): string {
  const known: Record<string, string> = {
    coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff',
  }
  return known[id] ?? DYNAMIC_PALETTE[hashCode(id) % DYNAMIC_PALETTE.length]
}
```

Then find the usage:
```typescript
          const color = AGENT_COLORS[agent.id] ?? '#888'
```

Replace with:
```typescript
          const color = agentColor(agent.id)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/biphwork/Desktop/workroom && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FeedPanel.tsx
git commit -m "feat: dynamic hash-based colors for unknown agents in feed panel"
```

---

### Task 6: Create `scripts/workroom-hire.sh`

**Files:**
- Create: `scripts/workroom-hire.sh`

- [ ] **Step 1: Create the script**

```bash
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
```

- [ ] **Step 2: Make executable**

```bash
chmod +x /Users/biphwork/Desktop/workroom/scripts/workroom-hire.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/workroom-hire.sh
git commit -m "feat: workroom-hire.sh — hire permanent agents from CLI or Claude sessions"
```

---

### Task 7: Update `~/.claude/CLAUDE.md` and end-to-end validation

**Files:**
- Modify: `~/.claude/CLAUDE.md`

- [ ] **Step 1: Add hire instructions to `~/.claude/CLAUDE.md`**

Open `~/.claude/CLAUDE.md` and append a new section after the existing content:

```markdown
## Hiring a new agent

```bash
/Users/biphwork/Desktop/workroom/scripts/workroom-hire.sh <id> "<emoji>" "<traits>"
# e.g.
/Users/biphwork/Desktop/workroom/scripts/workroom-hire.sh debugger "🐛" "meticulous, finds edge cases, asks clarifying questions"
```

Agent persists permanently across app restarts. Dispatch to them with `workroom-dispatch.sh` as normal. Hire once, use forever.
```

- [ ] **Step 2: Rebuild the orchestrator bundle**

```bash
cd /Users/biphwork/Desktop/workroom/orchestrator && npm run build:bundle
```

Expected: `orchestrator.cjs  ~349kb  Done`

- [ ] **Step 3: Rebuild the Tauri app**

```bash
cd /Users/biphwork/Desktop/workroom && export PATH="$HOME/.cargo/bin:$PATH" && npm run tauri build 2>&1 | tail -4
```

Expected: `Finished 2 bundles at:`

- [ ] **Step 4: Relaunch the app**

```bash
pkill -f workroom.app 2>/dev/null; sleep 1
open /Users/biphwork/Desktop/workroom/src-tauri/target/release/bundle/macos/workroom.app
sleep 4
```

- [ ] **Step 5: Hire a new agent and verify they appear in the lounge**

```bash
cd /Users/biphwork/Desktop/workroom
./scripts/workroom-hire.sh debugger "🐛" "meticulous, finds edge cases, asks clarifying questions"
```

Expected: debugger appears in the lounge immediately (without restarting the app).

- [ ] **Step 6: Verify idempotency**

```bash
./scripts/workroom-hire.sh debugger "🐛" "meticulous, finds edge cases, asks clarifying questions"
echo "Exit: $?"
```

Expected: exit 0, no error, no duplicate agent in room.

- [ ] **Step 7: Dispatch a task to the new agent**

```bash
./scripts/workroom-dispatch.sh debugger "What is 2+2? Answer in one word." 30
```

Expected: debugger moves to work_area, result prints, debugger returns to lounge.

- [ ] **Step 8: Restart the app and verify debugger persists**

```bash
pkill -f workroom.app 2>/dev/null; sleep 1
open /Users/biphwork/Desktop/workroom/src-tauri/target/release/bundle/macos/workroom.app
sleep 4
```

Expected: debugger is still in the room after restart.

- [ ] **Step 9: Push to GitHub**

```bash
git push
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `create_agent` UiCommand type | Task 1 |
| `createAgent()` DB function (INSERT OR IGNORE) | Task 1 |
| Orchestrator handles `create_agent` | Task 2 |
| Worktree created for new agent | Task 2 (`hireAgent` calls `ensureWorktree`) |
| `agent_updated` broadcast on hire | Task 2 |
| Dynamic zone positions for unknown agents | Task 4 |
| Dynamic colors for unknown agents in feed | Task 5 |
| Dynamic colors for unknown agents in orchestrator | Task 3 |
| `workroom-hire.sh` script | Task 6 |
| `~/.claude/CLAUDE.md` hire instructions | Task 7 |
| New agent starts in lounge | Task 1 (`zone='lounge'`) + Task 7 (validated) |
| Persistence across restarts | Task 7 Step 8 |
| Idempotency | Task 1 (INSERT OR IGNORE) + Task 7 Step 6 |

**Placeholder scan:** None found.

**Type consistency:**
- `create_agent` command shape: `{ type, id, sprite, personality }` — defined in Task 1 (types), used in Task 2 (`handleCommand`) and Task 6 (script JSON) — consistent.
- `createAgent(db, id, sprite, personality)` — defined in Task 1, imported and called in Task 2 — consistent.
- `hireAgent(id, sprite, personality)` — defined and called only in Task 2 — consistent.
- `hashCode(s)` — defined independently in Task 3 (orchestrator), Task 4 (Room.tsx), Task 5 (FeedPanel.tsx) — all identical implementations, consistent.
- `agentColor(id)` — defined in Task 3 (orchestrator, exported), Task 5 (FeedPanel, local) — same logic, same palette, consistent.
