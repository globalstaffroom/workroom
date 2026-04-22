import Database from 'better-sqlite3'

export function applySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      sprite        TEXT NOT NULL,
      personality   TEXT NOT NULL,
      mood          INTEGER NOT NULL DEFAULT 50,
      energy        INTEGER NOT NULL DEFAULT 100,
      zone          TEXT NOT NULL DEFAULT 'work_area'
    );

    CREATE TABLE IF NOT EXISTS relationships (
      agent_a       TEXT NOT NULL,
      agent_b       TEXT NOT NULL,
      trust         INTEGER NOT NULL DEFAULT 50,
      tension       INTEGER NOT NULL DEFAULT 0,
      history_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (agent_a, agent_b)
    );

    CREATE TABLE IF NOT EXISTS context_items (
      key           TEXT NOT NULL,
      value         TEXT NOT NULL,
      set_by        TEXT NOT NULL,
      project       TEXT NOT NULL DEFAULT 'default',
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      type          TEXT NOT NULL,
      agent         TEXT NOT NULL,
      payload       TEXT NOT NULL DEFAULT '{}',
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      agent         TEXT NOT NULL,
      started_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      ended_at      INTEGER,
      tasks_done    INTEGER NOT NULL DEFAULT 0,
      bugs_caused   INTEGER NOT NULL DEFAULT 0
    );
  `)

  const insert = db.prepare(`
    INSERT OR IGNORE INTO agents (id, name, sprite, personality, mood, zone)
    VALUES (@id, @name, @sprite, @personality, @mood, @zone)
  `)
  const seedAgents = db.transaction(() => {
    insert.run({ id: 'coder',  name: 'coder',  sprite: '🧑‍💻', personality: 'Overconfident. Ships fast, tests later.',       mood: 50, zone: 'work_area' })
    insert.run({ id: 'tester', name: 'tester', sprite: '🧑‍🔬', personality: 'Pedantic. Finds bugs that do not matter yet.',    mood: 50, zone: 'work_area' })
    insert.run({ id: 'review', name: 'review', sprite: '🧑‍🏫', personality: 'Passive. Avoids conflict, defers decisions.',     mood: 50, zone: 'copy_room' })
    insert.run({ id: 'search', name: 'search', sprite: '🔍',   personality: 'Easily distracted. Finds interesting tangents.', mood: 50, zone: 'lounge' })
  })
  seedAgents()
}
