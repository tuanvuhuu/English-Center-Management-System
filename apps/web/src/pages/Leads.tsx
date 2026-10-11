import { useState } from 'react';
import { get, post, put, del, dmy } from '../api';
import { Modal, Field, Confirm, Chip, Table, useAsync, useToast } from '../ui';
import type { Ctx } from '../App';

const ST: Record<string, [string, 'info' | 'warn' | 'ok' | 'danger' | 'muted']> = { new: ['Mới', 'info'], contacted: ['Đã tư vấn', 'warn'], tested: ['Đã test', 'warn'], trial: ['Học thử', 'warn'], won: ['Đã ghi danh', 'ok'], lost: ['Không thành công', 'danger'] };
const SRC: Record<string, string> = { walkin: 'Khách vãng lai', facebook: 'Facebook', zalo: 'Zalo', website: 'Website', referral: 'Giới thiệu', school: 'Trường học', event: 'Sự kiện' };

function LeadForm({ ctx, onClose, onSaved }: { ctx: Ctx; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const [err, setErr] = useState('');
  const [f, setF] = useState({ centerId: ctx.centerId || ctx.centers[0]?.id || '', name: '', phone: '', source: 'walkin', interest: '', note: '' });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  async function save() { try { await post('/leads', { ...f, interest: f.interest || null, note: f.note || null }); toast('Đã thêm lead'); onSaved(); } catch (e) { setErr((e as Error).message); } }
  return <Modal title="Thêm lead mới" onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={!f.name || !f.phone} onClick={save}>Thêm lead</button></>}>
    {err && <div className="err">{err}</div>}
    {ctx.user.role === 'admin' && <Field label="Cơ sở"><select className="input" value={f.centerId} onChange={set('centerId')}>{ctx.centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
    <div className="grid2"><Field label="Họ tên học viên" required><input className="input" value={f.name} onChange={set('name')} autoFocus /></Field><Field label="Số điện thoại phụ huynh" required><input className="input" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field></div>
    <div className="grid2"><Field label="Nguồn"><select className="input" value={f.source} onChange={set('source')}>{Object.entries(SRC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field><Field label="Quan tâm khóa"><input className="input" value={f.interest} onChange={set('interest')} placeholder="VD: KET, IELTS 5.0" /></Field></div>
    <Field label="Ghi chú"><textarea className="input" rows={2} value={f.note} onChange={set('note')} /></Field></Modal>;
}

function Convert({ lead, onClose, onDone }: { lead: any; onClose: () => void; onDone: (studentId: string) => void }) {
  const toast = useToast(); const [err, setErr] = useState('');
  const { data: classes } = useAsync(() => get(`/classes?centerId=${lead.center_id}`), [lead.id]);
  const [f, setF] = useState({ guardianName: '', classId: '', paid: 0 });
  async function save() { try { const r = await post(`/leads/${lead.id}/convert`, { guardianName: f.guardianName, classId: f.classId || undefined, paid: f.paid }); toast(`Đã tạo học viên ${r.code}`); onDone(r.studentId); } catch (e) { setErr((e as Error).message); } }
  const open = (classes ?? []).filter((c: any) => ['open', 'running'].includes(c.status) && c.students < c.capacity);
  return <Modal title={`Chốt ghi danh · ${lead.name}`} onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={f.guardianName.trim().length < 2} onClick={save}>Chốt</button></>}>
    {err && <div className="err">{err}</div>}<p className="muted">Hệ thống tạo hồ sơ học viên từ thông tin lead (không nhập lại) và có thể ghi danh luôn.</p>
    <Field label="Tên phụ huynh / người thanh toán" required><input className="input" value={f.guardianName} onChange={(e) => setF({ ...f, guardianName: e.target.value })} autoFocus /></Field>
    <Field label="Ghi danh vào lớp (tùy chọn)"><select className="input" value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })}><option value="">Chưa ghi danh khóa</option>{open.map((c: any) => <option key={c.id} value={c.id}>{c.code} · {c.course_name} · {c.students}/{c.capacity}</option>)}</select></Field>
    {f.classId && <Field label="Thu ngay (đ)"><input className="input" type="number" min={0} step={1000} value={f.paid} onChange={(e) => setF({ ...f, paid: Number(e.target.value) })} /></Field>}</Modal>;
}

function LeadDetail({ ctx, id, onClose, onChanged }: { ctx: Ctx; id: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast(); const { data, reload } = useAsync(() => get(`/leads/${id}`), [id]);
  const [note, setNote] = useState(''); const [step, setStep] = useState<null | 'test' | 'lost' | 'convert'>(null); const [score, setScore] = useState(70); const [level, setLevel] = useState('A2'); const [why, setWhy] = useState('');
  if (!data) return <Modal title="Lead" onClose={onClose}><p className="muted">Đang tải…</p></Modal>;
  const l = data.lead; const done = l.status === 'won';
  const refresh = () => { reload(); onChanged(); };
  async function act(fn: () => Promise<any>, ok: string) { try { await fn(); toast(ok); setStep(null); refresh(); } catch (e) { toast((e as Error).message, 'err'); } }
  return <Modal wide title={`${l.name} · ${l.phone}`} onClose={onClose}>
    <div className="toolbar"><Chip kind={ST[l.status][1]}>{ST[l.status][0]}</Chip><Chip>{SRC[l.source]}</Chip>{l.interest && <Chip>Quan tâm: {l.interest}</Chip>}{l.test_score != null && <Chip kind="info">Test {l.test_score}đ · {l.test_level}</Chip>}{l.lost_reason && <Chip kind="danger">{l.lost_reason}</Chip>}</div>
    {!done && <div className="toolbar">
      <button className="btn sm" onClick={() => setStep('test')}>Ghi kết quả test</button>
      <button className="btn sm" onClick={() => act(() => put(`/leads/${id}`, { status: 'trial' }), 'Đã chuyển sang học thử')} disabled={l.status === 'new'}>Học thử</button>
      <button className="btn sm primary" onClick={() => setStep('convert')}>Chốt ghi danh</button>
      <button className="btn sm" onClick={() => setStep('lost')}>Không thành công</button></div>}
    {done && l.student_id && <p><button className="btn sm" onClick={() => { onClose(); ctx.go('students/' + l.student_id); }}>Xem hồ sơ học viên →</button></p>}
    <h2 style={{ margin: '10px 0 6px' }}>Lịch sử chăm sóc</h2>
    {!done && <div className="toolbar"><input className="input search" placeholder="Ghi chú cuộc gọi / buổi gặp…" value={note} onChange={(e) => setNote(e.target.value)} /><button className="btn" disabled={note.trim().length < 2} onClick={() => act(() => post(`/leads/${id}/activity`, { note }).then(() => setNote('')), 'Đã ghi nhận')}>Ghi nhận</button></div>}
    {data.activities.length === 0 ? <p className="muted">Chưa có hoạt động.</p> : data.activities.map((a: any) => <div key={a.id} style={{ borderLeft: '2px solid var(--line)', padding: '2px 0 8px 12px' }}><div className="muted" style={{ fontSize: 12 }}>{new Date(a.at).toLocaleString('vi-VN')} · {a.actor_name ?? a.actor}</div>{a.note}</div>)}
    {step === 'test' && <Modal title="Kết quả test đầu vào" onClose={() => setStep(null)} foot={<><button className="btn" onClick={() => setStep(null)}>Hủy</button><button className="btn primary" onClick={() => act(() => put(`/leads/${id}`, { status: 'tested', testScore: score, testLevel: level }), 'Đã lưu kết quả test')}>Lưu</button></>}>
      <div className="grid2"><Field label="Điểm (0–100)"><input className="input" type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} /></Field><Field label="Trình độ đề xuất"><input className="input" value={level} onChange={(e) => setLevel(e.target.value)} /></Field></div></Modal>}
    {step === 'lost' && <Modal title="Không thành công" onClose={() => setStep(null)} foot={<><button className="btn" onClick={() => setStep(null)}>Hủy</button><button className="btn danger" disabled={!why.trim()} onClick={() => act(() => put(`/leads/${id}`, { status: 'lost', lostReason: why }), 'Đã ghi nhận')}>Xác nhận</button></>}>
      <Field label="Lý do" required hint="Dùng để phân tích: giá, lịch học, xa nhà, chọn nơi khác…"><input className="input" value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field></Modal>}
    {step === 'convert' && <Convert lead={l} onClose={() => setStep(null)} onDone={(sid) => { setStep(null); onClose(); onChanged(); ctx.go('students/' + sid); }} />}
  </Modal>;
}

export function Leads({ ctx }: { ctx: Ctx }) {
  const toast = useToast(); const [status, setStatus] = useState(''); const [q, setQ] = useState('');
  const { data, loading, error, reload } = useAsync(() => get(`/leads?centerId=${ctx.centerId}&status=${status}&q=${encodeURIComponent(q)}`), [ctx.centerId, status, q]);
  const fun = useAsync(() => get(`/leads/funnel?centerId=${ctx.centerId}`), [ctx.centerId]);
  const [form, setForm] = useState(false); const [open, setOpen] = useState<string | null>(null); const [rm, setRm] = useState<any>(null);
  const canDel = ctx.user.role === 'admin' || ctx.user.role === 'manager';
  async function remove() { try { await del(`/leads/${rm.id}`); toast('Đã xóa lead'); reload(); fun.reload(); } catch (e) { toast((e as Error).message, 'err'); } setRm(null); }
  const f = fun.data;
  return (<>
    <div className="page-head"><div><div className="crumb">Tuyển sinh</div><h1>Lead & tư vấn</h1><div className="sub">{f ? `${f.total} lead · tỉ lệ chốt ${f.conversion}%` : ''}</div></div><div className="grow" /><button className="btn primary" onClick={() => setForm(true)}>+ Thêm lead</button></div>
    {f && <div className="tabs">{[['', 'Tất cả', f.total], ...Object.entries(ST).map(([k, [l]]) => [k, l, f.by[k] ?? 0])].map(([k, l, n]) => <button key={k as string} className={status === k ? 'on' : ''} onClick={() => setStatus(k as string)}>{l} ({n})</button>)}</div>}
    <div className="toolbar"><input className="input search" placeholder="Tìm tên, số điện thoại…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {error && <div className="err">{error}</div>}{loading && !data && <p className="muted">Đang tải…</p>}
    {data && <Table rowKey={(r: any) => r.id} rows={data} onRow={(r: any) => setOpen(r.id)} empty="Chưa có lead" cols={[
      { key: 'n', head: 'Lead', render: (r: any) => <><b>{r.name}</b><div className="muted">{r.phone}</div></> }, { key: 's', head: 'Nguồn', hideMobile: true, render: (r: any) => SRC[r.source] }, { key: 'i', head: 'Quan tâm', hideMobile: true, render: (r: any) => r.interest ?? '—' },
      { key: 't', head: 'Test', render: (r: any) => r.test_score != null ? `${r.test_score}đ · ${r.test_level}` : '—' }, { key: 'st', head: 'Trạng thái', render: (r: any) => <Chip kind={ST[r.status][1]}>{ST[r.status][0]}</Chip> },
      { key: 'u', head: 'Cập nhật', hideMobile: true, render: (r: any) => dmy(r.updated_at) }, { key: 'a', head: '', right: true, render: (r: any) => canDel && r.status !== 'won' ? <button className="btn sm" onClick={() => setRm(r)}>Xóa</button> : null }]} />}
    {f && f.sources.length > 0 && <div className="card" style={{ marginTop: 14 }}><div className="card-head"><h2>Hiệu quả theo nguồn</h2></div>
      <Table rowKey={(r: any) => r.source} rows={f.sources} cols={[{ key: 's', head: 'Nguồn', render: (r: any) => SRC[r.source] }, { key: 'n', head: 'Số lead', right: true, render: (r: any) => r.n }, { key: 'w', head: 'Đã ghi danh', right: true, render: (r: any) => r.won ?? 0 }, { key: 'c', head: 'Tỉ lệ', right: true, render: (r: any) => `${Math.round(((r.won ?? 0) / r.n) * 100)}%` }]} /></div>}
    {form && <LeadForm ctx={ctx} onClose={() => setForm(false)} onSaved={() => { setForm(false); reload(); fun.reload(); }} />}
    {open && <LeadDetail ctx={ctx} id={open} onClose={() => setOpen(null)} onChanged={() => { reload(); fun.reload(); }} />}
    {rm && <Confirm danger yes="Xóa lead" title="Xóa lead" text={<>Xóa lead <b>{rm.name}</b>? Lịch sử chăm sóc cũng bị xóa.</>} onYes={remove} onNo={() => setRm(null)} />}
  </>);
}
