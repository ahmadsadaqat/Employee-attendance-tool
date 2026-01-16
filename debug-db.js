const Database = require('better-sqlite3')
const path = require('path')
const os = require('os')

// Guessing the path based on typical Electron patterns on Linux
// App name in package.json is 'nexo-employees'
const dbPath = path.join(
  os.homedir(),
  '.config',
  'nexo-employees',
  'attendance.db'
)

try {
  const db = new Database(dbPath)
  const devices = db.prepare('SELECT * FROM devices').all()
  console.log('--- Devices in DB ---')
  console.table(devices)
} catch (e) {
  console.error('Failed to read DB:', e.message)
}
