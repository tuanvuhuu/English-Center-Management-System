import { describe, it, expect, beforeAll } from 'vitest';
import { openDb } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { seedIfEmpty } from '../src/seed.js';

const db = openDb(':memory:');
seedIfEmpty(db, { today: '2026-10-11' });
const app = buildApp(db);
const tok: Record<string, string> = {};

async function as(user: string, method: string, url: string, body?: unknown) {
  if (!tok[user]) {
    const r = await app.inject({ method: 'POST', url: '/auth/login', payload: { username: user, password: user === 'admin' ? 'admin123' : '123456' } });
    tok[user] = JSON.parse(r.body).token;
  }
  const r = await app.inject({ method: method as any, url, payload: body as any, headers: { authorization: `Bearer ${tok[user]}` } });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : null };
}
const fd = 'frontdesk.cg', mg = 'manager.cg', ac = 'accountant.cg';

describe('Đăng nhập & phạm vi', () => {
  it('sai mật khẩu bị từ chối, chưa đăng nhập bị chặn', async () => {
    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { username: 'admin', password: 'x' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/students' })).statusCode).toBe(401);
  });
  it('nhân viên trung tâm chỉ thấy dữ liệu trung tâm mình; admin thấy tất cả', async () => {
    const a = (await as(fd, 'GET', '/students')).body as any[];
    expect(a.length).toBeGreaterThan(10);
    expect(a.every((s) => s.center_id === 'cg')).toBe(true);
    expect((await as(fd, 'GET', '/students?centerId=hd')).status).toBe(403);
    const all = (await as('admin', 'GET', '/students')).body as any[];
    expect(new Set(all.map((s) => s.center_id)).size).toBe(4);
  });
  it('giáo viên không thấy số điện thoại đầy đủ; không xem được công nợ', async () => {
    const r = await as('teacher.cg', 'GET', '/students');
    expect(r.status).toBe(200);
    if (r.body.length) expect(r.body[0].guardian_phone).toContain('••••');
    expect((await as('teacher.cg', 'GET', '/debts')).status).toBe(403);
  });
});

describe('Học viên', () => {
  let id = '';
  it('thêm, chặn SĐT sai và hồ sơ trùng', async () => {
    const body = { centerId: 'cg', name: 'Trần Test Một', guardianName: 'Chị Hoa', guardianPhone: '0911222333' };
    const r = await as(fd, 'POST', '/students', body); expect(r.status).toBe(200); id = r.body.id;
    expect(r.body.code).toMatch(/^HV\d+/);
    expect((await as(fd, 'POST', '/students', { ...body, guardianPhone: '123' })).status).toBe(400);
    expect((await as(fd, 'POST', '/students', body)).status).toBe(409);
  });
  it('sửa có nhật ký; xóa được khi chưa có ghi danh', async () => {
    expect((await as(fd, 'PUT', `/students/${id}`, { school: 'THCS Test' })).status).toBe(200);
    expect(((await as('admin', 'GET', '/audit?limit=5')).body as any[]).some((a) => a.entity === 'student' && a.action === 'update')).toBe(true);
    expect((await as(fd, 'DELETE', `/students/${id}`)).status).toBe(200);
  });
  it('không xóa học viên đã có ghi danh', async () => {
    const list = (await as(fd, 'GET', '/students')).body as any[];
    const s = list.find((x) => x.active_enrollments > 0);
    const r = await as(fd, 'DELETE', `/students/${s.id}`);
    expect(r.status).toBe(409); expect(r.body.error).toMatch(/ghi danh/);
  });
});

describe('Lớp & lịch', () => {
  it('sinh đủ số buổi, bỏ qua ngày lễ', async () => {
    const classes = (await as(mg, 'GET', '/classes')).body as any[];
    const c = classes[0];
    const d = (await as(mg, 'GET', `/classes/${c.id}`)).body;
    expect(d.sessions).toHaveLength(c.total);
    expect(d.sessions.some((s: any) => s.date === '2026-10-20')).toBe(false);
  });
  it('chặn trùng phòng', async () => {
    const classes = (await as(mg, 'GET', '/classes')).body as any[];
    const c = classes[0];
    const r = await as(mg, 'POST', '/classes', { centerId: 'cg', courseId: c.course_id, roomId: c.room_id, teacherId: null, weekdays: c.weekdays, startTime: c.start_time, startDate: '2026-11-02', capacity: 10 });
    expect(r.status).toBe(409); expect(r.body.error).toMatch(/Trùng phòng/);
  });
  it('không xóa lớp có ghi danh; lễ tân không được tạo lớp', async () => {
    const classes = (await as(mg, 'GET', '/classes')).body as any[];
    const c = classes.find((x) => x.students > 0);
    expect((await as(mg, 'DELETE', `/classes/${c.id}`)).status).toBe(409);
    expect((await as(fd, 'POST', '/classes', {})).status).toBe(403);
  });
});

describe('Ghi danh, tiền, điểm danh', () => {
  let studentId = '', classId = '', enrollmentId = '';
  beforeAll(async () => {
    studentId = (await as(fd, 'POST', '/students', { centerId: 'cg', name: 'Lê Ghi Danh', guardianName: 'Anh Nam', guardianPhone: '0933444555' })).body.id;
    const classes = (await as(fd, 'GET', '/classes')).body as any[];
    classId = classes.find((c) => c.students < 8 && c.code.startsWith('KET'))!.id;
  });
  it('ghi danh tạo phát sinh mua buổi và công nợ; chặn ghi danh trùng', async () => {
    const r = await as(fd, 'POST', '/enrollments', { studentId, classId, paid: 1_000_000 });
    expect(r.status).toBe(200); enrollmentId = r.body.id;
    const d = (await as(fd, 'GET', `/enrollments/${enrollmentId}`)).body;
    expect(d.remaining).toBeGreaterThan(0);
    expect(d.money.collected).toBe(1_000_000);
    expect(d.money.receivable).toBe(d.enrollment.net - 1_000_000);
    expect(d.entries[0].type).toBe('purchase');
    expect((await as(fd, 'POST', '/enrollments', { studentId, classId })).status).toBe(409);
  });
  it('không thu vượt công nợ', async () => {
    const r = await as(fd, 'POST', `/enrollments/${enrollmentId}/receipts`, { amount: 999_000_000, method: 'cash' });
    expect(r.status).toBe(400);
  });
  it('hủy phiếu trong ngày cần lý do và kế toán/quản lý; lễ tân không hủy được', async () => {
    const id = (await as(fd, 'POST', `/enrollments/${enrollmentId}/receipts`, { amount: 500_000, method: 'transfer' })).body.id;
    expect((await as(fd, 'POST', `/receipts/${id}/void`, { reason: 'nhầm' })).status).toBe(403);
    expect((await as(ac, 'POST', `/receipts/${id}/void`, { reason: '' })).status).toBe(400);
    const r = await as(ac, 'POST', `/receipts/${id}/void`, { reason: 'nhập nhầm' });
    expect(r.body.mode).toBe('void');
    const d = (await as(fd, 'GET', `/enrollments/${enrollmentId}`)).body;
    expect(d.money.collected).toBe(1_000_000);
  });
  it('điểm danh trừ buổi; sửa điểm danh tạo phát sinh đảo chứ không sửa dòng cũ', async () => {
    const sess = (await as(mg, 'GET', `/classes/${classId}`)).body.sessions.find((x: any) => x.date >= '2026-10-12' && x.status === 'planned');
    // buổi tương lai nhưng vẫn điểm danh được trong hạn: dùng buổi đầu của lớp
    const att = (await as(mg, 'GET', `/sessions/${sess.id}/attendance`)).body;
    const row = att.rows.find((x: any) => x.enrollment_id === enrollmentId);
    expect(row).toBeTruthy();
    const before = (await as(mg, 'GET', `/enrollments/${enrollmentId}`)).body.remaining;
    expect((await as(mg, 'PUT', `/sessions/${sess.id}/attendance`, { marks: [{ enrollmentId, status: 'present' }] })).status).toBe(200);
    expect((await as(mg, 'GET', `/enrollments/${enrollmentId}`)).body.remaining).toBe(before - 1);
    expect((await as(mg, 'PUT', `/sessions/${sess.id}/attendance`, { marks: [{ enrollmentId, status: 'excused' }] })).status).toBe(200);
    const d = (await as(mg, 'GET', `/enrollments/${enrollmentId}`)).body;
    expect(d.balance.makeup).toBe(1);
    expect(d.entries.filter((e: any) => e.type === 'reversal')).toHaveLength(1);
    expect(d.entries.length).toBe(4); // mua, có mặt, đảo, vắng có phép
  });
  it('điểm danh buổi đã quá hạn khóa 48h bị chặn nếu không có người duyệt', async () => {
    const past = (await as(mg, 'GET', '/schedule?from=2026-09-01&to=2026-09-30')).body.find((s: any) => s.marked > 0);
    const att = (await as(mg, 'GET', `/sessions/${past.id}/attendance`)).body;
    expect(att.locked).toBe(true);
    const r = await as(mg, 'PUT', `/sessions/${past.id}/attendance`, { marks: [{ enrollmentId: att.rows[0].enrollment_id, status: att.rows[0].status === 'present' ? 'late' : 'present' }] });
    expect(r.status).toBe(409);
    const ok = await as(mg, 'PUT', `/sessions/${past.id}/attendance`, { marks: [{ enrollmentId: att.rows[0].enrollment_id, status: att.rows[0].status === 'present' ? 'late' : 'present' }], approvedReason: 'GV điểm danh nhầm' });
    expect(ok.status).toBe(200);
  });
  it('điều chỉnh buổi cần lý do; chỉ quản lý', async () => {
    expect((await as(fd, 'POST', `/enrollments/${enrollmentId}/adjust`, { sessions: 1, reason: 'bù' })).status).toBe(403);
    expect((await as(mg, 'POST', `/enrollments/${enrollmentId}/adjust`, { sessions: 1, reason: 'x' })).status).toBe(400);
    expect((await as(mg, 'POST', `/enrollments/${enrollmentId}/adjust`, { sessions: 1, reason: 'Tặng buổi đền bù' })).status).toBe(200);
  });
  it('hoàn phí: lễ tân tạo, người tạo không tự duyệt, duyệt xong đổi cả buổi và tiền', async () => {
    const r = await as(fd, 'POST', `/enrollments/${enrollmentId}/refund-request`, { reason: 'Chuyển nhà' });
    expect(r.status).toBe(200);
    expect((await as(fd, 'POST', `/enrollments/${enrollmentId}/refund-request`, { reason: 'lại' })).status).toBe(409);
    const list = (await as(mg, 'GET', '/refunds')).body as any[];
    const rf = list.find((x) => x.id === r.body.id);
    expect(rf.status).toBe('wait');
    expect((await as(fd, 'POST', `/refunds/${rf.id}/decide`, { approve: true })).status).toBe(403);
    expect((await as(mg, 'POST', `/refunds/${rf.id}/decide`, { approve: true })).status).toBe(200);
    const d = (await as(mg, 'GET', `/enrollments/${enrollmentId}`)).body;
    expect(d.enrollment.status).toBe('dropped');
    expect(d.balance.sessions).toBe(0);
    expect(d.money.collected).toBe(1_000_000 - rf.amount);
  });
});

describe('Tổng quan & báo cáo', () => {
  it('dashboard theo trung tâm; báo cáo hợp nhất chỉ admin', async () => {
    const d = (await as(mg, 'GET', '/dashboard?today=2026-10-12')).body;
    expect(d.activeStudents).toBeGreaterThan(0);
    expect(typeof d.debt).toBe('number');
    expect((await as(mg, 'GET', '/reports/centers')).status).toBe(403);
    expect(((await as('admin', 'GET', '/reports/centers')).body as any[]).length).toBe(4);
  });
  it('công nợ chỉ gồm khoản còn phải thu, sắp xếp giảm dần', async () => {
    const debts = (await as(ac, 'GET', '/debts')).body as any[];
    expect(debts.every((x) => x.receivable > 0)).toBe(true);
    for (let i = 1; i < debts.length; i++) expect(debts[i - 1].receivable).toBeGreaterThanOrEqual(debts[i].receivable);
  });
});
