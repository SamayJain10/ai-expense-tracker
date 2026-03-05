import Database from 'better-sqlite3';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Expense {
  id: number;
  amount: number;
  currency: string;
  category: string;
  description: string;
  merchant: string | null;
  original_input: string;
  created_at: string;
}

export interface CreateExpenseInput {
  amount: number;
  currency?: string;
  category: string;
  description: string;
  merchant?: string | null;
  original_input: string;
}

// ─── Connection ───────────────────────────────────────────────────────────────

const DB_PATH = path.resolve(process.env.DB_PATH ?? './expenses.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // better write performance
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      amount         DECIMAL(10, 2)  NOT NULL,
      currency       VARCHAR(3)      NOT NULL DEFAULT 'INR',
      category       VARCHAR(50)     NOT NULL,
      description    TEXT            NOT NULL,
      merchant       VARCHAR(100),
      original_input TEXT            NOT NULL,
      created_at     TIMESTAMP       NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `);

  console.log(`✅ Database ready at ${DB_PATH}`);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────


export function createExpense(input: CreateExpenseInput): Expense {
  const db = getDb();

  const stmt = db.prepare<[number, string, string, string, string | null, string]>(`
    INSERT INTO expenses (amount, currency, category, description, merchant, original_input)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const { lastInsertRowid } = stmt.run(
    input.amount,
    input.currency ?? 'INR',
    input.category,
    input.description,
    input.merchant ?? null,
    input.original_input,
  );

  return getExpenseById(Number(lastInsertRowid))!;
}


export function getAllExpenses(): Expense[] {
  const db = getDb();

  return db
    .prepare<[], Expense>(`SELECT * FROM expenses ORDER BY created_at DESC`)
    .all();
}


export function deleteExpense(id: number): boolean {
  const db = getDb();

  const { changes } = db
    .prepare<[number]>(`DELETE FROM expenses WHERE id = ?`)
    .run(id);

  return changes > 0;
}


function getExpenseById(id: number): Expense | undefined {
  return getDb()
    .prepare<[number], Expense>(`SELECT * FROM expenses WHERE id = ?`)
    .get(id);
}