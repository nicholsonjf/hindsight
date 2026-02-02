import Database, { type Database as DatabaseType } from 'better-sqlite3';
import type { Worklog, CreateWorklogRequest } from './contract.js';

const db: DatabaseType = new Database('worklogs.db');

// Initialize the database schema
export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS worklogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      log TEXT NOT NULL
    )
  `);
}

// Create a new worklog entry
export function createWorklog(data: CreateWorklogRequest): Worklog {
  const stmt = db.prepare(`
    INSERT INTO worklogs (timestamp, log)
    VALUES (?, ?)
  `);

  const result = stmt.run(data.timestamp, data.log);

  return {
    id: Number(result.lastInsertRowid),
    timestamp: data.timestamp,
    log: data.log,
  };
}

// Get worklogs within a time range
export function getWorklogs(start: number, end: number): Worklog[] {
  const stmt = db.prepare(`
    SELECT id, timestamp, log
    FROM worklogs
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY id
  `);

  const rows = stmt.all(start, end) as Worklog[];
  return rows;
}

// Get worklog counts grouped by day
export function getWorklogCountsByDay(
  start: number,
  end: number
): { day: string; count: number }[] {
  const stmt = db.prepare(`
    SELECT
      date(timestamp, 'unixepoch', 'localtime') as day,
      COUNT(*) as count
    FROM worklogs
    WHERE timestamp >= ? AND timestamp <= ?
    GROUP BY day
    ORDER BY day
  `);

  const rows = stmt.all(start, end) as { day: string; count: number }[];
  return rows;
}

// Export database instance for testing/debugging
export { db };
