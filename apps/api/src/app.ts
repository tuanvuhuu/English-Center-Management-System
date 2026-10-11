import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { z, ZodError } from 'zod';
import * as D from '@ecms/domain';
import { type DB, uid, nowIso, audit } from './db.js';
import { CAN, login, userFromReq, type Role, type User } from './auth.js';
import * as S from './services.js';

const phoneRe = /^(0|\+84)\d{8,10}$/;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/);

export function buildApp(db: DB): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cors, { origin: true });

  app.setErrorHandler((err: any, _req, reply) => {
    if (err instanceof S.HttpError) return reply.status(err.status).send({ error: err.message });
    if (err instanceof ZodError) return reply.status(400).send({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (String(err?.code).startsWith('SQLITE_CONSTRAINT')) return reply.status(409).send({ error: 'Dữ liệu trùng hoặc đang được tham chiếu' });
    console.error(err);
    return reply.status(500).send({ error: 'Lỗi hệ thống' });
  });

  const authed = (roles?: readonly Role[]) => async (req: FastifyRequest) => {
    const u = userFromReq(db, req);
    if (!u) throw new S.HttpError(401, 'Chưa đăng nhập');
    if (roles && !roles.includes(u.role)) throw S.forbidden();
    (req as any).user = u;
  };
  const U = (req: FastifyRequest) => (req as any).user as User;

  app.get('/health', async () => ({ ok: true }));

  /* ----- đăng nhập ----- */
  app.post('/auth/login', async (req) => {
    const b = z.object({ username: z.string(), password: z.string() }).parse(req.body);
    const r = login(db, b.username, b.password);
    if (!r) throw new S.HttpError(401, 'Sai tên đăng nhập hoặc mật khẩu');
    return r;
  });
  app.get('/me', { preHandler: authed() }, async (req) => U(req));

  /* ----- danh mục ----- */
  app.get('/centers', { preHandler: authed() }, async (req) => {
    const u = U(req);
    return db.prepare(u.role === 'admin' ? 'SELECT * FROM centers' : 'SELECT * FROM centers WHERE id=?').all(...(u.role === 'admin' ? [] : [u.centerId]));
  });
  app.get('/courses', { preHandler: authed() }, async (req) => {
    const c = S.scopeCenter(U(req), (req.query as any).centerId);
    return db.prepare(`SELECT co.*, cp.center_id, cp.price FROM courses co LEFT JOIN course_prices cp ON cp.course_id=co.id ${c ? 'WHERE cp.center_id=?' : ''} ORDER BY co.code`).all(...(c ? [c] : []));
  });
  app.post('/courses', { preHandler: authed(CAN.config) }, async (req) => {
    const b = z.object({ code: z.string().min(2), name: z.string().min(2), level: z.string().optional(), sessions: z.number().int().min(1).max(200), minutes: z.number().int().min(30).max(240).default(90), prices: z.record(z.number().int().min(0)) }).parse(req.body);
    const id = uid();
    db.transaction(() => {
      db.prepare('INSERT INTO courses(id,code,name,level,sessions,minutes) VALUES (?,?,?,?,?,?)').run(id, b.code.toUpperCase(), b.name, b.level ?? null, b.sessions, b.minutes);
      for (const [cid, p] of Object.entries(b.prices)) db.prepare('INSERT INTO course_prices(course_id,center_id,price) VALUES (?,?,?)').run(id, cid, p);
      audit(db, U(req).id, 'create', 'course', id, b);
    })();
    return { id };
  });
  app.get('/teachers', { preHandler: authed() }, async (req) => {
    const c = S.scopeCenter(U(req), (req.query as any).centerId);
    return db.prepare(`SELECT * FROM teachers WHERE active=1 ${c ? 'AND center_id=?' : ''} ORDER BY name`).all(...(c ? [c] : []));
  });
  app.get('/rooms', { preHandler: authed() }, async (req) => {
    const c = S.scopeCenter(U(req), (req.query as any).centerId);
    return db.prepare(`SELECT * FROM rooms WHERE active=1 ${c ? 'AND center_id=?' : ''} ORDER BY name`).all(...(c ? [c] : []));
  });

  /* ----- học viên ----- */
  const studentBody = z.object({
    centerId: z.string(), name: z.string().min(2), dob: day.optional().nullable(), school: z.string().optional().nullable(), note: z.string().optional().nullable(),
    guardianName: z.string().min(2), guardianPhone: z.string().regex(phoneRe, 'Số điện thoại không hợp lệ'),
  });
  app.get('/students', { preHandler: authed() }, async (req) => {
    const q = req.query as any; const u = U(req);
    const c = S.scopeCenter(u, q.centerId);
    const where: string[] = []; const args: any[] = [];
    if (c) { where.push('s.center_id=?'); args.push(c); }
    if (q.q) { where.push('(s.name LIKE ? OR s.code LIKE ? OR s.guardian_phone LIKE ?)'); args.push(`%${q.q}%`, `%${q.q}%`, `%${q.q}%`); }
    if (q.status) { where.push('s.status=?'); args.push(q.status); }
    if (u.role === 'teacher') { where.push(`s.id IN (SELECT e.student_id FROM enrollments e JOIN classes cl ON cl.id=e.class_id JOIN teachers t ON t.id=cl.teacher_id WHERE t.user_id=?)`); args.push(u.id); }
    const rows = db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM enrollments e WHERE e.student_id=s.id AND e.status IN ('active','frozen')) AS active_enrollments FROM students s ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY s.created_at DESC LIMIT 500`).all(...args) as any[];
    return rows.map((r) => u.role === 'teacher' ? { ...r, guardian_phone: r.guardian_phone.slice(0, 4) + '••••' + r.guardian_phone.slice(-3) } : r);
  });
  app.post('/students', { preHandler: authed(CAN.studentWrite) }, async (req) => {
    const b = studentBody.parse(req.body); S.assertCenter(U(req), b.centerId);
    const dup = db.prepare('SELECT code,name FROM students WHERE guardian_phone=? AND lower(name)=lower(?)').get(b.guardianPhone, b.name) as any;
    if (dup) throw S.conflict(`Trùng hồ sơ: ${dup.name} (${dup.code}) đã có cùng số điện thoại phụ huynh`);
    let n = (db.prepare("SELECT COUNT(*)+1 AS n FROM students").get() as any).n;
    let code = 'HV' + String(10000 + n).slice(1);
    while (db.prepare('SELECT 1 FROM students WHERE code=?').get(code)) code = 'HV' + String(10000 + ++n).slice(1);
    const id = uid();
    db.prepare('INSERT INTO students(id,code,center_id,name,dob,school,note,guardian_name,guardian_phone,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(id, code, b.centerId, b.name, b.dob ?? null, b.school ?? null, b.note ?? null, b.guardianName, b.guardianPhone, nowIso());
    audit(db, U(req).id, 'create', 'student', id, b);
    return { id, code };
  });
  app.put('/students/:id', { preHandler: authed(CAN.studentWrite) }, async (req) => {
    const id = (req.params as any).id; const b = studentBody.partial().extend({ status: z.enum(['active', 'inactive']).optional() }).parse(req.body);
    const old = db.prepare('SELECT * FROM students WHERE id=?').get(id) as any;
    if (!old) throw S.notFound(); S.assertCenter(U(req), old.center_id);
    const m = { name: b.name ?? old.name, dob: b.dob === undefined ? old.dob : b.dob, school: b.school === undefined ? old.school : b.school, note: b.note === undefined ? old.note : b.note, gn: b.guardianName ?? old.guardian_name, gp: b.guardianPhone ?? old.guardian_phone, status: b.status ?? old.status };
    db.prepare('UPDATE students SET name=?,dob=?,school=?,note=?,guardian_name=?,guardian_phone=?,status=? WHERE id=?').run(m.name, m.dob, m.school, m.note, m.gn, m.gp, m.status, id);
    audit(db, U(req).id, 'update', 'student', id, { old: { name: old.name, phone: old.guardian_phone, status: old.status }, new: m });
    return { ok: true };
  });
  app.delete('/students/:id', { preHandler: authed(CAN.studentWrite) }, async (req) => {
    const id = (req.params as any).id;
    const old = db.prepare('SELECT * FROM students WHERE id=?').get(id) as any;
    if (!old) throw S.notFound(); S.assertCenter(U(req), old.center_id);
    const n = (db.prepare('SELECT COUNT(*) c FROM enrollments WHERE student_id=?').get(id) as any).c;
    if (n > 0) throw S.conflict(`Không thể xóa: học viên đã có ${n} ghi danh. Hãy chuyển sang ngừng hoạt động.`);
    db.prepare('DELETE FROM students WHERE id=?').run(id);
    audit(db, U(req).id, 'delete', 'student', id, { code: old.code });
    return { ok: true };
  });
  app.get('/students/:id', { preHandler: authed() }, async (req) => {
    const id = (req.params as any).id;
    const s = db.prepare('SELECT * FROM students WHERE id=?').get(id) as any;
    if (!s) throw S.notFound(); S.assertCenter(U(req), s.center_id);
    const ens = (db.prepare(`SELECT e.id, cl.code AS class_code, co.name AS course_name FROM enrollments e JOIN classes cl ON cl.id=e.class_id JOIN courses co ON co.id=e.course_id WHERE e.student_id=? ORDER BY e.created_at DESC`).all(id) as any[])
      .map((e) => { const sm = S.enrollmentSummary(db, e.id); return { ...e, status: sm.enrollment.status, net: sm.enrollment.net, remaining: sm.remaining, makeup: sm.balance.makeup, bought: sm.enrollment.sessions_bought, money: sm.money }; });
    return { student: s, enrollments: ens };
  });

  /* ----- lớp & lịch ----- */
  const classBody = z.object({
    centerId: z.string(), courseId: z.string(), teacherId: z.string().optional().nullable(), roomId: z.string().optional().nullable(),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1), startTime: time, startDate: day, capacity: z.number().int().min(1).max(60).default(15), code: z.string().optional(),
  });
  app.get('/classes', { preHandler: authed() }, async (req) => {
    const q = req.query as any; const c = S.scopeCenter(U(req), q.centerId);
    const rows = db.prepare(`SELECT cl.*, co.name AS course_name, co.sessions AS total, t.name AS teacher_name, r.name AS room_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.class_id=cl.id AND e.status IN ('active','frozen')) AS students,
      (SELECT COUNT(*) FROM class_sessions s WHERE s.class_id=cl.id AND s.status='done') AS done,
      (SELECT MIN(date) FROM class_sessions s WHERE s.class_id=cl.id) AS first_date, (SELECT MAX(date) FROM class_sessions s WHERE s.class_id=cl.id) AS last_date
      FROM classes cl JOIN courses co ON co.id=cl.course_id LEFT JOIN teachers t ON t.id=cl.teacher_id LEFT JOIN rooms r ON r.id=cl.room_id
      ${c ? 'WHERE cl.center_id=?' : ''} ORDER BY cl.code`).all(...(c ? [c] : [])) as any[];
    return rows.map((r) => ({ ...r, weekdays: JSON.parse(r.weekdays) }));
  });
  app.post('/classes', { preHandler: authed(CAN.classWrite) }, async (req) => {
    const b = classBody.parse(req.body); S.assertCenter(U(req), b.centerId);
    const co = db.prepare('SELECT * FROM courses WHERE id=?').get(b.courseId) as any; if (!co) throw S.bad('Khóa học không tồn tại');
    const conf = S.classConflicts(db, { ...b, minutes: co.minutes, total: co.sessions });
    if (conf.length) throw S.conflict(conf.join('; '));
    const code = (b.code?.trim() || `${co.code}-${(db.prepare('SELECT COUNT(*)+1 n FROM classes WHERE course_id=?').get(b.courseId) as any).n}`).toUpperCase();
    const id = uid();
    db.transaction(() => {
      db.prepare('INSERT INTO classes(id,code,center_id,course_id,teacher_id,room_id,weekdays,start_time,minutes,start_date,capacity) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .run(id, code, b.centerId, b.courseId, b.teacherId ?? null, b.roomId ?? null, JSON.stringify(b.weekdays), b.startTime, co.minutes, b.startDate, b.capacity);
      S.generateSessions(db, id);
      audit(db, U(req).id, 'create', 'class', id, b);
    })();
    return { id, code };
  });
  app.put('/classes/:id', { preHandler: authed(CAN.classWrite) }, async (req) => {
    const id = (req.params as any).id; const b = z.object({ teacherId: z.string().nullable().optional(), roomId: z.string().nullable().optional(), capacity: z.number().int().min(1).max(60).optional(), status: z.enum(['open', 'running', 'ended', 'cancelled']).optional() }).parse(req.body);
    const old = db.prepare('SELECT * FROM classes WHERE id=?').get(id) as any; if (!old) throw S.notFound(); S.assertCenter(U(req), old.center_id);
    const next = { teacherId: b.teacherId === undefined ? old.teacher_id : b.teacherId, roomId: b.roomId === undefined ? old.room_id : b.roomId, capacity: b.capacity ?? old.capacity, status: b.status ?? old.status };
    const conf = S.classConflicts(db, { classId: id, centerId: old.center_id, roomId: next.roomId, teacherId: next.teacherId, weekdays: JSON.parse(old.weekdays), startTime: old.start_time, minutes: old.minutes, startDate: old.start_date, total: 0 });
    if (conf.length) throw S.conflict(conf.join('; '));
    db.transaction(() => {
      db.prepare('UPDATE classes SET teacher_id=?,room_id=?,capacity=?,status=? WHERE id=?').run(next.teacherId, next.roomId, next.capacity, next.status, id);
      db.prepare(`UPDATE class_sessions SET teacher_id=?, room_id=? WHERE class_id=? AND status='planned'`).run(next.teacherId, next.roomId, id);
      if (next.status === 'cancelled') db.prepare(`UPDATE class_sessions SET status='cancelled' WHERE class_id=? AND status='planned'`).run(id);
      audit(db, U(req).id, 'update', 'class', id, { old: { teacher: old.teacher_id, room: old.room_id, status: old.status }, new: next });
    })();
    return { ok: true };
  });
  app.delete('/classes/:id', { preHandler: authed(CAN.classWrite) }, async (req) => {
    const id = (req.params as any).id; const old = db.prepare('SELECT * FROM classes WHERE id=?').get(id) as any; if (!old) throw S.notFound(); S.assertCenter(U(req), old.center_id);
    const n = (db.prepare('SELECT COUNT(*) c FROM enrollments WHERE class_id=?').get(id) as any).c;
    if (n > 0) throw S.conflict(`Không thể xóa lớp: có ${n} ghi danh. Hãy chuyển học viên hoặc đổi trạng thái lớp sang Hủy.`);
    db.transaction(() => { db.prepare('DELETE FROM class_sessions WHERE class_id=?').run(id); db.prepare('DELETE FROM classes WHERE id=?').run(id); audit(db, U(req).id, 'delete', 'class', id, { code: old.code }); })();
    return { ok: true };
  });
  app.get('/classes/:id', { preHandler: authed() }, async (req) => {
    const id = (req.params as any).id; const c = db.prepare('SELECT cl.*, co.name AS course_name FROM classes cl JOIN courses co ON co.id=cl.course_id WHERE cl.id=?').get(id) as any;
    if (!c) throw S.notFound(); S.assertCenter(U(req), c.center_id);
    return { class: { ...c, weekdays: JSON.parse(c.weekdays) }, sessions: db.prepare('SELECT * FROM class_sessions WHERE class_id=? ORDER BY n').all(id), roster: S.classRoster(db, id) };
  });
  app.post('/sessions/:id/cancel', { preHandler: authed(CAN.classWrite) }, async (req) => {
    const id = (req.params as any).id; const reason = z.object({ reason: z.string().min(2) }).parse(req.body).reason;
    const s = db.prepare('SELECT cs.*, c.center_id FROM class_sessions cs JOIN classes c ON c.id=cs.class_id WHERE cs.id=?').get(id) as any; if (!s) throw S.notFound(); S.assertCenter(U(req), s.center_id);
    if (s.status !== 'planned') throw S.conflict('Chỉ hủy được buổi chưa diễn ra');
    db.transaction(() => {
      db.prepare(`UPDATE class_sessions SET status='cancelled', topic=? WHERE id=?`).run('Hủy: ' + reason, id);
      // nối thêm 1 buổi vào cuối khóa để học viên không mất buổi
      const last = db.prepare('SELECT * FROM class_sessions WHERE class_id=? ORDER BY n DESC LIMIT 1').get(s.class_id) as any;
      const cl = db.prepare('SELECT * FROM classes WHERE id=?').get(s.class_id) as any;
      const days: number[] = JSON.parse(cl.weekdays); let d = new Date(last.date + 'T00:00:00Z');
      for (let i = 0; i < 60; i++) { d = new Date(d.getTime() + 86_400_000); if (days.includes(d.getUTCDay())) break; }
      db.prepare('INSERT INTO class_sessions(id,class_id,n,date,start_time,minutes,teacher_id,room_id) VALUES (?,?,?,?,?,?,?,?)').run(uid(), s.class_id, last.n + 1, d.toISOString().slice(0, 10), s.start_time, s.minutes, s.teacher_id, s.room_id);
      audit(db, U(req).id, 'cancel', 'class_session', id, { reason });
    })();
    return { ok: true };
  });
  app.get('/schedule', { preHandler: authed() }, async (req) => {
    const q = req.query as any; const u = U(req); const c = S.scopeCenter(u, q.centerId);
    const from = q.from ?? nowIso().slice(0, 10); const to = q.to ?? from;
    const args: any[] = [from, to]; let extra = '';
    if (c) { extra += ' AND cl.center_id=?'; args.push(c); }
    if (u.role === 'teacher') { extra += ' AND t.user_id=?'; args.push(u.id); }
    return db.prepare(`SELECT cs.*, cl.code AS class_code, cl.center_id, co.name AS course_name, t.name AS teacher_name, r.name AS room_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.class_id=cl.id AND e.status='active') AS students,
      (SELECT COUNT(*) FROM attendance a WHERE a.session_id=cs.id) AS marked
      FROM class_sessions cs JOIN classes cl ON cl.id=cs.class_id JOIN courses co ON co.id=cl.course_id LEFT JOIN teachers t ON t.id=COALESCE(cs.teacher_id,cl.teacher_id) LEFT JOIN rooms r ON r.id=COALESCE(cs.room_id,cl.room_id)
      WHERE cs.date BETWEEN ? AND ? ${extra} ORDER BY cs.date, cs.start_time`).all(...args);
  });

  /* ----- điểm danh ----- */
  app.get('/sessions/:id/attendance', { preHandler: authed(CAN.attendance) }, async (req) => {
    const id = (req.params as any).id;
    const s = db.prepare('SELECT cs.*, cl.code AS class_code, cl.center_id FROM class_sessions cs JOIN classes cl ON cl.id=cs.class_id WHERE cs.id=?').get(id) as any;
    if (!s) throw S.notFound(); S.assertCenter(U(req), s.center_id);
    const rows = db.prepare(`SELECT e.id AS enrollment_id, st.name, st.code, a.status, a.note FROM enrollments e JOIN students st ON st.id=e.student_id LEFT JOIN attendance a ON a.session_id=? AND a.enrollment_id=e.id WHERE e.class_id=? AND e.status IN ('active') ORDER BY st.name`).all(id, s.class_id);
    const end = new Date(Date.parse(`${s.date}T${s.start_time}:00Z`) + s.minutes * 60_000).toISOString();
    return { session: s, rows, locked: D.isLocked(end, nowIso(), S.policy) };
  });
  app.put('/sessions/:id/attendance', { preHandler: authed(CAN.attendance) }, async (req) => {
    const b = z.object({ marks: z.array(z.object({ enrollmentId: z.string(), status: z.enum(['present', 'late', 'excused', 'unexcused', 'makeup']), note: z.string().optional() })).min(1), approvedReason: z.string().optional() }).parse(req.body);
    S.markAttendance(db, U(req), (req.params as any).id, b.marks, { approvedReason: b.approvedReason });
    return { ok: true };
  });

  /* ----- ghi danh & tiền ----- */
  app.post('/enrollments', { preHandler: authed(CAN.enroll) }, async (req) => {
    const b = z.object({ studentId: z.string(), classId: z.string(), note: z.string().optional(), discounts: z.array(z.object({ code: z.string(), kind: z.enum(['percent', 'amount']), value: z.number().min(0), scholarship: z.boolean().optional() })).default([]), paid: z.number().int().min(0).default(0), method: z.string().default('cash') }).parse(req.body);
    const id = S.createEnrollment(db, U(req), b);
    if (b.paid > 0) S.addReceipt(db, U(req), id, b.paid, b.method, 'Thu khi ghi danh');
    return { id };
  });
  app.get('/enrollments/:id', { preHandler: authed() }, async (req) => {
    const sm = S.enrollmentSummary(db, (req.params as any).id); S.assertCenter(U(req), sm.enrollment.center_id);
    const info = db.prepare(`SELECT s.name AS student_name, s.code AS student_code, cl.code AS class_code, co.name AS course_name FROM enrollments e JOIN students s ON s.id=e.student_id JOIN classes cl ON cl.id=e.class_id JOIN courses co ON co.id=e.course_id WHERE e.id=?`).get(sm.enrollment.id);
    return { ...sm, info };
  });
  app.post('/enrollments/:id/receipts', { preHandler: authed(CAN.receipt) }, async (req) => {
    const b = z.object({ amount: z.number().int().positive(), method: z.enum(['cash', 'transfer', 'card', 'wallet']), note: z.string().optional() }).parse(req.body);
    return { id: S.addReceipt(db, U(req), (req.params as any).id, b.amount, b.method, b.note) };
  });
  app.post('/receipts/:id/void', { preHandler: authed(CAN.voidReceipt) }, async (req) => S.voidOrAdjustReceipt(db, U(req), (req.params as any).id, z.object({ reason: z.string() }).parse(req.body).reason));
  app.post('/enrollments/:id/adjust', { preHandler: authed(CAN.adjust) }, async (req) => {
    const b = z.object({ sessions: z.number().int().min(-50).max(50).refine((n) => n !== 0), reason: z.string().min(3), kind: z.enum(['adjust', 'gift']).default('adjust') }).parse(req.body);
    const id = (req.params as any).id; const en = db.prepare('SELECT * FROM enrollments WHERE id=?').get(id) as any; if (!en) throw S.notFound(); S.assertCenter(U(req), en.center_id);
    S.addEntry(db, { enrollmentId: id, type: b.kind, sessions: b.sessions, makeup: 0, actor: U(req).id, approvedBy: U(req).id, reason: b.reason });
    audit(db, U(req).id, b.kind, 'enrollment', id, b);
    return { ok: true };
  });
  app.post('/enrollments/:id/status', { preHandler: authed(CAN.enroll) }, async (req) => {
    const to = z.object({ to: z.enum(['active', 'frozen', 'dropped', 'completed']) }).parse(req.body).to;
    S.setEnrollmentStatus(db, U(req), (req.params as any).id, to); return { ok: true };
  });
  app.post('/enrollments/:id/transfer-class', { preHandler: authed(CAN.enroll) }, async (req) => {
    const b = z.object({ classId: z.string() }).parse(req.body); const id = (req.params as any).id;
    const en = db.prepare('SELECT * FROM enrollments WHERE id=?').get(id) as any; if (!en) throw S.notFound(); S.assertCenter(U(req), en.center_id);
    const cl = db.prepare('SELECT * FROM classes WHERE id=?').get(b.classId) as any; if (!cl) throw S.notFound('Không tìm thấy lớp');
    if (cl.course_id !== en.course_id || cl.center_id !== en.center_id) throw S.bad('Chỉ đổi lớp trong cùng khóa và cùng trung tâm');
    if (en.status !== 'active') throw S.conflict('Chỉ đổi lớp khi đang học');
    const cnt = (db.prepare(`SELECT COUNT(*) c FROM enrollments WHERE class_id=? AND status IN ('active','frozen')`).get(b.classId) as any).c;
    if (cnt >= cl.capacity) throw S.conflict('Lớp đích đã đủ sĩ số');
    db.prepare('UPDATE enrollments SET class_id=? WHERE id=?').run(b.classId, id);
    audit(db, U(req).id, 'transfer-class', 'enrollment', id, { from: en.class_id, to: b.classId });
    return { ok: true };
  });

  /* ----- hoàn phí ----- */
  app.post('/enrollments/:id/refund-request', { preHandler: authed(CAN.refundRequest) }, async (req) => {
    const b = z.object({ reason: z.string(), centerCancelled: z.boolean().optional(), discountClawback: z.number().int().min(0).optional(), materials: z.number().int().min(0).optional() }).parse(req.body);
    return { id: S.requestRefund(db, U(req), (req.params as any).id, b.reason, b) };
  });
  app.get('/refunds', { preHandler: authed(CAN.report) }, async (req) => {
    const c = S.scopeCenter(U(req), (req.query as any).centerId);
    return db.prepare(`SELECT r.*, s.name AS student_name, s.code AS student_code, cl.code AS class_code FROM refunds r JOIN enrollments e ON e.id=r.enrollment_id JOIN students s ON s.id=e.student_id JOIN classes cl ON cl.id=e.class_id ${c ? 'WHERE e.center_id=?' : ''} ORDER BY (r.status='wait') DESC, r.requested_at DESC`).all(...(c ? [c] : []));
  });
  app.post('/refunds/:id/decide', { preHandler: authed(CAN.refundDecide) }, async (req) => {
    const b = z.object({ approve: z.boolean(), note: z.string().optional() }).parse(req.body);
    S.decideRefund(db, U(req), (req.params as any).id, b.approve, b.note); return { ok: true };
  });

  /* ----- công nợ, tổng quan, nhật ký ----- */
  app.get('/debts', { preHandler: authed(CAN.receipt) }, async (req) => {
    const c = S.scopeCenter(U(req), (req.query as any).centerId);
    const ens = db.prepare(`SELECT e.id FROM enrollments e WHERE e.status IN ('active','frozen','completed') ${c ? 'AND e.center_id=?' : ''}`).all(...(c ? [c] : [])) as any[];
    const out: any[] = [];
    for (const { id } of ens) {
      const sm = S.enrollmentSummary(db, id);
      if (sm.money.receivable <= 0) continue;
      const i = db.prepare('SELECT s.id AS student_id, s.name, s.code, s.guardian_phone, cl.code AS class_code FROM enrollments e JOIN students s ON s.id=e.student_id JOIN classes cl ON cl.id=e.class_id WHERE e.id=?').get(id) as any;
      out.push({ enrollment_id: id, ...i, net: sm.enrollment.net, collected: sm.money.collected, receivable: sm.money.receivable, created_at: sm.enrollment.created_at });
    }
    return out.sort((a, b) => b.receivable - a.receivable);
  });
  app.get('/dashboard', { preHandler: authed() }, async (req) => {
    const u = U(req); const c = S.scopeCenter(u, (req.query as any).centerId); const today = (req.query as any).today ?? nowIso().slice(0, 10);
    const cw = c ? 'AND e.center_id=?' : ''; const ca = c ? [c] : [];
    const q = (sql: string, ...a: any[]) => (db.prepare(sql).get(...a) as any);
    const activeStudents = q(`SELECT COUNT(DISTINCT e.student_id) n FROM enrollments e WHERE e.status='active' ${cw}`, ...ca).n;
    const ens = db.prepare(`SELECT e.id FROM enrollments e WHERE e.status IN ('active','frozen') ${cw}`).all(...ca) as any[];
    let low = 0, debt = 0, debtors = 0;
    for (const { id } of ens) { const sm = S.enrollmentSummary(db, id); if (sm.enrollment.status === 'active' && sm.remaining <= 3) low++; if (sm.money.receivable > 0) { debt += sm.money.receivable; debtors++; } }
    const month = today.slice(0, 7);
    const revenue = q(`SELECT COALESCE(SUM(r.amount),0) n FROM receipts r JOIN enrollments e ON e.id=r.enrollment_id WHERE r.voided_at IS NULL AND r.at LIKE ? ${cw}`, month + '%', ...ca).n;
    const waitRefunds = q(`SELECT COUNT(*) n FROM refunds r JOIN enrollments e ON e.id=r.enrollment_id WHERE r.status='wait' ${cw}`, ...ca).n;
    const todaySessions = db.prepare(`SELECT cs.id, cs.start_time, cs.minutes, cl.code, t.name AS teacher_name, r.name AS room_name, cs.status,
      (SELECT COUNT(*) FROM attendance a WHERE a.session_id=cs.id) AS marked, (SELECT COUNT(*) FROM enrollments e WHERE e.class_id=cl.id AND e.status='active') AS students
      FROM class_sessions cs JOIN classes cl ON cl.id=cs.class_id LEFT JOIN teachers t ON t.id=COALESCE(cs.teacher_id,cl.teacher_id) LEFT JOIN rooms r ON r.id=COALESCE(cs.room_id,cl.room_id)
      WHERE cs.date=? ${c ? 'AND cl.center_id=?' : ''} ORDER BY cs.start_time`).all(today, ...ca);
    const underClasses = q(`SELECT COUNT(*) n FROM classes cl WHERE cl.status IN ('open','running') ${c ? 'AND cl.center_id=?' : ''} AND (SELECT COUNT(*) FROM enrollments e WHERE e.class_id=cl.id AND e.status='active') < 6`, ...ca).n;
    return { activeStudents, lowSessions: low, debt, debtors, revenueMonth: revenue, waitRefunds, underClasses, todaySessions };
  });
  app.get('/reports/centers', { preHandler: authed(['admin']) }, async () => {
    const cs = db.prepare('SELECT * FROM centers').all() as any[];
    return cs.map((c) => {
      const students = (db.prepare(`SELECT COUNT(DISTINCT student_id) n FROM enrollments WHERE center_id=? AND status='active'`).get(c.id) as any).n;
      const collected = (db.prepare(`SELECT COALESCE(SUM(r.amount),0) n FROM receipts r JOIN enrollments e ON e.id=r.enrollment_id WHERE e.center_id=? AND r.voided_at IS NULL`).get(c.id) as any).n;
      const net = (db.prepare(`SELECT COALESCE(SUM(net),0) n FROM enrollments WHERE center_id=? AND status<>'dropped'`).get(c.id) as any).n;
      const classes = (db.prepare(`SELECT COUNT(*) n FROM classes WHERE center_id=? AND status IN ('open','running')`).get(c.id) as any).n;
      return { id: c.id, name: c.name, students, classes, collected, outstanding: Math.max(0, net - collected) };
    });
  });
  app.get('/audit', { preHandler: authed(['admin', 'manager']) }, async (req) => db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT ?').all(Number((req.query as any).limit ?? 100)));

  return app;
}
