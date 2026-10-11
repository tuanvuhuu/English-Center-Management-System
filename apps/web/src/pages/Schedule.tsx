import { useState } from 'react';
import { get, put, DAYS, dmy, type Role } from '../api';
import { Modal, Chip, useAsync, useToast } from '../ui';
import type { Ctx } from '../App';

const MARK: [string, string][] = [['present', 'Có mặt'], ['late', 'Muộn'], ['excused', 'Vắng có phép'], ['unexcused', 'Vắng không phép'], ['makeup', 'Học bù']];
const ATT: Role[] = ['admin', 'manager', 'academic', 'teacher'];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(new Date(s + 'T00:00:00Z').getTime() + n * 86_400_000));
const monday = (s: string) => { const d = new Date(s + 'T00:00:00Z'); return addDays(s, -((d.getUTCDay() + 6) % 7)); };

function Attendance({ ctx, session, onClose, onDone }: { ctx: Ctx; session: any; onClose: () => void; onDone: () => void }) {
  const toast = useToast(); const { data } = useAsync(() => get(`/sessions/${session.id}/attendance`), [session.id]);
  const [marks, setMarks] = useState<Record<string, string>>({}); const [reason, setReason] = useState(''); const [err, setErr] = useState('');
  if (!data) return <Modal title="Điểm danh" onClose={onClose}><p className="muted">Đang tải…</p></Modal>;
  const cur = (r: any) => marks[r.enrollment_id] ?? r.status; const mgr = ctx.user.role === 'admin' || ctx.user.role === 'manager';
  const changed = data.rows.filter((r: any) => marks[r.enrollment_id] && marks[r.enrollment_id] !== r.status);
  async function save() {
    try { await put(`/sessions/${session.id}/attendance`, { marks: changed.map((r: any) => ({ enrollmentId: r.enrollment_id, status: marks[r.enrollment_id] })), approvedReason: reason || undefined }); toast('Đã lưu điểm danh'); onDone(); } catch (e) { setErr((e as Error).message); }
  }
  return <Modal wide title={`Điểm danh ${session.class_code} · ${dmy(session.date)} ${session.start_time}`} onClose={onClose}
    foot={<><button className="btn" onClick={() => setMarks(Object.fromEntries(data.rows.map((r: any) => [r.enrollment_id, 'present'])))}>Tất cả có mặt</button><button className="btn primary" disabled={!changed.length} onClick={save}>Lưu ({changed.length})</button></>}>
    {err && <div className="err">{err}</div>}
    {data.locked && <div className="err" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>Buổi này đã quá hạn khóa điểm danh (48 giờ). {mgr ? 'Nhập lý do để mở sửa:' : 'Cần quản lý trung tâm duyệt.'}{mgr && <input className="input" style={{ marginTop: 6 }} placeholder="Lý do sửa sau khóa" value={reason} onChange={(e) => setReason(e.target.value)} />}</div>}
    {data.rows.length === 0 ? <p className="muted">Lớp chưa có học viên đang học.</p> : data.rows.map((r: any) => (
      <div key={r.enrollment_id} style={{ marginBottom: 12 }}><div style={{ marginBottom: 4 }}><b>{r.name}</b> <span className="muted">{r.code}</span></div>
        <div className="seg">{MARK.map(([k, l]) => <button key={k} type="button" className={cur(r) === k ? `on ${k}` : ''} onClick={() => setMarks({ ...marks, [r.enrollment_id]: k })}>{l}</button>)}</div></div>))}
  </Modal>;
}

export function Schedule({ ctx }: { ctx: Ctx }) {
  const [from, setFrom] = useState(monday(iso(new Date()))); const to = addDays(from, 6); const [sel, setSel] = useState<any>(null);
  const { data, loading, error, reload } = useAsync(() => get(`/schedule?from=${from}&to=${to}&centerId=${ctx.centerId}`), [from, ctx.centerId]);
  const byDay: Record<string, any[]> = {}; (data ?? []).forEach((s: any) => (byDay[s.date] ||= []).push(s));
  return (<>
    <div className="page-head"><div><div className="crumb">Lớp & lịch</div><h1>Lịch học & điểm danh</h1><div className="sub">{dmy(from)} – {dmy(to)}</div></div><div className="grow" />
      <button className="btn" onClick={() => setFrom(addDays(from, -7))}>‹ Tuần trước</button><button className="btn" onClick={() => setFrom(monday(iso(new Date())))}>Tuần này</button><button className="btn" onClick={() => setFrom(addDays(from, 7))}>Tuần sau ›</button></div>
    {error && <div className="err">{error}</div>}{loading && !data && <p className="muted">Đang tải…</p>}
    {data && Object.keys(byDay).length === 0 && <div className="empty">Không có buổi học trong tuần này.</div>}
    {Object.entries(byDay).map(([d, list]) => <div key={d}><div className="day-h">{DAYS[new Date(d + 'T00:00:00Z').getUTCDay()]}, {dmy(d)}</div>
      {list.map((s) => <div key={s.id} className="sess" onClick={() => ATT.includes(ctx.user.role) && s.status !== 'cancelled' && setSel(s)}>
        <span className="t">{s.start_time}</span><div className="grow"><b>{s.class_code}</b> · {s.course_name}<div className="muted">{s.room_name ?? '—'} · {s.teacher_name ?? 'Chưa có GV'} · {s.students} học viên</div></div>
        {s.status === 'cancelled' ? <Chip kind="danger">Đã hủy</Chip> : s.marked ? <Chip kind="ok">Đã điểm danh</Chip> : <Chip>Chưa điểm danh</Chip>}</div>)}</div>)}
    {sel && <Attendance ctx={ctx} session={sel} onClose={() => setSel(null)} onDone={() => { setSel(null); reload(); }} />}
  </>);
}
