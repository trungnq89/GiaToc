import SQLite, { SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);
SQLite.DEBUG(false);

const DATABASE_NAME = 'giatoc.db';

let dbInstance: SQLiteDatabase | null = null;
let openPromise: Promise<SQLiteDatabase> | null = null;

const SCHEMA_STATEMENTS: string[] = [
  // Thông tin Tôi (User Profile)
  `CREATE TABLE IF NOT EXISTS user_profile (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    birth_year INTEGER,
    avatar_uri TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  // Danh sách Người thân (Persons)
  `CREATE TABLE IF NOT EXISTS persons (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    gender TEXT NOT NULL,
    avatar_uri TEXT,
    branch TEXT NOT NULL DEFAULT 'noi',
    custom_relation_to_me TEXT,
    inferred_relation_to_me TEXT,
    how_they_call_me TEXT,
    birth_date TEXT,
    birth_year INTEGER,
    is_deceased INTEGER NOT NULL DEFAULT 0,
    death_date TEXT,
    death_date_lunar TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    generation INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_persons_name ON persons (name);`,
  `CREATE INDEX IF NOT EXISTS idx_persons_branch ON persons (branch);`,
  `CREATE INDEX IF NOT EXISTS idx_persons_generation ON persons (generation);`,

  // Quan hệ gia phả trực hệ (Relationships: Parent, Spouse, Child, Sibling)
  `CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY NOT NULL,
    person_id TEXT NOT NULL,
    related_person_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (person_id) REFERENCES persons (id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_rel_person ON relationships (person_id);`,
  `CREATE INDEX IF NOT EXISTS idx_rel_related ON relationships (related_person_id);`,

  // Ngày giỗ & Sự kiện gia tộc (Memorial Events)
  `CREATE TABLE IF NOT EXISTS memorial_events (
    id TEXT PRIMARY KEY NOT NULL,
    person_id TEXT NOT NULL,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'death_anniversary',
    lunar_day INTEGER,
    lunar_month INTEGER,
    solar_date TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (person_id) REFERENCES persons (id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_events_person ON memorial_events (person_id);`,
];

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.executeSql('PRAGMA foreign_keys = ON;');
  for (const statement of SCHEMA_STATEMENTS) {
    await db.executeSql(statement);
  }
}

/** Returns the singleton SQLite connection, opening + migrating on first use. */
export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (!openPromise) {
    openPromise = SQLite.openDatabase({
      name: DATABASE_NAME,
      location: 'default',
    }).then(async db => {
      await runMigrations(db);
      dbInstance = db;
      return db;
    });
  }
  return openPromise;
}

/** Helper: Run a write statement (INSERT/UPDATE/DELETE). */
export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getDatabase();
  await db.executeSql(sql, params);
}

/** Helper: Run a SELECT and return all rows as plain typed objects. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDatabase();
  const [result] = await db.executeSql(sql, params);
  const rows: T[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i));
  }
  return rows;
}

/** Helper: Run a SELECT and return the first row or null. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Helper: Run multiple write statements atomically inside a transaction. */
export async function transaction(work: (tx: Transaction) => void): Promise<void> {
  const db = await getDatabase();
  await db.transaction(work);
}
