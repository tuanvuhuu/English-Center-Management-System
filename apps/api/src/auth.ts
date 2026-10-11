import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { type DB, nowIso } from './db.js';

export type Role = 'admin' | 'manager' | 'academic' | 'teacher' | 'accountant' | 'frontdesk';
export interface User { id: string; username: string; name: string; role: Role; centerId: string | null }

export function hashPass(p: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(p, salt, 32).toString('hex')}`;
}
export function checkPass(p: string, stored: string): boolean {
  const [salt, h] = stored.split(':');
  if (!salt || !h) return false;
  const a = Buffer.from(h, 'hex'), b = scryptSync(p, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function login(db: DB, username: string, password: string): { token: string; user: User } | null {
  const u = db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(username) as any;
  if (!u || !checkPass(password, u.pass)) return null;
  const token = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions_auth(token,user_id,created_at) VALUES (?,?,?)').run(token, u.id, nowIso());
  return { token, user: { id: u.id, username: u.username, name: u.name, role: u.role, centerId: u.center_id } };
}

export function userFromReq(db: DB, req: FastifyRequest): User | null {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const u = db.prepare('SELECT u.* FROM sessions_auth s JOIN users u ON u.id=s.user_id WHERE s.token=? AND u.active=1').get(token) as any;
  return u ? { id: u.id, username: u.username, name: u.name, role: u.role, centerId: u.center_id } : null;
}

/** Ma trận quyền gọn: hành động → vai trò được phép. */
export const CAN = {
  studentWrite: ['admin', 'manager', 'academic', 'frontdesk'],
  classWrite: ['admin', 'manager', 'academic'],
  enroll: ['admin', 'manager', 'frontdesk'],
  receipt: ['admin', 'manager', 'accountant', 'frontdesk'],
  voidReceipt: ['admin', 'manager', 'accountant'],
  attendance: ['admin', 'manager', 'academic', 'teacher'],
  refundRequest: ['admin', 'manager', 'frontdesk'],
  refundDecide: ['admin', 'manager'],
  adjust: ['admin', 'manager'],
  report: ['admin', 'manager', 'accountant'],
  config: ['admin'],
} as const satisfies Record<string, readonly Role[]>;
