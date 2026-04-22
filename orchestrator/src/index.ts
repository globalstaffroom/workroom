import Database from 'better-sqlite3'
import { applySchema } from './db/schema'
import { startServer } from './server'
import path from 'path'
import os from 'os'
import fs from 'fs'

const DB_PATH = path.join(os.homedir(), '.workroom', 'workroom.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
applySchema(db)
const { orch } = startServer(db)
