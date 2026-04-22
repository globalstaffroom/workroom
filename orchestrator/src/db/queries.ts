import Database from 'better-sqlite3'

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

export function getRecentEvents(db: Database.Database, limit: number): WorkroomEvent[] {
  return (db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT ?').all(limit) as any[])
    .map(r => ({ ...r, payload: JSON.parse(r.payload) }))
}

export function getRelationship(db: Database.Database, a: string, b: string): Relationship {
  const [first, second] = [a, b].sort()
  const rel = db.prepare('SELECT * FROM relationships WHERE agent_a = ? AND agent_b = ?').get(first, second) as Relationship | undefined
  if (rel) return rel
  db.prepare('INSERT OR IGNORE INTO relationships (agent_a, agent_b) VALUES (?, ?)').run(first, second)
  return { agent_a: first, agent_b: second, trust: 50, tension: 0, history_count: 0 }
}

export function deltaTension(db: Database.Database, a: string, b: string, delta: number): void {
  const [first, second] = [a, b].sort()
  db.prepare(`
    INSERT INTO relationships (agent_a, agent_b, tension) VALUES (?, ?, ?)
    ON CONFLICT(agent_a, agent_b) DO UPDATE SET
      tension = MAX(0, MIN(100, tension + ?)),
      history_count = history_count + 1
  `).run(first, second, delta, delta)
}

export function setContext(db: Database.Database, key: string, value: string, setBy: string, project = 'default'): void {
  db.prepare('INSERT INTO context_items (key, value, set_by, project) VALUES (?, ?, ?, ?)').run(key, value, setBy, project)
}

export function getContext(db: Database.Database, project = 'default'): Record<string, string> {
  const rows = db.prepare(`
    SELECT key, value FROM context_items WHERE project = ?
    GROUP BY key HAVING created_at = MAX(created_at)
  `).all(project) as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}
