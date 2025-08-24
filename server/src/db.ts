import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export function openDB(dbPath: string) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

export function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      wallet TEXT PRIMARY KEY,
      km INTEGER NOT NULL DEFAULT 0,
      usd_earned REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}