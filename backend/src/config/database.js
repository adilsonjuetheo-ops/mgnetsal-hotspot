const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../data/hotspot.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      mac_address TEXT,
      ip_address TEXT,
      hotspot_server TEXT,
      is_validated INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      mac_address TEXT,
      ip_address TEXT,
      mikrotik_user TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insere configurações padrão
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  insertSetting.run('hotspot_title', 'Wi-Fi Grátis MG-NET SAL');
  insertSetting.run('hotspot_subtitle', 'Conecte-se agora e aproveite a internet mais rápida da região!');
  insertSetting.run('hotspot_free_time', '60');
  insertSetting.run('otp_expiry_minutes', '5');
  insertSetting.run('zenvia_from', 'MGNetSal');
  insertSetting.run('require_name', '1');
  insertSetting.run('require_email', '0');

  // Cria admin padrão se não existir
  const adminExists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(
    process.env.ADMIN_USERNAME || 'admin'
  );
  if (!adminExists) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'mgnet@2024', 10);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(
      process.env.ADMIN_USERNAME || 'admin',
      hash
    );
    console.log('Admin padrão criado:', process.env.ADMIN_USERNAME || 'admin');
  }

  console.log('Banco de dados inicializado.');
}

module.exports = { db, initDatabase };
