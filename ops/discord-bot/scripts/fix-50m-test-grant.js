import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../data/platform.db')
const db = new Database(dbPath)
const now = new Date().toISOString()

db.prepare(
  `UPDATE users SET
    total_allocated = 500,
    locked = 500,
    unlocked = 100,
    claimed = 0,
    updated_at = ?
   WHERE discord_id = '576940650117988352'`,
).run(now)

console.log('Fixed dannye6200 in platform.db')
db.close()
