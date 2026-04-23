import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import os from 'os'

export interface Agent {
  id: string; name: string; sprite: string
  personality: string; mood: number; energy: number; zone: string
}
export interface Relationship {
  agent_a: string; agent_b: string; trust: number; tension: number; history_count: number
}
export interface WorkroomEvent {
  id?: number; type: string; agent: string; payload: Record<string, unknown>; created_at?: number
}

export function getAgent(db: Database.Database, id: string): Agent | null {
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | null
}

export function getAllAgents(db: Database.Database): Agent[] {
  return db.prepare('SELECT * FROM agents').all() as Agent[]
}

export function updateMood(db: Database.Database, id: string, mood: number): void {
  const clamped = Math.max(0, Math.min(100, mood))
  db.prepare('UPDATE agents SET mood = ? WHERE id = ?').run(clamped, id)
}

export function deltaMood(db: Database.Database, id: string, delta: number): number {
  const agent = getAgent(db, id)
  if (!agent) return 50
  const next = Math.max(0, Math.min(100, agent.mood + delta))
  updateMood(db, id, next)
  return next
}

export function updateZone(db: Database.Database, id: string, zone: string): void {
  db.prepare('UPDATE agents SET zone = ? WHERE id = ?').run(zone, id)
}

export function logEvent(db: Database.Database, event: Omit<WorkroomEvent, 'id' | 'created_at'>): void {
  db.prepare('INSERT INTO events (type, agent, payload) VALUES (?, ?, ?)').run(
    event.type, event.agent, JSON.stringify(event.payload)
  )
}

interface EventRow { id: number; type: string; agent: string; payload: string; created_at: number }
export function getRecentEvents(db: Database.Database, limit: number): WorkroomEvent[] {
  return (db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT ?').all(limit) as EventRow[])
    .map(r => ({ ...r, payload: JSON.parse(r.payload) as Record<string, unknown> }))
}

export function getRelationship(db: Database.Database, a: string, b: string): Relationship {
  const [first, second] = [a, b].sort()
  db.prepare('INSERT OR IGNORE INTO relationships (agent_a, agent_b) VALUES (?, ?)').run(first, second)
  return db.prepare('SELECT * FROM relationships WHERE agent_a = ? AND agent_b = ?').get(first, second) as Relationship
}

export function deltaTension(db: Database.Database, a: string, b: string, delta: number): void {
  const [first, second] = [a, b].sort()
  // SQL-level MAX/MIN is the authoritative clamp; JS clamp guards the initial insert value only
  const initialTension = Math.max(0, Math.min(100, delta))
  db.prepare(`
    INSERT INTO relationships (agent_a, agent_b, tension) VALUES (?, ?, ?)
    ON CONFLICT(agent_a, agent_b) DO UPDATE SET
      tension = MAX(0, MIN(100, tension + ?)),
      history_count = history_count + 1
  `).run(first, second, initialTension, delta)
}

export function setContext(db: Database.Database, key: string, value: string, setBy: string, project = 'default'): void {
  db.prepare('INSERT INTO context_items (key, value, set_by, project) VALUES (?, ?, ?, ?)').run(key, value, setBy, project)
}

export function getContext(db: Database.Database, project = 'default'): Record<string, string> {
  const rows = db.prepare(`
    SELECT c.key, c.value FROM context_items c
    INNER JOIN (
      SELECT key, MAX(created_at) AS max_ts
      FROM context_items WHERE project = ?
      GROUP BY key
    ) latest ON c.key = latest.key AND c.created_at = latest.max_ts
    WHERE c.project = ?
  `).all(project, project) as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export function logResult(db: Database.Database, agentId: string, taskId: string, result: string): void {
  db.prepare('INSERT INTO events (type, agent, payload) VALUES (?, ?, ?)').run(
    'task_result',
    agentId,
    JSON.stringify({ taskId, result })
  )
  try {
    const dir = path.join(os.homedir(), '.workroom', 'results')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, `${agentId}-${taskId}.txt`), result, 'utf8')
  } catch (err) {
    console.error('[queries] logResult: failed to write result file:', err)
  }
}

export function createAgent(
  db: Database.Database,
  id: string,
  sprite: string,
  personality: string
): void {
  if (!id || !id.trim()) throw new Error('createAgent: id must not be empty')
  db.prepare(`
    INSERT OR IGNORE INTO agents (id, name, sprite, personality, mood, energy, zone)
    VALUES (?, ?, ?, ?, 50, 100, 'lounge')
  `).run(id, id, sprite, personality)
}
