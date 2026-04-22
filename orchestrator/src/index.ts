import Database from 'better-sqlite3'
import { applySchema } from './db/schema'
import { startServer } from './server'
import { ensureWorktree } from './worktree'
import path from 'path'
import os from 'os'
import fs from 'fs'

const WORKROOM_DIR = path.join(os.homedir(), '.workroom')
const DB_PATH = path.join(WORKROOM_DIR, 'workroom.db')
const PID_PATH = path.join(WORKROOM_DIR, 'orchestrator.pid')
const REPO_PATH = path.resolve(__dirname, '../../')

fs.mkdirSync(WORKROOM_DIR, { recursive: true })

// Kill any previous orchestrator instance before starting
try {
  const oldPid = parseInt(fs.readFileSync(PID_PATH, 'utf8').trim(), 10)
  if (oldPid && oldPid !== process.pid) {
    try {
      process.kill(oldPid, 'SIGTERM')
      console.log(`[workroom] killed previous orchestrator pid=${oldPid}`)
    } catch { /* already dead */ }
  }
} catch { /* no pid file */ }

fs.writeFileSync(PID_PATH, String(process.pid))
process.on('exit', () => { try { fs.unlinkSync(PID_PATH) } catch {} })
process.on('SIGTERM', () => process.exit(0))

for (const agentId of ['coder', 'tester', 'review', 'search']) {
  try {
    ensureWorktree(agentId, REPO_PATH)
    console.log(`[workroom] worktree ready: ${agentId}`)
  } catch (err) {
    console.warn(`[workroom] worktree setup failed for ${agentId}:`, err)
  }
}

const db = new Database(DB_PATH)
applySchema(db)
const { orch } = startServer(db)
orch.startIdleDecay()
