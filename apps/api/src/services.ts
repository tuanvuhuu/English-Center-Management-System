import * as D from '@ecms/domain';
import { type DB, uid, nowIso, audit } from './db.js';
import type { User } from './auth.js';

export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
export const bad = (m: string) => new HttpError(400, m);
export const notFound = (m = 'Không tìm thấy') => new HttpError(404, m);
export const forbidden = (m = 'Không có quyền thực hiện') => new HttpError(403, m);
export const conflict = (m: string) => new HttpError(409, m);

export const policy = D.DEFAULT_POLICY;

/* ---------- phạm vi trung tâm ---------- */
export function scopeCenter(user: User, requested?: string | null): string | null {
  if (user.role === 'admin') return requested || null;
  if (requested && requested !== user.centerId) throw forbidden('Không thuộc trung tâm của bạn');
  return user.centerId;
}
export function assertCenter(user: User, centerId: string) {
  if (user.role !== 'admin' && user.centerId !== centerId) throw forbidden('Không thuộc trung tâm của bạn');
}

/* ---------- sổ phát sinh ---------- */
export function loadEntries(db: DB, enrollmentId: string): D.SessionEntry[] {
  return (db.prepare('SELECT * FROM ledger WHERE enrollment_id=? ORDER BY seq').all(enrollmentId) as any[]).map((r) => ({
    id: r.id, enrollmentId: r.enrollment_id, type: r.type, sessions: r.sessions, makeup: r.makeup, reason: r.reason ?? undefined,
    actor: r.actor, at: r.at, reverses: r.reverses ?? undefined, approvedBy: r.approved_by ?? undefined,
  }));
}

/** Thêm một dòng vào sổ qua domain (kiểm tra bất biến) rồi ghi DB. Dòng cũ không bao giờ bị sửa. */
export function addEntry(db: DB, e: Omit<D.SessionEntry, 'id' | 'at'> & { ref?: string }, opts?: { maxDebt?: number }): D.SessionEntry {
  const entries = loadEntries(db, e.enrollmentId);
  const entry: D.SessionEntry = { ...e, id: uid(), at: nowIso() };
  try { D.append(entries, entry, opts); } catch (err) { throw bad((err as Error).message); }
  const seq = (db.prepare('SELECT COALESCE(MAX(seq),0)+1 AS s FROM ledger WHERE enrollment_id=?').get(e.enrollmentId) as any).s;
  db.prepare('INSERT INTO ledger(id,seq,enrollment_id,type,sessions,makeup,reason,actor,at,reverses,approved_by,ref) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(entry.id, seq, entry.enrollmentId, entry.type, entry.sessions, entry.makeup, entry.reason ?? null, entry.actor, entry.at, entry.reverses ?? null, entry.approvedBy ?? null, e.ref ?? null);
  return entry;
}

export function reverseEntry(db: DB, enrollmentId: string, targetId: string, user: User, reason: string) {
  const entries = loadEntries(db, enrollmentId);
  let next: D.SessionEntry[];
  try { next = D.reverse(entries, targetId, { id: uid(), actor: user.id, at: nowIso(), reason, approvedBy: user.id }); } catch (e) { throw bad((e as Error).message); }
  const r = next[next.length - 1]!;
  const seq = (db.prepare('SELECT COALESCE(MAX(seq),0)+1 AS s FROM ledger WHERE enrollment_id=?').get(enrollmentId) as any).s;
  db.prepare('INSERT INTO ledger(id,seq,enrollment_id,type,sessions,makeup,reason,actor,at,reverses,approved_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(r.id, seq, enrollmentId, 'reversal', r.sessions, r.makeup, reason, user.id, r.at, targetId, user.id);
  return r;
}

/* ---------- tiền ---------- */
export function loadReceipts(db: DB, enrollmentId: string): D.Receipt[] {
  return (db.prepare('SELECT * FROM receipts WHERE enrollment_id=? ORDER BY at, rowid').all(enrollmentId) as any[]).map((r) => ({
    id: r.id, enrollmentId: r.enrollment_id, amount: r.amount, at: r.at, adjustsId: r.adjusts_id ?? undefined,
    voided: r.voided_at ? { reason: r.voided_reason, at: r.voided_at } : undefined,
  }));
}

/** Số buổi đã tiêu = bought + gift... đơn giản: bought - số dư hiện tại (không tính hoàn/chuyển). */
export function enrollmentSummary(db: DB, enrollmentId: string) {
  const en = db.prepare('SELECT * FROM enrollments WHERE id=?').get(enrollmentId) as any;
  if (!en) throw notFound('Không tìm thấy ghi danh');
  const entries = loadEntries(db, enrollmentId);
  const bal = D.balanceOf(entries, enrollmentId);
  const consumed = Math.max(0, en.sessions_bought - bal.sessions - entries.filter((e) => e.type === 'refund').reduce((s, e) => s - e.sessions, 0));
  const receipts = loadReceipts(db, enrollmentId);
  const money = D.money4({ net: en.net, receipts, sessionsBought: en.sessions_bought, sessionsConsumed: consumed });
  return { enrollment: en, balance: bal, remaining: D.visibleRemaining(bal), consumed, money, entries, receipts };
}

/* ---------- lớp & lịch ---------- */
export function generateSessions(db: DB, classId: string) {
  const c = db.prepare('SELECT c.*, co.sessions AS total FROM classes c JOIN courses co ON co.id=c.course_id WHERE c.id=?').get(classId) as any;
  const days: number[] = JSON.parse(c.weekdays); // 0=CN … 6=T7
  const hol = new Set((db.prepare('SELECT date FROM holidays WHERE center_id IS NULL OR center_id=?').all(c.center_id) as any[]).map((h) => h.date));
  const ins = db.prepare('INSERT INTO class_sessions(id,class_id,n,date,start_time,minutes,teacher_id,room_id) VALUES (?,?,?,?,?,?,?,?)');
  let d = new Date(c.start_date + 'T00:00:00Z'); let n = 0; let guard = 0;
  while (n < c.total && guard++ < 1500) {
    const iso = d.toISOString().slice(0, 10);
    if (days.includes(d.getUTCDay()) && !hol.has(iso)) { n++; ins.run(uid(), classId, n, iso, c.start_time, c.minutes, c.teacher_id, c.room_id); }
    d = new Date(d.getTime() + 86_400_000);
  }
}

const endMin = (t: string, minutes: number) => { const [h, m] = t.split(':').map(Number); return h! * 60 + m! + minutes; };
const startMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h! * 60 + m!; };

/** Phát hiện trùng phòng / trùng giáo viên với các buổi đã có (trừ lớp đang sửa). */
export function classConflicts(db: DB, p: { classId?: string; roomId?: string | null; teacherId?: string | null; weekdays: number[]; startTime: string; minutes: number; startDate: string; total: number; centerId: string }): string[] {
  const out: string[] = [];
  const s1 = startMin(p.startTime), e1 = endMin(p.startTime, p.minutes);
  const rows = db.prepare(`SELECT c.code, c.weekdays, c.start_time, c.minutes, c.room_id, c.teacher_id FROM classes c WHERE c.status<>'cancelled' AND c.center_id=? AND c.id<>?`).all(p.centerId, p.classId ?? '') as any[];
  for (const r of rows) {
    const shared = (JSON.parse(r.weekdays) as number[]).some((d) => p.weekdays.includes(d));
    if (!shared) continue;
    const s2 = startMin(r.start_time), e2 = endMin(r.start_time, r.minutes);
    if (s1 < e2 && s2 < e1) {
      if (p.roomId && r.room_id === p.roomId) out.push(`Trùng phòng với lớp ${r.code}`);
      if (p.teacherId && r.teacher_id === p.teacherId) out.push(`Trùng giáo viên với lớp ${r.code}`);
    }
  }
  return out;
}

export function classRoster(db: DB, classId: string) {
  return db.prepare(`SELECT e.id AS enrollment_id, e.status, s.id AS student_id, s.code, s.name, s.guardian_phone FROM enrollments e JOIN students s ON s.id=e.student_id WHERE e.class_id=? AND e.status IN ('active','frozen') ORDER BY s.name`).all(classId);
}

/* ---------- điểm danh ---------- */
export type MarkStatus = D.AttendanceStatus;

export function markAttendance(db: DB, user: User, sessionId: string, marks: { enrollmentId: string; status: MarkStatus; note?: string }[], opts: { approvedReason?: string; now?: string } = {}) {
  const s = db.prepare('SELECT cs.*, c.center_id, c.teacher_id AS class_teacher FROM class_sessions cs JOIN classes c ON c.id=cs.class_id WHERE cs.id=?').get(sessionId) as any;
  if (!s) throw notFound('Không tìm thấy buổi học');
  assertCenter(user, s.center_id);
  if (s.status === 'cancelled') throw conflict('Buổi học đã bị hủy');
  if (user.role === 'teacher') {
    const t = db.prepare('SELECT id FROM teachers WHERE user_id=?').get(user.id) as any;
    if (!t || (t.id !== s.teacher_id && t.id !== s.class_teacher)) throw forbidden('Bạn không phụ trách buổi này');
  }
  const now = opts.now ?? nowIso();
  const end = new Date(Date.parse(`${s.date}T${s.start_time}:00Z`) + s.minutes * 60_000).toISOString();
  const monthClosed = false; // chưa có khóa sổ tháng
  const canApprove = user.role === 'admin' || user.role === 'manager';
  const chk = D.canEdit({ sessionEnd: end, now, monthClosed, approvedBy: canApprove && opts.approvedReason ? user.id : undefined, reason: opts.approvedReason }, policy);
  if (!chk.ok) throw conflict(chk.why);

  const tx = db.transaction(() => {
    for (const m of marks) {
      const en = db.prepare('SELECT * FROM enrollments WHERE id=? AND class_id=?').get(m.enrollmentId, s.class_id) as any;
      if (!en) throw bad('Học viên không thuộc lớp này');
      if (en.status !== 'active') throw bad('Ghi danh không ở trạng thái đang học');
      const prev = db.prepare('SELECT * FROM attendance WHERE session_id=? AND enrollment_id=?').get(sessionId, m.enrollmentId) as any;
      if (prev?.status === m.status) continue;
      if (prev?.ledger_id) reverseEntry(db, m.enrollmentId, prev.ledger_id, user, `Sửa điểm danh buổi ${s.n}: ${prev.status} → ${m.status}`);
      let type = D.toEntryType(m.status);
      let eff = D.EFFECT[type];
      if (type === 'absent_excused') {
        const granted = (db.prepare(`SELECT COUNT(*) AS c FROM ledger WHERE enrollment_id=? AND type='absent_excused'`).get(m.enrollmentId) as any).c;
        if (!D.canGrantMakeup(en.sessions_bought, granted, policy)) { type = 'absent_unexcused'; eff = D.EFFECT.absent_unexcused; }
      }
      const entry = addEntry(db, { enrollmentId: m.enrollmentId, type, ...eff, actor: user.id, reason: `Buổi ${s.n} ngày ${s.date}`, ref: sessionId }, { maxDebt: policy.maxSessionDebt });
      db.prepare('INSERT INTO attendance(session_id,enrollment_id,status,ledger_id,note,by_user,at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(session_id,enrollment_id) DO UPDATE SET status=excluded.status, ledger_id=excluded.ledger_id, note=excluded.note, by_user=excluded.by_user, at=excluded.at')
        .run(sessionId, m.enrollmentId, m.status, entry.id, m.note ?? null, user.id, now);
    }
    if (s.status === 'planned') db.prepare(`UPDATE class_sessions SET status='done' WHERE id=?`).run(sessionId);
    audit(db, user.id, 'attendance', 'class_session', sessionId, { n: marks.length });
  });
  tx();
}

/* ---------- ghi danh ---------- */
export function createEnrollment(db: DB, user: User, p: { studentId: string; classId: string; discounts?: D.Discount[]; note?: string }) {
  const st = db.prepare('SELECT * FROM students WHERE id=?').get(p.studentId) as any;
  const cl = db.prepare('SELECT c.*, co.sessions AS total FROM classes c JOIN courses co ON co.id=c.course_id WHERE c.id=?').get(p.classId) as any;
  if (!st) throw notFound('Không tìm thấy học viên');
  if (!cl) throw notFound('Không tìm thấy lớp');
  assertCenter(user, cl.center_id);
  if (st.center_id !== cl.center_id) throw bad('Học viên và lớp phải cùng trung tâm');
  if (cl.status === 'cancelled' || cl.status === 'ended') throw conflict('Lớp đã kết thúc hoặc bị hủy');
  const existing = db.prepare('SELECT student_id AS studentId, course_id AS courseId, center_id AS centerId, status FROM enrollments WHERE student_id=?').all(p.studentId) as any[];
  if (D.isDuplicate(existing, { studentId: p.studentId, courseId: cl.course_id, centerId: cl.center_id })) throw conflict('Học viên đã ghi danh khóa này và còn hiệu lực');
  const count = (db.prepare(`SELECT COUNT(*) c FROM enrollments WHERE class_id=? AND status IN ('active','frozen')`).get(p.classId) as any).c;
  if (count >= cl.capacity) throw conflict(`Lớp đã đủ sĩ số (${cl.capacity})`);
  const price = db.prepare('SELECT price FROM course_prices WHERE course_id=? AND center_id=?').get(cl.course_id, cl.center_id) as any;
  if (!price) throw bad('Khóa này chưa có giá tại trung tâm');
  // vào lớp muộn: số buổi = buổi còn lại của lớp, học phí theo tỉ lệ
  const left = (db.prepare(`SELECT COUNT(*) c FROM class_sessions WHERE class_id=? AND status='planned'`).get(p.classId) as any).c;
  const bought = Math.min(cl.total, left || cl.total);
  const gross = D.valueOfSessions(price.price, cl.total, bought);
  const disc = D.applyDiscounts(gross, p.discounts ?? [], policy.maxDiscountCount, policy.maxDiscountRate);
  if (disc.needsApproval && user.role !== 'admin' && user.role !== 'manager') throw forbidden('Ưu đãi vượt mức cho phép: cần quản lý duyệt');
  const id = uid();
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO enrollments(id,student_id,class_id,course_id,center_id,gross,discount,net,sessions_bought,status,created_by,created_at,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, p.studentId, p.classId, cl.course_id, cl.center_id, gross, disc.total, disc.net, bought, 'active', user.id, nowIso(), p.note ?? null);
    addEntry(db, { enrollmentId: id, type: 'purchase', sessions: bought, makeup: 0, actor: user.id, reason: 'Mua khóa' });
    audit(db, user.id, 'create', 'enrollment', id, { student: p.studentId, class: p.classId, gross, discount: disc.total, net: disc.net, bought });
  });
  tx();
  return id;
}

export function addReceipt(db: DB, user: User, enrollmentId: string, amount: number, method: string, note?: string) {
  if (!Number.isInteger(amount) || amount <= 0) throw bad('Số tiền phải là số nguyên đồng lớn hơn 0');
  const sm = enrollmentSummary(db, enrollmentId);
  assertCenter(user, sm.enrollment.center_id);
  if (amount > sm.money.receivable) throw bad(`Số tiền vượt công nợ còn lại (${sm.money.receivable})`);
  const id = uid();
  db.prepare('INSERT INTO receipts(id,enrollment_id,amount,method,at,actor,note) VALUES (?,?,?,?,?,?,?)').run(id, enrollmentId, amount, method, nowIso(), user.id, note ?? null);
  audit(db, user.id, 'create', 'receipt', id, { enrollmentId, amount, method });
  return id;
}

export function voidOrAdjustReceipt(db: DB, user: User, receiptId: string, reason: string) {
  if (!reason?.trim()) throw bad('Bắt buộc có lý do');
  const r = db.prepare('SELECT * FROM receipts WHERE id=?').get(receiptId) as any;
  if (!r) throw notFound('Không tìm thấy phiếu thu');
  const en = db.prepare('SELECT center_id FROM enrollments WHERE id=?').get(r.enrollment_id) as any;
  assertCenter(user, en.center_id);
  const rec: D.Receipt = { id: r.id, enrollmentId: r.enrollment_id, amount: r.amount, at: r.at };
  const now = nowIso();
  try {
    const v = D.voidReceipt(rec, now, reason);
    db.prepare('UPDATE receipts SET voided_reason=?, voided_at=? WHERE id=?').run(v.voided!.reason, v.voided!.at, r.id);
    audit(db, user.id, 'void', 'receipt', r.id, { reason });
    return { mode: 'void' as const };
  } catch {
    if (r.voided_at) throw conflict('Phiếu đã hủy');
    const adj = D.adjustmentReceipt(rec, uid(), -r.amount, now, reason);
    db.prepare('INSERT INTO receipts(id,enrollment_id,amount,method,at,actor,note,adjusts_id) VALUES (?,?,?,?,?,?,?,?)').run(adj.id, r.enrollment_id, adj.amount, 'adjust', now, user.id, reason, r.id);
    audit(db, user.id, 'adjust', 'receipt', r.id, { reason, adjustment: adj.id });
    return { mode: 'adjust' as const };
  }
}

/* ---------- hoàn phí ---------- */
export function requestRefund(db: DB, user: User, enrollmentId: string, reason: string, opts: { centerCancelled?: boolean; discountClawback?: number; materials?: number }) {
  if (!reason?.trim()) throw bad('Bắt buộc có lý do');
  const sm = enrollmentSummary(db, enrollmentId);
  assertCenter(user, sm.enrollment.center_id);
  if (!['active', 'frozen'].includes(sm.enrollment.status)) throw conflict('Ghi danh không còn hiệu lực');
  if (db.prepare(`SELECT 1 FROM refunds WHERE enrollment_id=? AND status='wait'`).get(enrollmentId)) throw conflict('Đã có yêu cầu hoàn phí đang chờ duyệt');
  const calc = D.calcRefund({ net: sm.enrollment.net, sessionsBought: sm.enrollment.sessions_bought, sessionsRemaining: Math.max(0, sm.balance.sessions), discountClawback: opts.discountClawback ?? 0, materialsReceived: opts.materials ?? 0, centerCancelled: !!opts.centerCancelled }, policy);
  if (calc.blockedReason) throw conflict(calc.blockedReason);
  const amount = Math.min(calc.amount, sm.money.collected); // không hoàn quá số đã thu
  const id = uid();
  db.prepare('INSERT INTO refunds(id,enrollment_id,amount,fee,gross,sessions,reason,needs_admin,requested_by,requested_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, enrollmentId, amount, calc.fee, calc.gross, Math.max(0, sm.balance.sessions), reason, calc.needsAdmin ? 1 : 0, user.id, nowIso());
  audit(db, user.id, 'request', 'refund', id, { amount });
  return id;
}

/** Duyệt hoàn phí: một giao dịch duy nhất đổi cả buổi và tiền (bất biến #4). */
export function decideRefund(db: DB, user: User, refundId: string, approve: boolean, note?: string) {
  const r = db.prepare('SELECT * FROM refunds WHERE id=?').get(refundId) as any;
  if (!r) throw notFound('Không tìm thấy yêu cầu');
  if (r.status !== 'wait') throw conflict('Yêu cầu đã được xử lý');
  const en = db.prepare('SELECT * FROM enrollments WHERE id=?').get(r.enrollment_id) as any;
  assertCenter(user, en.center_id);
  if (r.requested_by === user.id) throw forbidden('Người tạo yêu cầu không được tự duyệt');
  if (approve && r.needs_admin && user.role !== 'admin') throw forbidden('Khoản hoàn lớn: cần admin tổ chức duyệt');
  const tx = db.transaction(() => {
    db.prepare('UPDATE refunds SET status=?, decided_by=?, decided_at=?, decision_note=? WHERE id=?').run(approve ? 'approved' : 'rejected', user.id, nowIso(), note ?? null, refundId);
    if (approve) {
      if (r.sessions > 0) addEntry(db, { enrollmentId: r.enrollment_id, type: 'refund', sessions: -r.sessions, makeup: 0, actor: user.id, approvedBy: user.id, reason: `Hoàn phí ${r.amount}đ`, ref: refundId });
      if (r.amount > 0) db.prepare('INSERT INTO receipts(id,enrollment_id,amount,method,at,actor,note,adjusts_id) VALUES (?,?,?,?,?,?,?,?)').run(uid(), r.enrollment_id, -r.amount, 'refund', nowIso(), user.id, `Hoàn phí ${refundId}`, null);
      db.prepare(`UPDATE enrollments SET status='dropped' WHERE id=?`).run(r.enrollment_id);
    }
    audit(db, user.id, approve ? 'approve' : 'reject', 'refund', refundId, { note });
  });
  tx();
}

export function setEnrollmentStatus(db: DB, user: User, id: string, to: D.EnrollmentStatus) {
  const en = db.prepare('SELECT * FROM enrollments WHERE id=?').get(id) as any;
  if (!en) throw notFound('Không tìm thấy ghi danh');
  assertCenter(user, en.center_id);
  try { D.move(en.status, to); } catch (e) { throw conflict((e as Error).message); }
  db.prepare('UPDATE enrollments SET status=? WHERE id=?').run(to, id);
  audit(db, user.id, 'status', 'enrollment', id, { from: en.status, to });
}
