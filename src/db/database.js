import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '../../data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const DB_URL = process.env.DATABASE_URL || `file:${path.join(dataDir, 'variantsync.db')}`

export const db = createClient({ url: DB_URL })

const DEFAULT_COLUMNS = ['AQUECENDO', 'PRÉ ESCALA', 'ESCALA', 'BLOCK']

export async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_domain TEXT NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      client_id TEXT NOT NULL,
      client_secret TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('black', 'white')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      black_store_id INTEGER NOT NULL,
      white_store_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused')),
      column_name TEXT DEFAULT 'AQUECENDO',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (black_store_id) REFERENCES stores(id),
      FOREIGN KEY (white_store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS product_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER NOT NULL,
      black_product_id TEXT NOT NULL,
      white_product_id TEXT NOT NULL,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS variant_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_mapping_id INTEGER NOT NULL,
      black_variant_id TEXT NOT NULL,
      white_variant_id TEXT NOT NULL,
      FOREIGN KEY (product_mapping_id) REFERENCES product_mappings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS board_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      position INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success', 'error')),
      message TEXT,
      products_synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
    );
  `)

  // Seed default columns if none exist
  const existing = await db.execute('SELECT COUNT(*) as count FROM board_columns')
  if (Number(existing.rows[0].count) === 0) {
    for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
      await db.execute({ sql: 'INSERT INTO board_columns (name, position) VALUES (?, ?)', args: [DEFAULT_COLUMNS[i], i] })
    }
  }
}

// Helper: returns first row or null
export async function getOne(sql, args = []) {
  const res = await db.execute({ sql, args })
  return res.rows[0] ?? null
}

// Helper: returns all rows
export async function getAll(sql, args = []) {
  const res = await db.execute({ sql, args })
  return res.rows
}

// Helper: runs insert/update/delete, returns { lastInsertRowid, rowsAffected }
export async function run(sql, args = []) {
  const res = await db.execute({ sql, args })
  return { lastInsertRowid: res.lastInsertRowid, rowsAffected: res.rowsAffected }
}
