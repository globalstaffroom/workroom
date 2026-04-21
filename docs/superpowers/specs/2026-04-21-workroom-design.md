# Workroom — Design Spec
**Date:** 2026-04-21  
**Status:** Approved  

---

## Overview

Workroom is a Tauri desktop app that turns Claude Code agent sessions into a living, watchable pixel-art office. Agents run as real `claude` CLI subprocesses doing actual development work. A Node.js orchestrator coordinates them, manages shared context across sessions, and drives a personality + mood system that makes the room feel alive. A drama slider and chaos button let you turn up the tension whenever things feel flat.

The visual metaphor is a top-down pixel-art teacher's lounge — sage green walls, tile floors, sunlight through big windows, plants everywhere. Agents are characters at desks. Their mood shows in their speech bubbles, their posture, and where they're sitting.

---

## Platform & Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Desktop shell | Tauri (Rust) | Lightweight (~3MB), native subprocess management, system tray |
| UI | React + TypeScript + Tailwind | Consistent with existing GlobalStaffroom stack |
| Pixel art rendering | HTML/CSS (emoji sprites, CSS grid) | No canvas needed at this fidelity |
| Orchestrator | Node.js + TypeScript | Lives inside Tauri as a sidecar process |
| Database | SQLite (better-sqlite3) | Shared context, mood, relationships, event log |
| Agent runtime | Claude Code CLI (`claude --output-format stream-json`) | Full tool access, existing auth, streaming output |
| Personality dialogue | Claude Haiku API | Cheap, fast reactions — not full agent sessions |

---

## Visual Design

### The Room
- **Floor:** Light cream/grey tile, checkerboard pattern
- **Walls:** Sage green institutional paint with cream wainscoting
- **Windows:** 4 large windows across the top wall, curtains, sunlight shafts falling onto the floor
- **Zones:**
  - **Work Area** (top-left) — desks, monitors, bookshelves
  - **Staff Lounge** (top-right) — couch with pillows, round coffee table, fridge, coffee machine, TV
  - **Copy Room** (bottom-left) — printer, review desk, corkboard with sticky notes
  - **Meeting Room** (bottom-right) — big table, chairs, whiteboard, bulletin board
- **Plants:** Everywhere — every window sill, every corner, trailing from shelves

### Agents
- 26–28px emoji sprites with drop shadows
- Speech bubbles showing current task or reaction
- Status dot (blue = active, green = running, yellow = waiting, grey = idle)
- Agent moves between zones based on state (working → desk, idle → couch, waiting → copy room)
- Mood visible in bubble tone and emoji expression

### Activity Feed (right panel)
- Agent roster with progress bars
- Timestamped log of all events
- Feed entries colour-coded by agent

---

## System Architecture

```
[React UI] ←→ [Tauri Shell] ←→ [Node.js Orchestrator] ←→ [SQLite]
                                          ↕
                              [Claude CLI subprocesses]
                                          ↕
                                  [Anthropic API]
                              (work + Haiku reactions)
```

### Component Responsibilities

**React UI**
- Renders the pixel art room, agent positions, speech bubbles, feed
- Sends commands to orchestrator: `assign_task`, `set_drama_level`, `fire_chaos_event`
- Receives events from orchestrator: `agent_moved`, `bubble_update`, `feed_entry`, `mood_changed`
- Exposes drama slider (0–100) and chaos button

**Tauri Shell**
- Native window, system tray icon showing active agent count
- Spawns orchestrator as a sidecar process on launch
- Routes IPC between UI and orchestrator via Tauri commands

**Node.js Orchestrator**
- Manages agent lifecycle (spawn, pause, resume, kill)
- Parses `stream-json` stdout from each Claude CLI process
- Builds personality-aware system prompts for each agent
- Detects trigger events (test_failed, pr_rejected, task_complete) and decides whether to generate a reaction
- Calls Claude Haiku for short personality reactions (not full agent sessions)
- Updates mood scores and relationship deltas in SQLite
- Runs the drama event engine (chaos button, slider effects)
- Emits structured events to the UI via Tauri event bus (`emit` / `listen`)

**SQLite Database**
- `agents` — id, name, sprite, personality_trait, current_mood, energy, position
- `relationships` — agent_a, agent_b, trust_score, tension_score, history_count
- `context_items` — key, value, set_by, timestamp, project
- `events` — id, type, agent, payload, timestamp
- `sessions` — agent, started_at, ended_at, tasks_completed, bugs_caused

---

## Agent Roster (default)

| Agent | Sprite | Role | Stable Trait |
|---|---|---|---|
| coder | 🧑‍💻 | Writes code | Overconfident. Ships fast, tests later. |
| tester | 🧑‍🔬 | Runs tests | Pedantic. Finds bugs that don't matter yet. |
| review | 🧑‍🏫 | Reviews PRs | Passive. Avoids conflict, defers decisions. |
| search | 🔍 😴 (idle) | Research/context | Easily distracted. Finds interesting tangents. |

Each agent gets a dedicated git worktree so they never stomp on each other's working directory.

---

## Personality + Mood System

### Mood
- Integer 0–100 per agent, starts at 50 (neutral)
- Changes based on work outcomes:
  - Task completed successfully → +10
  - PR rejected → -15
  - Bug found in own output → -10
  - Waiting idle > 10 min → -5 per 10 min
  - Positive reaction from another agent → +8
- Mood affects the tone of Haiku-generated reactions
- Mood visible in UI via speech bubble tone and (at extremes) sprite expression

### Reactions
When a trigger event fires, the orchestrator:
1. Reads the affected agent's personality trait + current mood + drama level
2. Reads recent relationship history with relevant agents
3. Calls Claude Haiku: `"You are {name}. Trait: {trait}. Mood: {mood}/100. Drama level: {drama}/100. Event: {what_happened}. React in one short sentence, in character."`
4. Returns reaction → shown as speech bubble in UI, logged to feed

Haiku keeps reactions cheap (< $0.001 each). Full Claude sessions are only for actual work.

---

## Drama System

### Slider (0–100, global)
Controls the drama level fed into every Haiku reaction prompt.

| Level | Name | Effect |
|---|---|---|
| 0–20 | Chill | Professional, functional, brief |
| 21–40 | Normal | Personality colours tone, visible mood shifts |
| 41–60 | Spicy | Passive aggression, opinions about each other's work |
| 61–80 | Hot | Relationship tension affects work speed, complaints |
| 81–100 | Chaos | Rogue behaviour, refusals, full personality eruption |

Default on launch: **25 (Normal)**.

### Chaos Button (instant event injection)
Picks a weighted random event from the table below. Weighting biased toward events that fit current mood states.

| Event | Trigger | Visual |
|---|---|---|
| `printer_jams` | Review tries to print | Printer shows PAPER JAM, review reacts |
| `stolen_coffee` | Random | A mug disappears, nobody admits it |
| `rogue_bug_found` | Search is active | Search surfaces a critical unrelated bug |
| `passive_sticky` | Coder + tester tension high | Sticky note appears on coder's monitor |
| `rogue_refactor` | Coder mood < 40 | Coder starts editing something off-scope |
| `pr_rejected_again` | Review + coder history | Tester rejects for a 3rd time, coder snaps |
| `distracted` | Search is idle | Search goes offline, returns with tangent |
| `surprise_birthday` | Random (rare) | Everyone stops for 60 seconds |

---

## Key Flows

### Assign Task
1. User drags task card onto agent's desk in the UI
2. UI emits `assign_task { agent, task, context }`
3. Orchestrator builds system prompt: base task + agent personality + current shared context from SQLite
4. Spawns `claude --output-format stream-json -p "{prompt}"` in agent's worktree
5. Streams stdout → parsed → UI events (agent walks to desk, bubble shows current action, feed updates)
6. On completion: orchestrator writes output summary to SQLite shared context

### Agent Reacts to Another Agent
1. Trigger event detected (e.g. `test_failed` on coder's output)
2. Orchestrator checks drama level, checks relationship score between coder and tester
3. If drama ≥ 20: calls Haiku with tester's personality + mood + event + drama level
4. Reaction returned → tester's bubble updates, mood delta written, relationship tension +1
5. Coder may also react (orchestrator decides based on drama level)

### Shared Context Handoff
1. Agent completes a task, writes handoff note to SQLite `context_items`
2. Orchestrator detects completion, identifies downstream agents
3. Next agent session is primed with the handoff context — no re-explaining needed
4. Context persists across app restarts — agents remember previous sessions

### Chaos Button
1. User presses chaos button
2. Orchestrator samples weighted event table (biased by current mood states)
3. Fires the event: updates agent state, triggers Haiku reactions from affected agents
4. Visual event plays (agent moves, bubble, environmental change)
5. Event logged, mood and relationship scores updated

---

## Out of Scope (v1)

- Agent-to-agent direct messaging (orchestrator-mediated reactions only)
- More than 4 simultaneous agents
- Cloud sync / multi-machine
- Custom agent personality editor (traits are defined in config, not UI)
- Mobile / web version

---

## Open Questions

None — all design decisions resolved.
