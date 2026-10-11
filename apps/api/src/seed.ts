import { type DB, uid, nowIso } from './db.js';
import { hashPass, type User } from './auth.js';
import * as S from './services.js';
import { openDb } from './db.js';

const CENTERS = [
  { id: 'cg', name: 'Cơ sở Cầu Giấy', address: '12 Duy Tân, Cầu Giấy, Hà Nội' },
  { id: 'hbt', name: 'Cơ sở Hai Bà Trưng', address: '88 Bạch Mai, Hai Bà Trưng, Hà Nội' },
  { id: 'lb', name: 'Cơ sở Long Biên', address: '5 Nguyễn Văn Cừ, Long Biên, Hà Nội' },
  { id: 'hd', name: 'Cơ sở Hà Đông', address: '30 Quang Trung, Hà Đông, Hà Nội' },
];
const COURSES = [
  { code: 'STA', name: 'Starters', level: 'Thiếu nhi', sessions: 30, minutes: 90, price: 5_400_000 },
  { code: 'MOV', name: 'Movers', level: 'Thiếu nhi', sessions: 30, minutes: 90, price: 5_700_000 },
  { code: 'FLY', name: 'Flyers', level: 'Thiếu nhi', sessions: 32, minutes: 90, price: 6_400_000 },
  { code: 'KET', name: 'KET', level: 'Thiếu niên', sessions: 36, minutes: 90, price: 7_200_000 },
  { code: 'PET', name: 'PET', level: 'Thiếu niên', sessions: 36, minutes: 90, price: 8_100_000 },
  { code: 'IE5', name: 'IELTS 5.0', level: 'Người lớn', sessions: 40, minutes: 120, price: 12_000_000 },
];
const LAST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
const MID = ['Minh', 'Bảo', 'Gia', 'Thu', 'Ngọc', 'Hải', 'Quang', 'Khánh', 'Diệu', 'Nhật', 'Phương', 'Đức'];
const FIRST = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Hân', 'Khang', 'Lâm', 'Mai', 'Nam', 'Phúc', 'Thảo', 'Vy', 'Yến', 'Linh', 'Long'];
const SCHEDULES: [number[], string][] = [[[2, 4], '17:45'], [[3, 5], '18:00'], [[6], '19:30'], [[0], '09:00'], [[1, 3], '08:00'], [[2, 4], '19:30'], [[3, 5], '08:00'], [[6, 0], '14:00']];

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function seedIfEmpty(db: DB, opts: { today?: string } = {}) {
  if ((db.prepare('SELECT COUNT(*) c FROM centers').get() as any).c > 0) return;
  const today = opts.today ?? nowIso().slice(0, 10);
  const r = rng(2026);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]!;
  const admin: User = { id: 'u-admin', username: 'admin', name: 'Quản trị tổ chức', role: 'admin', centerId: null };

  db.transaction(() => {
    for (const c of CENTERS) db.prepare('INSERT INTO centers(id,name,address) VALUES (?,?,?)').run(c.id, c.name, c.address);
    db.prepare('INSERT INTO users(id,username,name,role,center_id,pass) VALUES (?,?,?,?,?,?)').run('u-admin', 'admin', 'Quản trị tổ chức', 'admin', null, hashPass('admin123'));
    for (const c of CENTERS) {
      const un = (r: string) => `${r}.${c.id}`;
      const mk = (role: string, name: string) => db.prepare('INSERT INTO users(id,username,name,role,center_id,pass) VALUES (?,?,?,?,?,?)').run('u-' + un(role), un(role), name, role, c.id, hashPass('123456'));
      mk('manager', 'Quản lý ' + c.name.replace('Cơ sở ', '')); mk('academic', 'Học vụ ' + c.name.replace('Cơ sở ', ''));
      mk('accountant', 'Kế toán ' + c.name.replace('Cơ sở ', '')); mk('frontdesk', 'Lễ tân ' + c.name.replace('Cơ sở ', ''));
      for (let i = 1; i <= 4; i++) db.prepare('INSERT INTO rooms(id,center_id,name,capacity,kind) VALUES (?,?,?,?,?)').run(`${c.id}-r${i}`, c.id, `P${100 + i}`, 15, 'normal');
      db.prepare('INSERT INTO rooms(id,center_id,name,capacity,kind) VALUES (?,?,?,?,?)').run(`${c.id}-ol`, c.id, 'Online', 30, 'online');
      const tNames = ['Hannah Price', 'Lê Quang Vinh', 'Daniel Brooks', 'Phạm Thu Hà', 'Emma Clark', 'Đỗ Minh Tuấn'];
      tNames.forEach((n, i) => {
        const uidT = i === 1 ? 'u-' + un('teacher') : null;
        if (uidT) db.prepare('INSERT INTO users(id,username,name,role,center_id,pass) VALUES (?,?,?,?,?,?)').run(uidT, un('teacher'), n, 'teacher', c.id, hashPass('123456'));
        db.prepare('INSERT INTO teachers(id,center_id,name,phone,kind,user_id) VALUES (?,?,?,?,?,?)').run(`${c.id}-t${i}`, c.id, n, '09' + String(10000000 + Math.floor(r() * 8e7)), /^[A-Z][a-z]+ [A-Z]/.test(n) && i % 2 === 0 ? 'foreign' : 'vn', uidT);
      });
    }
    for (const co of COURSES) {
      const id = 'co-' + co.code;
      db.prepare('INSERT INTO courses(id,code,name,level,sessions,minutes) VALUES (?,?,?,?,?,?)').run(id, co.code, co.name, co.level, co.sessions, co.minutes);
      CENTERS.forEach((c, i) => db.prepare('INSERT INTO course_prices(course_id,center_id,price) VALUES (?,?,?)').run(id, c.id, Math.round(co.price * (1 + i * 0.03) / 10000) * 10000));
    }
    for (const [d, n] of [['2026-09-02', 'Quốc khánh'], ['2026-10-20', 'Ngày Phụ nữ Việt Nam'], ['2026-12-25', 'Giáng sinh (nghỉ trung tâm)']]) db.prepare('INSERT INTO holidays(date,center_id,name) VALUES (?,?,?)').run(d, null, n);
  })();

  // lớp
  const classIds: { id: string; center: string; course: string }[] = [];
  let k = 0;
  for (const c of CENTERS) {
    COURSES.forEach((co, ci) => {
      for (let j = 0; j < 2; j++) {
        const [days, time] = SCHEDULES[(k++) % SCHEDULES.length]!;
        const id = uid();
        const start = j === 0 ? '2026-09-07' : '2026-10-05';
        const conflict = S.classConflicts(db, { centerId: c.id, roomId: `${c.id}-r${(k % 4) + 1}`, teacherId: `${c.id}-t${k % 6}`, weekdays: days, startTime: time, minutes: co.minutes, startDate: start, total: co.sessions });
        const room = conflict.length ? `${c.id}-ol` : `${c.id}-r${(k % 4) + 1}`;
        const teacher = conflict.length ? null : `${c.id}-t${k % 6}`;
        db.prepare('INSERT INTO classes(id,code,center_id,course_id,teacher_id,room_id,weekdays,start_time,minutes,start_date,capacity,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(id, `${co.code}-${c.id.toUpperCase()}${j + 1}`, c.id, 'co-' + co.code, teacher, room, JSON.stringify(days), time, co.minutes, start, co.code === 'STA' ? 12 : 15, 'running');
        S.generateSessions(db, id);
        classIds.push({ id, center: c.id, course: co.code });
      }
    });
  }

  // học viên + ghi danh + điểm danh các buổi đã qua
  let n = 0;
  for (const c of CENTERS) {
    const cls = classIds.filter((x) => x.center === c.id);
    const fd: User = { id: `u-frontdesk.${c.id}`, username: '', name: '', role: 'frontdesk', centerId: c.id };
    const mgr: User = { id: `u-manager.${c.id}`, username: '', name: '', role: 'manager', centerId: c.id };
    for (let i = 0; i < 28; i++) {
      n++;
      const name = `${pick(LAST)} ${pick(MID)} ${pick(FIRST)}`;
      const sid = uid();
      db.prepare('INSERT INTO students(id,code,center_id,name,dob,school,guardian_name,guardian_phone,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(sid, 'HV' + String(1000 + n).padStart(5, '0'), c.id, name, `${2008 + Math.floor(r() * 10)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`, pick(['Trường TH Nguyễn Du', 'THCS Cầu Giấy', 'THPT Chu Văn An', 'TH Kim Đồng']), `${pick(['Anh', 'Chị'])} ${pick(LAST)} ${pick(FIRST)}`, `09${String(10000000 + Math.floor(r() * 8e7))}`, 'active', nowIso());
      if (r() < 0.15) continue; // một số học viên chưa ghi danh
      const cl = pick(cls);
      const disc = r() < 0.3 ? [{ code: 'EARLY', kind: 'percent' as const, value: 10 }] : [];
      let eid: string;
      try { eid = S.createEnrollment(db, fd, { studentId: sid, classId: cl.id, discounts: disc }); } catch { continue; }
      const sm = S.enrollmentSummary(db, eid);
      const roll = r();
      const paid = roll < 0.65 ? sm.enrollment.net : roll < 0.85 ? Math.floor(sm.enrollment.net / 2 / 1000) * 1000 : 0;
      if (paid > 0) S.addReceipt(db, fd, eid, paid, pick(['cash', 'transfer']), 'Thu khi ghi danh');
    }
    // điểm danh các buổi đã qua
    const past = db.prepare(`SELECT cs.id, cs.date, cs.start_time, cs.minutes, cs.class_id FROM class_sessions cs JOIN classes cl ON cl.id=cs.class_id WHERE cl.center_id=? AND cs.date < ? ORDER BY cs.date`).all(c.id, today) as any[];
    for (const s of past) {
      const roster = S.classRoster(db, s.class_id) as any[];
      if (!roster.length) continue;
      const end = new Date(Date.parse(`${s.date}T${s.start_time}:00Z`) + s.minutes * 60_000 + 3_600_000).toISOString();
      const marks = roster.map((x) => { const q = r(); return { enrollmentId: x.enrollment_id, status: (q < 0.84 ? 'present' : q < 0.9 ? 'late' : q < 0.95 ? 'excused' : 'unexcused') as any }; });
      try { S.markAttendance(db, mgr, s.id, marks, { now: end }); } catch { /* bỏ qua ghi danh hết nợ buổi */ }
    }
  }
  // một yêu cầu hoàn phí mẫu
  const e = db.prepare(`SELECT e.id, e.center_id FROM enrollments e WHERE e.status='active' LIMIT 1 OFFSET 5`).get() as any;
  if (e) { try { S.requestRefund(db, { id: `u-frontdesk.${e.center_id}`, username: '', name: '', role: 'frontdesk', centerId: e.center_id }, e.id, 'Gia đình chuyển nhà', {}); } catch { /* không đủ điều kiện */ } }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  const db = openDb(); seedIfEmpty(db);
  console.log('Đã nạp dữ liệu mẫu');
}
