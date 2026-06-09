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

CREATE TABLE IF NOT EXISTS performance_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK(period_type IN ('monthly', 'quarterly', 'yearly')),
  hours_weight REAL NOT NULL DEFAULT 0.3,
  pass_rate_weight REAL NOT NULL DEFAULT 0.25,
  evaluation_weight REAL NOT NULL DEFAULT 0.2,
  attendance_weight REAL NOT NULL DEFAULT 0.15,
  violation_weight REAL NOT NULL DEFAULT 0.1,
  excellent_score REAL NOT NULL DEFAULT 90,
  good_score REAL NOT NULL DEFAULT 75,
  pass_score REAL NOT NULL DEFAULT 60,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coach_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL REFERENCES users(id),
  period_type TEXT NOT NULL CHECK(period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_hours REAL NOT NULL DEFAULT 0,
  target_hours REAL NOT NULL DEFAULT 0,
  hours_achievement REAL NOT NULL DEFAULT 0,
  student_count INTEGER NOT NULL DEFAULT 0,
  pass_count INTEGER NOT NULL DEFAULT 0,
  exam_count INTEGER NOT NULL DEFAULT 0,
  pass_rate REAL NOT NULL DEFAULT 0,
  avg_evaluation_score REAL NOT NULL DEFAULT 0,
  on_time_rate REAL NOT NULL DEFAULT 0,
  violation_count INTEGER NOT NULL DEFAULT 0,
  violation_deduction REAL NOT NULL DEFAULT 0,
  composite_score REAL NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'pending' CHECK(grade IN ('excellent', 'good', 'pass', 'fail', 'pending')),
  ranking INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  remark TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teaching_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL REFERENCES users(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  attendance_id INTEGER REFERENCES attendance(id),
  course_type TEXT NOT NULL CHECK(course_type IN ('subject1', 'subject2', 'subject3', 'subject4')),
  professional_score INTEGER NOT NULL DEFAULT 0 CHECK(professional_score >= 0 AND professional_score <= 5),
  patience_score INTEGER NOT NULL DEFAULT 0 CHECK(patience_score >= 0 AND patience_score <= 5),
  communication_score INTEGER NOT NULL DEFAULT 0 CHECK(communication_score >= 0 AND communication_score <= 5),
  punctuality_score INTEGER NOT NULL DEFAULT 0 CHECK(punctuality_score >= 0 AND punctuality_score <= 5),
  overall_score REAL NOT NULL DEFAULT 0,
  comment TEXT,
  tags TEXT,
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('pending', 'published', 'hidden')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_learning_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  analysis_date TEXT NOT NULL,
  course_type TEXT NOT NULL CHECK(course_type IN ('subject1', 'subject2', 'subject3', 'subject4')),
  total_hours REAL NOT NULL DEFAULT 0,
  training_days INTEGER NOT NULL DEFAULT 0,
  avg_hours_per_day REAL NOT NULL DEFAULT 0,
  weekly_frequency REAL NOT NULL DEFAULT 0,
  recent_trend TEXT NOT NULL DEFAULT 'stable' CHECK(recent_trend IN ('improving', 'stable', 'declining')),
  weak_points TEXT,
  strong_points TEXT,
  learning_efficiency REAL NOT NULL DEFAULT 0,
  expected_completion_date TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK(risk_level IN ('low', 'medium', 'high')),
  suggestions TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, course_type, analysis_date)
);

CREATE TABLE IF NOT EXISTS violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  violation_type TEXT NOT NULL CHECK(violation_type IN (
    'coach_late', 'coach_absent', 'coach_early_leave',
    'coach_smoking', 'coach_verbal_abuse', 'coach_solicit_fee',
    'student_late', 'student_absent', 'student_misconduct',
    'cheating', 'safety_violation', 'equipment_misuse', 'other'
  )),
  violator_type TEXT NOT NULL CHECK(violator_type IN ('coach', 'student')),
  violator_id INTEGER NOT NULL,
  reporter_id INTEGER REFERENCES users(id),
  related_attendance_id INTEGER REFERENCES attendance(id),
  related_schedule_id INTEGER REFERENCES schedules(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT,
  occurrence_time TEXT NOT NULL,
  location TEXT,
  severity TEXT NOT NULL DEFAULT 'minor' CHECK(severity IN ('minor', 'moderate', 'major', 'serious')),
  penalty_type TEXT CHECK(penalty_type IN ('warning', 'fine', 'suspension', 'termination', 'other')),
  penalty_detail TEXT,
  penalty_amount REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'investigating', 'confirmed', 'appealed', 'resolved', 'cancelled')),
  handler_id INTEGER REFERENCES users(id),
  handled_at TEXT,
  resolution_note TEXT,
  is_appealed INTEGER NOT NULL DEFAULT 0,
  appeal_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coach_hourly_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL REFERENCES users(id),
  course_type TEXT NOT NULL CHECK(course_type IN ('subject1', 'subject2', 'subject3', 'subject4')),
  hourly_rate REAL NOT NULL DEFAULT 0,
  effective_date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(coach_id, course_type, effective_date)
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
INSERT OR IGNORE INTO performance_rules (period_type, hours_weight, pass_rate_weight, evaluation_weight, attendance_weight, violation_weight, excellent_score, good_score, pass_score) VALUES ('monthly', 0.3, 0.25, 0.2, 0.15, 0.1, 90, 75, 60);
INSERT OR IGNORE INTO performance_rules (period_type, hours_weight, pass_rate_weight, evaluation_weight, attendance_weight, violation_weight, excellent_score, good_score, pass_score) VALUES ('quarterly', 0.3, 0.25, 0.2, 0.15, 0.1, 90, 75, 60);
INSERT OR IGNORE INTO performance_rules (period_type, hours_weight, pass_rate_weight, evaluation_weight, attendance_weight, violation_weight, excellent_score, good_score, pass_score) VALUES ('yearly', 0.3, 0.25, 0.2, 0.15, 0.1, 90, 75, 60);
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (2, 'subject1', 50.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (2, 'subject2', 80.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (2, 'subject3', 100.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (2, 'subject4', 60.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (3, 'subject1', 50.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (3, 'subject2', 80.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (3, 'subject3', 100.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (3, 'subject4', 60.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (4, 'subject1', 50.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (4, 'subject2', 80.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (4, 'subject3', 100.0, '2024-01-01');
INSERT OR IGNORE INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (4, 'subject4', 60.0, '2024-01-01');
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
