import Database from 'better-sqlite3';

export type DB = Database.Database;

export function openDb(file = process.env.ECMS_DB ?? 'ecms.db'): DB {
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS centers (id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT, phone TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, center_id TEXT NOT NULL REFERENCES centers(id), name TEXT NOT NULL, capacity INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'normal', active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS holidays (date TEXT NOT NULL, center_id TEXT, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, center_id TEXT, pass TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions_auth (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, level TEXT, sessions INTEGER NOT NULL, minutes INTEGER NOT NULL DEFAULT 90, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS course_prices (course_id TEXT NOT NULL REFERENCES courses(id), center_id TEXT NOT NULL REFERENCES centers(id), price INTEGER NOT NULL, PRIMARY KEY (course_id, center_id));
CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, center_id TEXT NOT NULL REFERENCES centers(id), name TEXT NOT NULL, phone TEXT, kind TEXT NOT NULL DEFAULT 'vn', user_id TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, center_id TEXT NOT NULL REFERENCES centers(id), name TEXT NOT NULL, dob TEXT, school TEXT, note TEXT, guardian_name TEXT NOT NULL, guardian_phone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, center_id TEXT NOT NULL REFERENCES centers(id), course_id TEXT NOT NULL REFERENCES courses(id), teacher_id TEXT REFERENCES teachers(id), room_id TEXT REFERENCES rooms(id), weekdays TEXT NOT NULL, start_time TEXT NOT NULL, minutes INTEGER NOT NULL, start_date TEXT NOT NULL, capacity INTEGER NOT NULL DEFAULT 15, status TEXT NOT NULL DEFAULT 'open');
CREATE TABLE IF NOT EXISTS class_sessions (id TEXT PRIMARY KEY, class_id TEXT NOT NULL REFERENCES classes(id), n INTEGER NOT NULL, date TEXT NOT NULL, start_time TEXT NOT NULL, minutes INTEGER NOT NULL, teacher_id TEXT, room_id TEXT, status TEXT NOT NULL DEFAULT 'planned', topic TEXT);
CREATE INDEX IF NOT EXISTS ix_cs_date ON class_sessions(date);
CREATE TABLE IF NOT EXISTS enrollments (id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id), class_id TEXT NOT NULL REFERENCES classes(id), course_id TEXT NOT NULL REFERENCES courses(id), center_id TEXT NOT NULL, gross INTEGER NOT NULL, discount INTEGER NOT NULL DEFAULT 0, net INTEGER NOT NULL, sessions_bought INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_by TEXT NOT NULL, created_at TEXT NOT NULL, note TEXT);
CREATE TABLE IF NOT EXISTS ledger (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, enrollment_id TEXT NOT NULL REFERENCES enrollments(id), type TEXT NOT NULL, sessions INTEGER NOT NULL, makeup INTEGER NOT NULL, reason TEXT, actor TEXT NOT NULL, at TEXT NOT NULL, reverses TEXT, approved_by TEXT, ref TEXT);
CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL REFERENCES enrollments(id), amount INTEGER NOT NULL, method TEXT NOT NULL, at TEXT NOT NULL, actor TEXT NOT NULL, note TEXT, voided_reason TEXT, voided_at TEXT, adjusts_id TEXT);
CREATE TABLE IF NOT EXISTS attendance (session_id TEXT NOT NULL REFERENCES class_sessions(id), enrollment_id TEXT NOT NULL REFERENCES enrollments(id), status TEXT NOT NULL, ledger_id TEXT, note TEXT, by_user TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY (session_id, enrollment_id));
CREATE TABLE IF NOT EXISTS refunds (id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL REFERENCES enrollments(id), amount INTEGER NOT NULL, fee INTEGER NOT NULL, gross INTEGER NOT NULL, sessions INTEGER NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'wait', needs_admin INTEGER NOT NULL DEFAULT 0, requested_by TEXT NOT NULL, requested_at TEXT NOT NULL, decided_by TEXT, decided_at TEXT, decision_note TEXT);
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, detail TEXT);
`;

export const uid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

export function audit(db: DB, actor: string, action: string, entity: string, entityId: string | null, detail?: unknown) {
  db.prepare('INSERT INTO audit(at,actor,action,entity,entity_id,detail) VALUES (?,?,?,?,?,?)').run(nowIso(), actor, action, entity, entityId, detail === undefined ? null : JSON.stringify(detail));
}
