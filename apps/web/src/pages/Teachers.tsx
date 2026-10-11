import { useState } from 'react';
import { get, post, put, del, vnd, dmy } from '../api';
import { Modal, Field, Confirm, Chip, Table, useAsync, useToast } from '../ui';
import type { Ctx } from '../App';

const KIND: Record<string, string> = { vn: 'GV Việt Nam', foreign: 'GV nước ngoài', assistant: 'Trợ giảng' };

function TeacherForm({ ctx, initial, onClose, onSaved }: { ctx: Ctx; initial?: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const [err, setErr] = useState('');
  const [f, setF] = useState({ centerId: initial?.center_id ?? (ctx.centerId || ctx.centers[0]?.id || ''), name: initial?.name ?? '', phone: initial?.phone ?? '', kind: initial?.kind ?? 'vn', rate: initial?.rate ?? 200000 });
  async function save() {
    try { const body = { ...f, phone: f.phone || null }; if (initial) { const { centerId, ...rest } = body; await put(`/teachers/${initial.id}`, rest); } else await post('/teachers', body); toast('Đã lưu giáo viên'); onSaved(); } catch (e) { setErr((e as Error).message); }
  }
  return <Modal title={initial ? 'Sửa giáo viên' : 'Thêm giáo viên'} onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={f.name.trim().length < 2} onClick={save}>Lưu</button></>}>
    {err && <div className="err">{err}</div>}
    {!initial && ctx.user.role === 'admin' && <Field label="Cơ sở"><select className="input" value={f.centerId} onChange={(e) => setF({ ...f, centerId: e.target.value })}>{ctx.centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
    <Field label="Họ tên" required><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
    <div className="grid2"><Field label="Điện thoại"><input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="Loại"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
    <Field label="Thù lao mỗi buổi (đ)" hint="Dùng tính bảng công theo buổi thực dạy"><input className="input" type="number" min={0} step={10000} value={f.rate} onChange={(e) => setF({ ...f, rate: Number(e.target.value) })} /></Field></Modal>;
}

export function Teachers({ ctx }: { ctx: Ctx }) {
  const toast = useToast(); const { data, loading, error, reload } = useAsync(() => get(`/teachers?centerId=${ctx.centerId}`), [ctx.centerId]);
  const [form, setForm] = useState<null | { initial?: any }>(null); const [rm, setRm] = useState<any>(null);
  const canW = ctx.user.role === 'admin' || ctx.user.role === 'manager'; const showRate = canW || ctx.user.role === 'accountant';
  async function remove() { try { const r = await del(`/teachers/${rm.id}`); toast(r.deactivated ? 'Giáo viên đã có lịch sử dạy nên được chuyển sang ngừng hoạt động' : 'Đã xóa giáo viên'); reload(); } catch (e) { toast((e as Error).message, 'err'); } setRm(null); }
  return (<>
    <div className="page-head"><div><div className="crumb">Giáo viên</div><h1>Giáo viên</h1><div className="sub">{data ? `${data.length} giáo viên` : ''}</div></div><div className="grow" />{canW && <button className="btn primary" onClick={() => setForm({})}>+ Thêm giáo viên</button>}</div>
    {error && <div className="err">{error}</div>}{loading && !data && <p className="muted">Đang tải…</p>}
    {data && <Table rowKey={(r: any) => r.id} rows={data} cols={[
      { key: 'n', head: 'Giáo viên', render: (r: any) => <b>{r.name}</b> }, { key: 'k', head: 'Loại', render: (r: any) => <Chip kind={r.kind === 'foreign' ? 'info' : 'muted'}>{KIND[r.kind]}</Chip> },
      ...(showRate ? [{ key: 'p', head: 'Điện thoại', hideMobile: true, render: (r: any) => r.phone ?? '—' }, { key: 'r', head: 'Thù lao/buổi', right: true, render: (r: any) => vnd(r.rate) }] : []),
      { key: 'a', head: '', right: true, render: (r: any) => canW ? <><button className="btn sm" onClick={() => setForm({ initial: r })}>Sửa</button> <button className="btn sm" onClick={() => setRm(r)}>Xóa</button></> : null }]} />}
    {form && <TeacherForm ctx={ctx} initial={form.initial} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
    {rm && <Confirm danger yes="Xóa" title="Xóa giáo viên" text={<>Xóa <b>{rm.name}</b>? Giáo viên đang phân công lớp không xóa được; đã có lịch sử dạy thì chỉ ngừng hoạt động.</>} onYes={remove} onNo={() => setRm(null)} />}
  </>);
}

export function Timesheet({ ctx }: { ctx: Ctx }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); const [sel, setSel] = useState<any>(null);
  const { data, loading, error } = useAsync(() => get(`/timesheet?month=${month}&centerId=${ctx.centerId}`), [month, ctx.centerId]);
  const detail = useAsync(() => (sel ? get(`/teachers/${sel.id}/sessions?month=${month}`) : Promise.resolve(null)), [sel?.id, month]);
  const canDetail = ctx.user.role !== 'teacher'; const showPay = ctx.user.role !== 'teacher';
  return (<>
    <div className="page-head"><div><div className="crumb">Giáo viên</div><h1>Bảng công giảng dạy</h1><div className="sub">Tính từ các buổi đã điểm danh, theo người dạy thực tế</div></div><div className="grow" /><input className="input" style={{ width: 160 }} type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
    {error && <div className="err">{error}</div>}{loading && !data && <p className="muted">Đang tải…</p>}
    {data && <><Table rowKey={(r: any) => r.id} rows={data.items} empty="Tháng này chưa có buổi dạy nào" onRow={canDetail ? (r: any) => setSel(r) : undefined} cols={[
      { key: 'n', head: 'Giáo viên', render: (r: any) => <b>{r.name}</b> }, { key: 's', head: 'Số buổi', right: true, render: (r: any) => r.sessions }, { key: 'h', head: 'Số giờ', right: true, render: (r: any) => r.hours },
      ...(showPay ? [{ key: 'r', head: 'Đơn giá', right: true, hideMobile: true, render: (r: any) => vnd(r.rate) }, { key: 'p', head: 'Thành tiền', right: true, render: (r: any) => <b>{vnd(r.pay)}</b> }] : [])]} />
      {showPay && <p className="muted" style={{ marginTop: 10 }}>Tổng: <b>{data.totalSessions}</b> buổi · <b>{vnd(data.totalPay)}</b>. Số liệu là đầu vào cho bảng lương; thuế và bảo hiểm tính ở phần mềm kế toán.</p>}</>}
    {sel && <Modal title={`${sel.name} · tháng ${month}`} onClose={() => setSel(null)}>{!detail.data ? <p className="muted">Đang tải…</p> : <Table rowKey={(r: any) => r.date + r.class_code} rows={detail.data} cols={[{ key: 'd', head: 'Ngày', render: (r: any) => `${dmy(r.date)} ${r.start_time}` }, { key: 'c', head: 'Lớp', render: (r: any) => r.class_code }, { key: 'm', head: 'Phút', right: true, render: (r: any) => r.minutes }]} />}</Modal>}
  </>);
}
