import { useState } from 'react';
import { get, post, put, del, dmy, DAYS, type Role } from '../api';
import { Modal, Field, Confirm, Chip, Table, useAsync, useToast } from '../ui';
import type { Ctx } from '../App';

const KIND: Record<string, string> = { quiz: 'Kiểm tra nhanh', midterm: 'Giữa kỳ', final: 'Cuối kỳ', mock: 'Thi thử' };

function Grades({ ctx, classId }: { ctx: Ctx; classId: string }) {
  const toast = useToast(); const { data, loading, error, reload } = useAsync(() => get(`/classes/${classId}/assessments`), [classId]);
  const [add, setAdd] = useState(false); const [sel, setSel] = useState<any>(null);
  const [f, setF] = useState({ title: '', kind: 'quiz', date: new Date().toISOString().slice(0, 10), maxScore: 10 }); const [err, setErr] = useState('');
  const [vals, setVals] = useState<Record<string, { score: string; comment: string }>>({});
  if (loading) return <p className="muted">Đang tải…</p>; if (error || !data) return <div className="err">{error}</div>;
  const scoreOf = (aid: string, en: string) => data.scores.find((s: any) => s.assessment_id === aid && s.enrollment_id === en);
  async function create() { try { await post(`/classes/${classId}/assessments`, f); toast('Đã tạo bài kiểm tra'); setAdd(false); reload(); } catch (e) { setErr((e as Error).message); } }
  function openScores(a: any) { setSel(a); setErr(''); setVals(Object.fromEntries(data.roster.map((r: any) => { const s = scoreOf(a.id, r.enrollment_id); return [r.enrollment_id, { score: s?.score ?? '', comment: s?.comment ?? '' }]; }))); }
  async function saveScores() {
    try { await put(`/assessments/${sel.id}/scores`, { scores: Object.entries(vals).filter(([, v]) => v.score !== '' || v.comment).map(([enrollmentId, v]) => ({ enrollmentId, score: v.score === '' ? null : Number(v.score), comment: v.comment || null })) }); toast('Đã lưu điểm'); setSel(null); reload(); } catch (e) { setErr((e as Error).message); }
  }
  const avg = (a: any) => { const xs = data.scores.filter((s: any) => s.assessment_id === a.id && s.score != null).map((s: any) => s.score); return xs.length ? (xs.reduce((x: number, y: number) => x + y, 0) / xs.length).toFixed(1) : '—'; };
  return (<>
    <div className="toolbar"><div className="grow" /><button className="btn primary" onClick={() => { setAdd(true); setErr(''); }}>+ Bài kiểm tra</button></div>
    {data.assessments.length === 0 ? <div className="empty">Lớp chưa có bài kiểm tra nào.</div> : <Table rowKey={(a: any) => a.id} rows={data.assessments} onRow={openScores} cols={[
      { key: 't', head: 'Bài kiểm tra', render: (a: any) => <><b>{a.title}</b><div className="muted">{KIND[a.kind]}</div></> }, { key: 'd', head: 'Ngày', render: (a: any) => dmy(a.date) }, { key: 'm', head: 'Thang điểm', right: true, render: (a: any) => a.max_score },
      { key: 'g', head: 'Đã nhập', right: true, render: (a: any) => `${data.scores.filter((s: any) => s.assessment_id === a.id && s.score != null).length}/${data.roster.length}` }, { key: 'v', head: 'Điểm TB', right: true, render: (a: any) => avg(a) }]} />}
    {add && <Modal title="Bài kiểm tra mới" onClose={() => setAdd(false)} foot={<><button className="btn" onClick={() => setAdd(false)}>Hủy</button><button className="btn primary" disabled={f.title.trim().length < 2} onClick={create}>Tạo</button></>}>
      {err && <div className="err">{err}</div>}<Field label="Tên bài" required><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
      <div className="grid2"><Field label="Loại"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field><Field label="Ngày"><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field></div>
      <Field label="Thang điểm"><input className="input" type="number" min={1} max={100} value={f.maxScore} onChange={(e) => setF({ ...f, maxScore: Number(e.target.value) })} /></Field></Modal>}
    {sel && <Modal wide title={`${sel.title} · nhập điểm`} onClose={() => setSel(null)} foot={<><button className="btn" onClick={() => setSel(null)}>Hủy</button><button className="btn primary" onClick={saveScores}>Lưu điểm</button></>}>
      {err && <div className="err">{err}</div>}<p className="muted">Điểm từ 0 đến {sel.max_score}. Sửa điểm đã nhập được ghi vào nhật ký (giá trị cũ → mới).</p>
      {data.roster.map((r: any) => <div key={r.enrollment_id} className="grid2" style={{ alignItems: 'end' }}><Field label={`${r.name} (${r.code})`}><input className="input" type="number" min={0} max={sel.max_score} step={0.5} value={vals[r.enrollment_id]?.score ?? ''} onChange={(e) => setVals({ ...vals, [r.enrollment_id]: { ...vals[r.enrollment_id]!, score: e.target.value } })} placeholder="Điểm" /></Field>
        <Field label="Nhận xét"><input className="input" value={vals[r.enrollment_id]?.comment ?? ''} onChange={(e) => setVals({ ...vals, [r.enrollment_id]: { ...vals[r.enrollment_id]!, comment: e.target.value } })} /></Field></div>)}</Modal>}
  </>);
}

const WRITE: Role[] = ['admin', 'manager', 'academic'];
const CS: Record<string, [string, 'ok' | 'warn' | 'danger' | 'muted' | 'info']> = { open: ['Đang tuyển sinh', 'info'], running: ['Đang học', 'ok'], ended: ['Kết thúc', 'muted'], cancelled: ['Đã hủy', 'danger'] };
const sched = (c: any) => `${(c.weekdays as number[]).map((d) => DAYS[d]).join(', ')} · ${c.start_time}`;

function ClassForm({ ctx, onClose, onSaved }: { ctx: Ctx; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [centerId, setCenterId] = useState(ctx.centerId || ctx.centers[0]?.id || '');
  const { data: courses } = useAsync(() => get(`/courses?centerId=${centerId}`), [centerId]);
  const { data: teachers } = useAsync(() => get(`/teachers?centerId=${centerId}`), [centerId]);
  const { data: rooms } = useAsync(() => get(`/rooms?centerId=${centerId}`), [centerId]);
  const [f, setF] = useState({ courseId: '', teacherId: '', roomId: '', startTime: '18:00', startDate: new Date().toISOString().slice(0, 10), capacity: 15 });
  const [days, setDays] = useState<number[]>([2, 4]); const [err, setErr] = useState('');
  async function save() {
    try { const r = await post('/classes', { centerId, ...f, teacherId: f.teacherId || null, roomId: f.roomId || null, weekdays: days }); toast(`Đã mở lớp ${r.code}, hệ thống đã sinh lịch học`); onSaved(); } catch (e) { setErr((e as Error).message); }
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return <Modal title="Mở lớp mới" onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={!f.courseId || !days.length} onClick={save}>Mở lớp</button></>}>
    {err && <div className="err">{err}</div>}
    {ctx.user.role === 'admin' && <Field label="Cơ sở"><select className="input" value={centerId} onChange={(e) => setCenterId(e.target.value)}>{ctx.centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
    <Field label="Khóa học" required><select className="input" value={f.courseId} onChange={set('courseId')}><option value="">— Chọn khóa —</option>{(courses ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name} · {c.sessions} buổi</option>)}</select></Field>
    <div className="grid2"><Field label="Giáo viên"><select className="input" value={f.teacherId} onChange={set('teacherId')}><option value="">Chưa phân công</option>{(teachers ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      <Field label="Phòng học"><select className="input" value={f.roomId} onChange={set('roomId')}><option value="">Chưa xếp</option>{(rooms ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>)}</select></Field></div>
    <Field label="Ngày học trong tuần" required><div className="seg">{DAYS.map((d, i) => <button key={i} type="button" className={days.includes(i) ? 'on present' : ''} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}>{d}</button>)}</div></Field>
    <div className="grid2"><Field label="Giờ bắt đầu"><input className="input" type="time" value={f.startTime} onChange={set('startTime')} /></Field><Field label="Ngày khai giảng"><input className="input" type="date" value={f.startDate} onChange={set('startDate')} /></Field></div>
    <Field label="Sĩ số tối đa"><input className="input" type="number" min={1} max={60} value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} /></Field>
  </Modal>;
}

export function Classes({ ctx }: { ctx: Ctx }) {
  const toast = useToast(); const { data, loading, error, reload } = useAsync(() => get(`/classes?centerId=${ctx.centerId}`), [ctx.centerId]);
  const [form, setForm] = useState(false); const [rm, setRm] = useState<any>(null); const can = WRITE.includes(ctx.user.role);
  async function remove() { try { await del(`/classes/${rm.id}`); toast('Đã xóa lớp'); reload(); } catch (e) { toast((e as Error).message, 'err'); } setRm(null); }
  return (<>
    <div className="page-head"><div><div className="crumb">Lớp & lịch</div><h1>Danh sách lớp</h1><div className="sub">{data ? `${data.length} lớp` : ''}</div></div><div className="grow" />{can && <button className="btn primary" onClick={() => setForm(true)}>+ Mở lớp</button>}</div>
    {error && <div className="err">{error}</div>}{loading && !data && <p className="muted">Đang tải…</p>}
    {data && <Table rowKey={(r: any) => r.id} rows={data} onRow={(r: any) => ctx.go('classes/' + r.id)} cols={[
      { key: 'c', head: 'Lớp', render: (r: any) => <><b>{r.code}</b><div className="muted">{r.course_name}</div></> },
      { key: 's', head: 'Lịch học', render: (r: any) => sched(r) }, { key: 'r', head: 'Phòng · GV', hideMobile: true, render: (r: any) => <>{r.room_name ?? '—'}<div className="muted">{r.teacher_name ?? 'Chưa có GV'}</div></> },
      { key: 'n', head: 'Sĩ số', render: (r: any) => <span className={r.students < 6 ? 'bad' : ''}>{r.students}/{r.capacity}</span> },
      { key: 'p', head: 'Tiến độ', render: (r: any) => <><span className="bar"><i style={{ width: `${(r.done / r.total) * 100}%` }} /></span> {r.done}/{r.total}</> },
      { key: 'st', head: 'Trạng thái', render: (r: any) => <Chip kind={CS[r.status]?.[1]}>{CS[r.status]?.[0]}</Chip> },
      { key: 'a', head: '', right: true, render: (r: any) => can ? <button className="btn sm" onClick={() => setRm(r)}>Xóa</button> : null }]} />}
    {form && <ClassForm ctx={ctx} onClose={() => setForm(false)} onSaved={() => { setForm(false); reload(); }} />}
    {rm && <Confirm danger yes="Xóa lớp" title="Xóa lớp" text={<>Xóa lớp <b>{rm.code}</b>? Lớp đã có ghi danh không xóa được, hãy đổi trạng thái sang Hủy.</>} onYes={remove} onNo={() => setRm(null)} />}
  </>);
}

export function ClassDetail({ ctx, id }: { ctx: Ctx; id: string }) {
  const toast = useToast(); const { data, loading, error, reload } = useAsync(() => get(`/classes/${id}`), [id]);
  const [tab, setTab] = useState('info'); const [cancel, setCancel] = useState<any>(null); const [reason, setReason] = useState(''); const can = WRITE.includes(ctx.user.role);
  if (loading) return <p className="muted">Đang tải…</p>; if (error || !data) return <div className="err">{error}</div>;
  const c = data.class;
  async function doCancel() { try { await post(`/sessions/${cancel.id}/cancel`, { reason }); toast('Đã hủy buổi và nối thêm 1 buổi vào cuối khóa'); setCancel(null); setReason(''); reload(); } catch (e) { toast((e as Error).message, 'err'); } }
  async function setStatus(status: string) { try { await put(`/classes/${id}`, { status }); toast('Đã cập nhật lớp'); reload(); } catch (e) { toast((e as Error).message, 'err'); } }
  return (<>
    <div className="page-head"><div><div className="crumb"><a style={{ cursor: 'pointer' }} onClick={() => ctx.go('classes')}>Lớp</a> / {c.code}</div><h1>{c.code} · {c.course_name}</h1><div className="sub">{sched(c)} · bắt đầu {dmy(c.start_date)}</div></div><div className="grow" />
      {can && c.status !== 'cancelled' && <button className="btn" onClick={() => setStatus('cancelled')}>Hủy lớp</button>}{can && c.status === 'running' && <button className="btn" onClick={() => setStatus('ended')}>Kết thúc lớp</button>}</div>
    <div className="tabs"><button className={tab === 'info' ? 'on' : ''} onClick={() => setTab('info')}>Học viên & lịch</button>{['admin', 'manager', 'academic', 'teacher'].includes(ctx.user.role) && <button className={tab === 'grades' ? 'on' : ''} onClick={() => setTab('grades')}>Điểm & nhận xét</button>}</div>
    {tab === 'grades' && <Grades ctx={ctx} classId={id} />}
    {tab === 'info' && <><div className="card"><div className="card-head"><h2>Học viên ({data.roster.length}/{c.capacity})</h2></div>
      <Table rowKey={(r: any) => r.enrollment_id} rows={data.roster} empty="Lớp chưa có học viên" onRow={(r: any) => ctx.go('students/' + r.student_id)} cols={[{ key: 'n', head: 'Học viên', render: (r: any) => <><b>{r.name}</b> <span className="muted">{r.code}</span></> }, { key: 's', head: 'Trạng thái', render: (r: any) => r.status === 'frozen' ? <Chip kind="warn">Bảo lưu</Chip> : <Chip kind="ok">Đang học</Chip> }]} /></div>
    <div className="card"><div className="card-head"><h2>Lịch {data.sessions.length} buổi</h2></div>
      <Table rowKey={(s: any) => s.id} rows={data.sessions} cols={[{ key: 'n', head: 'Buổi', render: (s: any) => s.n }, { key: 'd', head: 'Ngày', render: (s: any) => `${DAYS[new Date(s.date + 'T00:00:00Z').getUTCDay()]} ${dmy(s.date)} ${s.start_time}` },
        { key: 'st', head: 'Trạng thái', render: (s: any) => s.status === 'done' ? <Chip kind="ok">Đã dạy</Chip> : s.status === 'cancelled' ? <Chip kind="danger">Đã hủy</Chip> : <Chip>Dự kiến</Chip> },
        { key: 'a', head: '', right: true, render: (s: any) => can && s.status === 'planned' ? <button className="btn sm" onClick={() => setCancel(s)}>Hủy buổi</button> : null }]} /></div></>}
    {cancel && <Modal title={`Hủy buổi ${cancel.n} (${dmy(cancel.date)})`} onClose={() => setCancel(null)} foot={<><button className="btn" onClick={() => setCancel(null)}>Đóng</button><button className="btn danger" disabled={reason.trim().length < 2} onClick={doCancel}>Hủy buổi</button></>}>
      <p className="muted">Buổi hủy không trừ buổi của học viên; hệ thống nối thêm 1 buổi vào cuối khóa.</p><Field label="Lý do" required><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Giáo viên ốm" /></Field></Modal>}
  </>);
}
