import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

export type { Database };

let db: Database;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const dbPath = path.join(process.cwd(), 'data', 'driving-school.db');

function saveDb() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.error('Failed to save database:', e);
    }
    saveTimer = null;
  }, 100);
}

export function getDb(): Database {
  return db;
}

export function queryAll(sql: string, params?: any[]): any[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(sql: string, params?: any[]): any | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params?: any[]): void {
  if (params) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
  saveDb();
}

export function getLastInsertId(): number {
  const result = db.exec('SELECT last_insert_rowid() as id');
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0] as number;
  }
  return 0;
}

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'coach')),
  name TEXT NOT NULL,
  phone TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT CHECK(gender IN ('male', 'female')),
  id_card TEXT UNIQUE,
  phone TEXT,
  training_type TEXT NOT NULL CHECK(training_type IN ('C1', 'C2', 'A1', 'A2', 'B1', 'B2')),
  stage TEXT NOT NULL DEFAULT 'subject1' CHECK(stage IN ('subject1', 'subject2', 'subject3', 'subject4')),
  enroll_date TEXT NOT NULL,
  expected_complete_date TEXT,
  coach_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'suspended')),
  remark TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL REFERENCES users(id),
  course_type TEXT NOT NULL CHECK(course_type IN ('subject1', 'subject2', 'subject3', 'subject4')),
  schedule_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  max_students INTEGER NOT NULL DEFAULT 4,
  current_students INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'full', 'cancelled')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES schedules(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  status TEXT NOT NULL DEFAULT 'booked' CHECK(status IN ('booked', 'cancelled', 'completed')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  schedule_id INTEGER REFERENCES schedules(id),
  coach_id INTEGER NOT NULL REFERENCES users(id),
  course_type TEXT NOT NULL CHECK(course_type IN ('subject1', 'subject2', 'subject3', 'subject4')),
  check_in_time TEXT NOT NULL,
  check_out_time TEXT,
  duration_hours REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'checked_in' CHECK(status IN ('checked_in', 'completed')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_type TEXT NOT NULL UNIQUE CHECK(course_type IN ('subject1', 'subject2', 'subject3', 'subject4')),
  required_hours REAL NOT NULL,
  warning_threshold REAL NOT NULL DEFAULT 0.8,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  course_type TEXT NOT NULL,
  current_hours REAL NOT NULL DEFAULT 0,
  required_hours REAL NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'ignored')),
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS export_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  export_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  filter_params TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'processing' CHECK(status IN ('processing', 'completed', 'failed')),
  created_at TEXT DEFAULT (datetime('now'))
);
`;

const INSERT_SEED_DATA = `
INSERT OR IGNORE INTO users (username, password, role, name, phone) VALUES ('admin', 'admin123', 'admin', '系统管理员', '13800000000');
INSERT OR IGNORE INTO users (username, password, role, name, phone) VALUES ('coach1', 'coach123', 'coach', '王教练', '13800000001');
INSERT OR IGNORE INTO users (username, password, role, name, phone) VALUES ('coach2', 'coach123', 'coach', '李教练', '13800000002');
INSERT OR IGNORE INTO users (username, password, role, name, phone) VALUES ('coach3', 'coach123', 'coach', '张教练', '13800000003');
INSERT OR IGNORE INTO alert_rules (course_type, required_hours, warning_threshold) VALUES ('subject1', 12, 0.8);
INSERT OR IGNORE INTO alert_rules (course_type, required_hours, warning_threshold) VALUES ('subject2', 16, 0.8);
INSERT OR IGNORE INTO alert_rules (course_type, required_hours, warning_threshold) VALUES ('subject3', 24, 0.8);
INSERT OR IGNORE INTO alert_rules (course_type, required_hours, warning_threshold) VALUES ('subject4', 10, 0.8);
`;

export async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.exec(CREATE_TABLES);
  db.exec(INSERT_SEED_DATA);

  saveDb();

  console.log('Database initialized successfully');
  return db;
}
