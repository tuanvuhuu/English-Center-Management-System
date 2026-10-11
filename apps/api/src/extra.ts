import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { type DB, uid, nowIso, audit } from './db.js';
import { CAN, type Role, type User } from './auth.js';
import * as S from './services.js';

type Authed = (roles?: readonly Role[]) => (req: FastifyRequest) => Promise<void>;
const phoneRe = /^(0|\+84)\d{8,10}$/;
const LEAD_STATUS = ['new', 'contacted', 'tested', 'trial', 'won', 'lost'] as const;

export function registerExtra(app: FastifyInstance, db: DB, authed: Authed, U: (r: FastifyRequest) => User) {
  /* ================= TUYỂN SINH ================= */
  const leadBody = z.object({ centerId: z.string(), name: z.string().min(2), phone: z.string().regex(phoneRe, 'Số điện thoại không hợp lệ'), source: z.enum(['walkin', 'facebook', 'zalo', 'website', 'referral', 'school', 'event']).default('walkin'), interest: z.string().optional().nullable(), note: z.string().optional().nullable() });

  app.get('/leads', { preHandler: authed(CAN.lead) }, async (req) => {
    const q = req.query as any; const c = S.scopeCenter(U(req), q.centerId);
    const w: string[] = []; const a: any[] = [];
    if (c) { w.push('l.center_id=?'); a.push(c); }
    if (q.status) { w.push('l.status=?'); a.push(q.status); }
    if (q.q) { w.push('(l.name LIKE ? OR l.phone LIKE ?)'); a.push(`%${q.q}%`, `%${q.q}%`); }
    return db.prepare(`SELECT l.*, u.name AS assigned_name, (SELECT COUNT(*) FROM lead_activities x WHERE x.lead_id=l.id) AS activities FROM leads l LEFT JOIN users u ON u.id=l.assigned_to ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY l.updated_at DESC LIMIT 500`).all(...a);
  });
  app.get('/leads/funnel', { preHandler: authed(CAN.lead) }, async (req) => {
    const c = S.scopeCenter(U(req), (req.query as any).centerId);
    const rows = db.prepare(`SELECT status, COUNT(*) n FROM leads ${c ? 'WHERE center_id=?' : ''} GROUP BY status`).all(...(c ? [c] : [])) as any[];
    const by = Object.fromEntries(rows.map((r) => [r.status, r.n]));
    const src = db.prepare(`SELECT source, COUNT(*) n, SUM(status='won') won FROM leads ${c ? 'WHERE center_id=?' : ''} GROUP BY source ORDER BY n DESC`).all(...(c ? [c] : []));
    const total = Object.values(by).reduce((s: number, n: any) => s + n, 0) as number;
    return { by, total, conversion: total ? Math.round(((by.won ?? 0) / total) * 100) : 0, sources: src };
  });
  app.post('/leads', { preHandler: authed(CAN.lead) }, async (req) => {
    const b = leadBody.parse(req.body); S.assertCenter(U(req), b.centerId);
    const dup = db.prepare(`SELECT name FROM leads WHERE phone=? AND center_id=? AND status NOT IN ('won','lost')`).get(b.phone, b.centerId) as any;
    if (dup) throw S.conflict(`Số điện thoại này đã có lead đang theo dõi (${dup.name})`);
    const id = uid(); const now = nowIso();
    db.prepare('INSERT INTO leads(id,center_id,name,phone,source,interest,assigned_to,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, b.centerId, b.name, b.phone, b.source, b.interest ?? null, U(req).id, b.note ?? null, now, now);
    audit(db, U(req).id, 'create', 'lead', id, b);
    return { id };
  });
  app.get('/leads/:id', { preHandler: authed(CAN.lead) }, async (req) => {
    const l = db.prepare('SELECT * FROM leads WHERE id=?').get((req.params as any).id) as any; if (!l) throw S.notFound(); S.assertCenter(U(req), l.center_id);
    return { lead: l, activities: db.prepare('SELECT a.*, u.name AS actor_name FROM lead_activities a LEFT JOIN users u ON u.id=a.actor WHERE lead_id=? ORDER BY at DESC').all(l.id) };
  });
  app.put('/leads/:id', { preHandler: authed(CAN.lead) }, async (req) => {
    const id = (req.params as any).id; const l = db.prepare('SELECT * FROM leads WHERE id=?').get(id) as any; if (!l) throw S.notFound(); S.assertCenter(U(req), l.center_id);
    if (l.status === 'won') throw S.conflict('Lead đã chốt ghi danh, không sửa trạng thái');
    const b = z.object({ status: z.enum(LEAD_STATUS).optional(), name: z.string().min(2).optional(), interest: z.string().nullable().optional(), note: z.string().nullable().optional(), lostReason: z.string().optional(), testScore: z.number().min(0).max(100).optional(), testLevel: z.string().optional(), trialClassId: z.string().optional(), trialDate: z.string().optional() }).parse(req.body);
    if (b.status === 'won') throw S.bad('Dùng chức năng "Chốt ghi danh" để chuyển lead thành học viên');
    if (b.status === 'lost' && !b.lostReason?.trim()) throw S.bad('Bắt buộc ghi lý do không thành công');
    if (b.status === 'tested' && b.testScore === undefined && l.test_score === null) throw S.bad('Nhập điểm test đầu vào');
    const n = { ...l, status: b.status ?? l.status, name: b.name ?? l.name, interest: b.interest === undefined ? l.interest : b.interest, note: b.note === undefined ? l.note : b.note, lost_reason: b.lostReason ?? l.lost_reason, test_score: b.testScore ?? l.test_score, test_level: b.testLevel ?? l.test_level, trial_class_id: b.trialClassId ?? l.trial_class_id, trial_date: b.trialDate ?? l.trial_date };
    db.prepare('UPDATE leads SET status=?,name=?,interest=?,note=?,lost_reason=?,test_score=?,test_level=?,trial_class_id=?,trial_date=?,updated_at=? WHERE id=?').run(n.status, n.name, n.interest, n.note, n.lost_reason, n.test_score, n.test_level, n.trial_class_id, n.trial_date, nowIso(), id);
    if (b.status && b.status !== l.status) db.prepare('INSERT INTO lead_activities(id,lead_id,at,actor,note) VALUES (?,?,?,?,?)').run(uid(), id, nowIso(), U(req).id, `Chuyển trạng thái: ${l.status} → ${b.status}${b.lostReason ? ' (' + b.lostReason + ')' : ''}`);
    audit(db, U(req).id, 'update', 'lead', id, { from: l.status, to: n.status });
    return { ok: true };
  });
  app.post('/leads/:id/activity', { preHandler: authed(CAN.lead) }, async (req) => {
    const id = (req.params as any).id; const l = db.prepare('SELECT * FROM leads WHERE id=?').get(id) as any; if (!l) throw S.notFound(); S.assertCenter(U(req), l.center_id);
    const note = z.object({ note: z.string().min(2) }).parse(req.body).note;
    db.prepare('INSERT INTO lead_activities(id,lead_id,at,actor,note) VALUES (?,?,?,?,?)').run(uid(), id, nowIso(), U(req).id, note);
    db.prepare(`UPDATE leads SET updated_at=?, status=CASE WHEN status='new' THEN 'contacted' ELSE status END WHERE id=?`).run(nowIso(), id);
    return { ok: true };
  });
  app.delete('/leads/:id', { preHandler: authed(['admin', 'manager']) }, async (req) => {
    const id = (req.params as any).id; const l = db.prepare('SELECT * FROM leads WHERE id=?').get(id) as any; if (!l) throw S.notFound(); S.assertCenter(U(req), l.center_id);
    if (l.status === 'won') throw S.conflict('Lead đã thành học viên, không xóa được');
    db.transaction(() => { db.prepare('DELETE FROM lead_activities WHERE lead_id=?').run(id); db.prepare('DELETE FROM leads WHERE id=?').run(id); audit(db, U(req).id, 'delete', 'lead', id, { name: l.name }); })();
    return { ok: true };
  });
  /** Chốt: tạo học viên từ lead (kế thừa thông tin, không nhập lại) và tùy chọn ghi danh luôn. */
  app.post('/leads/:id/convert', { preHandler: authed(['admin', 'manager', 'frontdesk']) }, async (req) => {
    const id = (req.params as any).id; const l = db.prepare('SELECT * FROM leads WHERE id=?').get(id) as any; if (!l) throw S.notFound(); S.assertCenter(U(req), l.center_id);
    if (l.status === 'won') throw S.conflict('Lead đã được chốt');
    const b = z.object({ guardianName: z.string().min(2), classId: z.string().optional(), paid: z.number().int().min(0).default(0), dob: z.string().optional(), school: z.string().optional() }).parse(req.body);
    const sid = uid(); let code = '';
    const out = db.transaction(() => {
      if (db.prepare('SELECT 1 FROM students WHERE guardian_phone=? AND lower(name)=lower(?)').get(l.phone, l.name)) throw S.conflict('Đã có hồ sơ học viên trùng tên và số điện thoại');
      let n = (db.prepare('SELECT COUNT(*)+1 n FROM students').get() as any).n; code = 'HV' + String(10000 + n).slice(1);
      while (db.prepare('SELECT 1 FROM students WHERE code=?').get(code)) code = 'HV' + String(10000 + ++n).slice(1);
      db.prepare('INSERT INTO students(id,code,center_id,name,dob,school,note,guardian_name,guardian_phone,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(sid, code, l.center_id, l.name, b.dob ?? null, b.school ?? null, `Nguồn: ${l.source}`, b.guardianName, l.phone, nowIso());
      let enrollmentId: string | null = null;
      if (b.classId) { enrollmentId = S.createEnrollment(db, U(req), { studentId: sid, classId: b.classId }); if (b.paid > 0) S.addReceipt(db, U(req), enrollmentId, b.paid, 'cash', 'Thu khi chốt lead'); }
      db.prepare(`UPDATE leads SET status='won', student_id=?, updated_at=? WHERE id=?`).run(sid, nowIso(), id);
      db.prepare('INSERT INTO lead_activities(id,lead_id,at,actor,note) VALUES (?,?,?,?,?)').run(uid(), id, nowIso(), U(req).id, `Chốt: tạo học viên ${code}${enrollmentId ? ' và ghi danh' : ''}`);
      audit(db, U(req).id, 'convert', 'lead', id, { studentId: sid, enrollmentId });
      return enrollmentId;
    })();
    return { studentId: sid, code, enrollmentId: out };
  });

  /* ================= GIÁO VIÊN & BẢNG CÔNG ================= */
  const teacherBody = z.object({ centerId: z.string(), name: z.string().min(2), phone: z.string().regex(phoneRe, 'Số điện thoại không hợp lệ').optional().nullable(), kind: z.enum(['vn', 'foreign', 'assistant']).default('vn'), rate: z.number().int().min(0).max(5_000_000).default(0) });
  app.post('/teachers', { preHandler: authed(CAN.teacherWrite) }, async (req) => {
    const b = teacherBody.parse(req.body); S.assertCenter(U(req), b.centerId); const id = uid();
    db.prepare('INSERT INTO teachers(id,center_id,name,phone,kind,rate) VALUES (?,?,?,?,?,?)').run(id, b.centerId, b.name, b.phone ?? null, b.kind, b.rate);
    audit(db, U(req).id, 'create', 'teacher', id, b); return { id };
  });
  app.put('/teachers/:id', { preHandler: authed(CAN.teacherWrite) }, async (req) => {
    const id = (req.params as any).id; const t = db.prepare('SELECT * FROM teachers WHERE id=?').get(id) as any; if (!t) throw S.notFound(); S.assertCenter(U(req), t.center_id);
    const b = teacherBody.partial().omit({ centerId: true }).parse(req.body);
    db.prepare('UPDATE teachers SET name=?, phone=?, kind=?, rate=? WHERE id=?').run(b.name ?? t.name, b.phone === undefined ? t.phone : b.phone, b.kind ?? t.kind, b.rate ?? t.rate, id);
    audit(db, U(req).id, 'update', 'teacher', id, { old: { rate: t.rate, kind: t.kind }, new: b }); return { ok: true };
  });
  app.delete('/teachers/:id', { preHandler: authed(CAN.teacherWrite) }, async (req) => {
    const id = (req.params as any).id; const t = db.prepare('SELECT * FROM teachers WHERE id=?').get(id) as any; if (!t) throw S.notFound(); S.assertCenter(U(req), t.center_id);
    const used = (db.prepare(`SELECT (SELECT COUNT(*) FROM classes WHERE teacher_id=@id AND status IN ('open','running')) + (SELECT COUNT(*) FROM class_sessions WHERE teacher_id=@id AND status='planned') AS n`).get({ id }) as any).n;
    if (used > 0) throw S.conflict('Giáo viên đang được phân công lớp hoặc buổi chưa dạy. Hãy đổi giáo viên trước.');
    const hist = (db.prepare(`SELECT COUNT(*) n FROM class_sessions WHERE teacher_id=? AND status='done'`).get(id) as any).n;
    if (hist > 0) { db.prepare('UPDATE teachers SET active=0 WHERE id=?').run(id); audit(db, U(req).id, 'deactivate', 'teacher', id); return { deactivated: true }; }
    db.prepare('DELETE FROM teachers WHERE id=?').run(id); audit(db, U(req).id, 'delete', 'teacher', id); return { deleted: true };
  });
  /** Bảng công: tính từ các buổi ĐÃ DẠY (có điểm danh), người dạy thực tế, không phải lịch phân công. */
  app.get('/timesheet', { preHandler: authed(['admin', 'manager', 'accountant', 'teacher']) }, async (req) => {
    const q = req.query as any; const u = U(req); const c = S.scopeCenter(u, q.centerId); const month = (q.month ?? nowIso().slice(0, 7)) as string;
    if (!/^\d{4}-\d{2}$/.test(month)) throw S.bad('Tháng không hợp lệ (YYYY-MM)');
    const w = ['cs.status=\'done\'', 'cs.date LIKE ?']; const a: any[] = [month + '%'];
    if (c) { w.push('cl.center_id=?'); a.push(c); }
    if (u.role === 'teacher') { w.push('t.user_id=?'); a.push(u.id); }
    const rows = db.prepare(`SELECT t.id, t.name, t.kind, t.rate, cl.center_id, COUNT(*) AS sessions, SUM(cs.minutes) AS minutes FROM class_sessions cs JOIN classes cl ON cl.id=cs.class_id JOIN teachers t ON t.id=COALESCE(cs.teacher_id, cl.teacher_id) WHERE ${w.join(' AND ')} GROUP BY t.id ORDER BY t.name`).all(...a) as any[];
    const items = rows.map((r) => ({ ...r, hours: Math.round((r.minutes / 60) * 10) / 10, pay: r.sessions * r.rate }));
    return { month, items, totalSessions: items.reduce((s, r) => s + r.sessions, 0), totalPay: items.reduce((s, r) => s + r.pay, 0) };
  });
  app.get('/teachers/:id/sessions', { preHandler: authed(CAN.timesheet) }, async (req) => {
    const id = (req.params as any).id; const month = ((req.query as any).month ?? nowIso().slice(0, 7)) as string;
    const t = db.prepare('SELECT * FROM teachers WHERE id=?').get(id) as any; if (!t) throw S.notFound(); S.assertCenter(U(req), t.center_id);
    return db.prepare(`SELECT cs.date, cs.start_time, cs.minutes, cl.code AS class_code FROM class_sessions cs JOIN classes cl ON cl.id=cs.class_id WHERE cs.status='done' AND cs.date LIKE ? AND COALESCE(cs.teacher_id, cl.teacher_id)=? ORDER BY cs.date`).all(month + '%', id);
  });

  /* ================= ĐIỂM & NHẬN XÉT ================= */
  const classOf = (id: string) => { const c = db.prepare('SELECT * FROM classes WHERE id=?').get(id) as any; if (!c) throw S.notFound('Không tìm thấy lớp'); return c; };
  const canGrade = (u: User, c: any) => {
    S.assertCenter(u, c.center_id);
    if (u.role === 'teacher') { const t = db.prepare('SELECT id FROM teachers WHERE user_id=?').get(u.id) as any; if (!t || t.id !== c.teacher_id) throw S.forbidden('Bạn không phụ trách lớp này'); }
  };
  app.get('/classes/:id/assessments', { preHandler: authed(CAN.grades) }, async (req) => {
    const c = classOf((req.params as any).id); canGrade(U(req), c);
    const as = db.prepare('SELECT * FROM assessments WHERE class_id=? ORDER BY date, rowid').all(c.id) as any[];
    const roster = S.classRoster(db, c.id) as any[];
    const sc = db.prepare(`SELECT s.* FROM scores s JOIN assessments a ON a.id=s.assessment_id WHERE a.class_id=?`).all(c.id) as any[];
    return { assessments: as, roster, scores: sc };
  });
  app.post('/classes/:id/assessments', { preHandler: authed(CAN.grades) }, async (req) => {
    const c = classOf((req.params as any).id); canGrade(U(req), c);
    const b = z.object({ title: z.string().min(2), kind: z.enum(['quiz', 'midterm', 'final', 'mock']).default('quiz'), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), maxScore: z.number().min(1).max(100).default(10) }).parse(req.body);
    const id = uid(); db.prepare('INSERT INTO assessments(id,class_id,title,kind,date,max_score,created_by) VALUES (?,?,?,?,?,?,?)').run(id, c.id, b.title, b.kind, b.date, b.maxScore, U(req).id);
    audit(db, U(req).id, 'create', 'assessment', id, b); return { id };
  });
  app.put('/assessments/:id/scores', { preHandler: authed(CAN.grades) }, async (req) => {
    const id = (req.params as any).id; const as = db.prepare('SELECT * FROM assessments WHERE id=?').get(id) as any; if (!as) throw S.notFound(); const c = classOf(as.class_id); canGrade(U(req), c);
    const b = z.object({ scores: z.array(z.object({ enrollmentId: z.string(), score: z.number().nullable(), comment: z.string().max(500).optional().nullable() })).min(1) }).parse(req.body);
    db.transaction(() => {
      for (const s of b.scores) {
        if (s.score !== null && (s.score < 0 || s.score > as.max_score)) throw S.bad(`Điểm phải từ 0 đến ${as.max_score}`);
        const en = db.prepare('SELECT 1 FROM enrollments WHERE id=? AND class_id=?').get(s.enrollmentId, c.id); if (!en) throw S.bad('Học viên không thuộc lớp này');
        const old = db.prepare('SELECT * FROM scores WHERE assessment_id=? AND enrollment_id=?').get(id, s.enrollmentId) as any;
        if (old && (old.score !== s.score || (old.comment ?? '') !== (s.comment ?? ''))) audit(db, U(req).id, 'update-score', 'score', `${id}:${s.enrollmentId}`, { old: { score: old.score, comment: old.comment }, new: s });
        db.prepare('INSERT INTO scores(assessment_id,enrollment_id,score,comment,by_user,at) VALUES (?,?,?,?,?,?) ON CONFLICT(assessment_id,enrollment_id) DO UPDATE SET score=excluded.score, comment=excluded.comment, by_user=excluded.by_user, at=excluded.at').run(id, s.enrollmentId, s.score, s.comment ?? null, U(req).id, nowIso());
      }
    })();
    return { ok: true };
  });
  app.delete('/assessments/:id', { preHandler: authed(['admin', 'manager', 'academic']) }, async (req) => {
    const id = (req.params as any).id; const as = db.prepare('SELECT * FROM assessments WHERE id=?').get(id) as any; if (!as) throw S.notFound(); canGrade(U(req), classOf(as.class_id));
    const n = (db.prepare('SELECT COUNT(*) c FROM scores WHERE assessment_id=? AND score IS NOT NULL').get(id) as any).c;
    if (n > 0) throw S.conflict(`Bài kiểm tra đã có ${n} điểm, không xóa được`);
    db.transaction(() => { db.prepare('DELETE FROM scores WHERE assessment_id=?').run(id); db.prepare('DELETE FROM assessments WHERE id=?').run(id); audit(db, U(req).id, 'delete', 'assessment', id); })();
    return { ok: true };
  });
  app.get('/students/:id/results', { preHandler: authed() }, async (req) => {
    const id = (req.params as any).id; const s = db.prepare('SELECT * FROM students WHERE id=?').get(id) as any; if (!s) throw S.notFound(); S.assertCenter(U(req), s.center_id);
    const results = db.prepare(`SELECT a.title, a.kind, a.date, a.max_score, sc.score, sc.comment, cl.code AS class_code FROM scores sc JOIN assessments a ON a.id=sc.assessment_id JOIN enrollments e ON e.id=sc.enrollment_id JOIN classes cl ON cl.id=a.class_id WHERE e.student_id=? ORDER BY a.date DESC`).all(id) as any[];
    const att = db.prepare(`SELECT a.status, COUNT(*) n FROM attendance a JOIN enrollments e ON e.id=a.enrollment_id WHERE e.student_id=? GROUP BY a.status`).all(id) as any[];
    const total = att.reduce((s, r) => s + r.n, 0); const present = att.filter((r) => ['present', 'late', 'makeup'].includes(r.status)).reduce((s, r) => s + r.n, 0);
    return { results, attendance: { total, present, rate: total ? Math.round((present / total) * 100) : null } };
  });
}
