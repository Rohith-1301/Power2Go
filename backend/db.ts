import { Pool } from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Check if PostgreSQL configuration is available
const usePostgres = !!(
  process.env.PGHOST &&
  process.env.PGUSER &&
  process.env.PGPASSWORD &&
  process.env.PGDATABASE
);

let pgPool: Pool | null = null;
let sqliteDb: any = null;

if (usePostgres) {
  console.log('Database Mode: PostgreSQL');
  pgPool = new Pool({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
} else {
  console.log('Database Mode: SQLite (Local Fallback)');
  const dbDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'power2go.db');
  sqliteDb = new Database(dbPath);
}

// Helper to run raw SQL queries compatible with both
export async function query(text: string, params: any[] = []): Promise<any> {
  if (usePostgres && pgPool) {
    const res = await pgPool.query(text, params);
    return { rows: res.rows, rowCount: res.rowCount };
  } else {
    // Convert Postgres parameterized placeholders ($1, $2) to SQLite placeholders (?, ?)
    let sqliteText = text;
    let index = 1;
    while (sqliteText.includes(`$${index}`)) {
      sqliteText = sqliteText.replace(`$${index}`, '?');
      index++;
    }

    // Determine statement type
    const trimmedText = sqliteText.trim().toLowerCase();
    if (trimmedText.startsWith('select')) {
      const stmt = sqliteDb.prepare(sqliteText);
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    } else {
      const stmt = sqliteDb.prepare(sqliteText);
      const result = stmt.run(...params);
      return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  }
}

// Database Initialization
export async function initDatabase() {
  console.log('Initializing database tables...');
  try {
    if (usePostgres) {
      // Postgres schema
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          vehicle_plate VARCHAR(50) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          register_number VARCHAR(50) NOT NULL DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          user_name VARCHAR(100) NOT NULL,
          service_type VARCHAR(50) NOT NULL,
          vehicle_type VARCHAR(50) NOT NULL,
          charging_type VARCHAR(50) NOT NULL,
          battery_percentage INTEGER,
          distance_km NUMERIC(10, 2),
          power_needed_kwh NUMERIC(10, 2),
          total_amount NUMERIC(10, 2),
          payment_type VARCHAR(50) NOT NULL,
          location VARCHAR(255),
          station_name VARCHAR(100),
          delay_minutes INTEGER DEFAULT 0,
          booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS feedbacks (
          id SERIAL PRIMARY KEY,
          user_name VARCHAR(100) NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comments TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      // SQLite schema
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          vehicle_plate TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          register_number TEXT NOT NULL DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_name TEXT NOT NULL,
          service_type TEXT NOT NULL,
          vehicle_type TEXT NOT NULL,
          charging_type TEXT NOT NULL,
          battery_percentage INTEGER,
          distance_km REAL,
          power_needed_kwh REAL,
          total_amount REAL,
          payment_type TEXT NOT NULL,
          location TEXT,
          station_name TEXT,
          delay_minutes INTEGER DEFAULT 0,
          booking_time DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS feedbacks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_name TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comments TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // Migration to add column if database already existed
    try {
      if (usePostgres) {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS register_number VARCHAR(50) NOT NULL DEFAULT '';`);
      } else {
        await query(`ALTER TABLE users ADD COLUMN register_number TEXT NOT NULL DEFAULT '';`);
      }
      console.log('Applied register_number column migration successfully.');
    } catch (migError) {
      // Catch duplicate column error in SQLite
      console.log('Migration note (column register_number may already exist):');
    }

    console.log('Database tables successfully verified/created.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}
