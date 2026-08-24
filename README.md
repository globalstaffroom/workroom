# Workroom

A Tauri desktop app that turns live Claude Code agent sessions into a watchable pixel-art office. Agents run as real `claude` CLI subprocesses doing actual development work, while a Node.js orchestrator coordinates them, shares context across sessions, and drives a personality + mood system that makes the room feel alive.

## What it does

- Agents appear as sprites in a top-down pixel-art teacher's lounge — work area, staff lounge, copy room, meeting room — and move between zones based on their state (working → desk, idle → couch, waiting → copy room)
- Each agent gets its own git worktree, so they never stomp on each other's working directory
- Mood (0–100 per agent) shifts based on outcomes — task completed, PR rejected, bug found, idle too long — and colors short in-character reactions generated via Claude Haiku
- A drama slider (0–100, "Chill" → "Chaos") and a chaos button control how much personality and tension bleed into those reactions
- New agents can be hired permanently at runtime, from any Claude session: `scripts/workroom-hire.sh <id> "<sprite>" "<traits>"`

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri (Rust) |
| UI | React + TypeScript + Tailwind |
| Orchestrator | Node.js + TypeScript, runs as a Tauri sidecar |
| Database | SQLite (`better-sqlite3`) — agents, relationships, context, events |
| Agent runtime | Claude Code CLI (`--output-format stream-json`) |
| Personality dialogue | Claude Haiku (cheap, fast in-character reactions — separate from the agents' actual work sessions) |

## Development

```bash
npm install
npm run tauri dev
```

Run tests:

```bash
# frontend
npx vitest run

# orchestrator
cd orchestrator && npm test
```

## Docs

- [`docs/superpowers/specs/2026-04-21-workroom-design.md`](docs/superpowers/specs/2026-04-21-workroom-design.md) — full design spec (room layout, architecture, personality/mood/drama systems)
- [`docs/superpowers/specs/2026-04-23-dynamic-agents-design.md`](docs/superpowers/specs/2026-04-23-dynamic-agents-design.md) — dynamic agent hiring
