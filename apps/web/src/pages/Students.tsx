import { useState } from 'react';
import { get, post, put, del, vnd, dmy, type Role } from '../api';
import { Modal, Field, Confirm, Chip, Table, useAsync, useToast } from '../ui';
import type { Ctx } from '../App';

const WRITE: Role[] = ['admin', 'manager', 'academic', 'frontdesk'];
const ENROLL: Role[] = ['admin', 'manager', 'frontdesk'];
const STATUS: Record<string, [string, 'ok' | 'warn' | 'danger' | 'muted']> = { active: ['Đang học', 'ok'], frozen: ['Bảo lưu', 'warn'], completed: ['Hoàn thành', 'muted'], dropped: ['Ngừng học', 'danger'] };

function StudentForm({ ctx, initial, onClose, onSaved }: { ctx: Ctx; initial?: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ centerId: initial?.center_id ?? (ctx.centerId || ctx.centers[0]?.id || ''), name: initial?.name ?? '', dob: initial?.dob ?? '', school: initial?.school ?? '', guardianName: initial?.guardian_name ?? '', guardianPhone: initial?.guardian_phone ?? '', note: initial?.note ?? '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  async function save() {
    setBusy(true); setErr('');
    try {
      const body = { ...f, dob: f.dob || null, school: f.school || null, note: f.note || null };
      if (initial) { const { centerId, ...rest } = body; await put(`/students/${initial.id}`, rest); } else await post('/students', body);
      toast(initial ? 'Đã lưu thay đổi' : 'Đã thêm học viên'); onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal title={initial ? `Sửa học viên ${initial.code}` : 'Thêm học viên'} onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={busy} onClick={save}>{initial ? 'Lưu thay đổi' : 'Thêm học viên'}</button></>}>
      {err && <div className="err">{err}</div>}
      {!initial && ctx.user.role === 'admin' && <Field label="Cơ sở" required><select className="input" value={f.centerId} onChange={set('centerId')}>{ctx.centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
      <Field label="Họ và tên" required><input className="input" value={f.name} onChange={set('name')} autoFocus /></Field>
      <div className="grid2"><Field label="Ngày sinh"><input className="input" type="date" value={f.dob} onChange={set('dob')} /></Field><Field label="Trường đang học"><input className="input" value={f.school} onChange={set('school')} /></Field></div>
      <div className="grid2"><Field label="Phụ huynh / người thanh toán" required><input className="input" value={f.guardianName} onChange={set('guardianName')} /></Field>
        <Field label="Số điện thoại" required hint="Dùng nhận thông báo và kiểm tra trùng hồ sơ"><input className="input" inputMode="tel" value={f.guardianPhone} onChange={set('guardianPhone')} /></Field></div>
      <Field label="Ghi chú"><textarea className="input" rows={2} value={f.note} onChange={set('note')} /></Field>
    </Modal>
  );
}

export function Students({ ctx }: { ctx: Ctx }) {
  const toast = useToast();
  const [q, setQ] = useState(''); const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useAsync(() => get(`/students?centerId=${ctx.centerId}&q=${encodeURIComponent(q)}&status=${status}`), [ctx.centerId, q, status]);
  const [form, setForm] = useState<null | { initial?: any }>(null); const [rm, setRm] = useState<any>(null);
  const canWrite = WRITE.includes(ctx.user.role);
  async function remove() { try { await del(`/students/${rm.id}`); toast('Đã xóa hồ sơ'); setRm(null); reload(); } catch (e) { toast((e as Error).message, 'err'); setRm(null); } }
  return (<>
    <div className="page-head"><div><div className="crumb">Học viên</div><h1>Danh sách học viên</h1><div className="sub">{data ? `${data.length} học viên` : ''}</div></div><div className="grow" />
      {canWrite && <button className="btn primary" onClick={() => setForm({})}>+ Thêm học viên</button>}</div>
    <div className="toolbar"><input className="input search" placeholder="Tìm tên, mã HV, số điện thoại…" value={q} onChange={(e) => setQ(e.target.value)} />
      <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></div>
    {error && <div className="err">{error}</div>}{loading && !data && <p className="muted">Đang tải…</p>}
    {data && <Table rowKey={(r: any) => r.id} onRow={(r: any) => ctx.go('students/' + r.id)} empty="Chưa có học viên nào" rows={data}
      cols={[
        { key: 'n', head: 'Học viên', render: (r: any) => <><b>{r.name}</b><div className="muted">{r.code}</div></> },
        { key: 'g', head: 'Phụ huynh', render: (r: any) => <>{r.guardian_name}<div className="muted">{r.guardian_phone}</div></> },
        { key: 's', head: 'Trường', hideMobile: true, render: (r: any) => r.school ?? '—' },
        { key: 'e', head: 'Đang học', render: (r: any) => r.active_enrollments ? <Chip kind="ok">{r.active_enrollments} khóa</Chip> : <Chip>Chưa ghi danh</Chip> },
        { key: 'st', head: 'Trạng thái', render: (r: any) => r.status === 'active' ? <Chip kind="ok">Hoạt động</Chip> : <Chip kind="danger">Ngừng</Chip> },
        { key: 'a', head: '', right: true, render: (r: any) => canWrite ? <><button className="btn sm" onClick={() => setForm({ initial: r })}>Sửa</button> <button className="btn sm" onClick={() => setRm(r)}>Xóa</button></> : null },
      ]} />}
    {form && <StudentForm ctx={ctx} initial={form.initial} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
    {rm && <Confirm danger title="Xóa hồ sơ học viên" yes="Xóa hồ sơ" text={<>Xóa <b>{rm.name}</b> ({rm.code})? Chỉ xóa được khi chưa có ghi danh nào.</>} onYes={remove} onNo={() => setRm(null)} />}
  </>);
}

/* ---------- chi tiết ---------- */
function Enroll({ ctx, student, onClose, onDone }: { ctx: Ctx; student: any; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { data: classes } = useAsync(() => get(`/classes?centerId=${student.center_id}`), [student.id]);
  const { data: courses } = useAsync(() => get(`/courses?centerId=${student.center_id}`), [student.id]);
  const [classId, setClassId] = useState(''); const [pct, setPct] = useState(0); const [paid, setPaid] = useState(0); const [method, setMethod] = useState('cash'); const [err, setErr] = useState('');
  const cl = classes?.find((c: any) => c.id === classId); const price = courses?.find((c: any) => c.id === cl?.course_id)?.price ?? 0;
  const gross = price; const net = Math.floor(gross - (gross * pct) / 100);
  async function save() {
    try { await post('/enrollments', { studentId: student.id, classId, paid, method, discounts: pct ? [{ code: 'GIAM', kind: 'percent', value: pct }] : [] }); toast('Đã ghi danh'); onDone(); } catch (e) { setErr((e as Error).message); }
  }
  const open = (classes ?? []).filter((c: any) => ['open', 'running'].includes(c.status) && c.students < c.capacity);
  return (
    <Modal title={`Ghi danh cho ${student.name}`} onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={!classId} onClick={save}>Ghi danh</button></>}>
      {err && <div className="err">{err}</div>}
      <Field label="Lớp" required><select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">— Chọn lớp —</option>{open.map((c: any) => <option key={c.id} value={c.id}>{c.code} · {c.course_name} · {c.students}/{c.capacity} HV</option>)}</select></Field>
      {cl && <><div className="grid2"><Field label="Ưu đãi (%)" hint="Quản lý duyệt nếu vượt 30%"><input className="input" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} /></Field>
        <Field label="Thu ngay (đ)"><input className="input" type="number" min={0} step={1000} value={paid} onChange={(e) => setPaid(Number(e.target.value))} /></Field></div>
        <Field label="Hình thức thu"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="card">Quẹt thẻ</option><option value="wallet">Ví điện tử</option></select></Field>
        <dl className="kv"><dt>Học phí niêm yết</dt><dd>{vnd(gross)}</dd><dt>Sau ưu đãi</dt><dd><b>{vnd(net)}</b></dd><dt>Còn phải thu</dt><dd>{vnd(Math.max(0, net - paid))}</dd></dl>
        <p className="muted">Vào lớp giữa chừng: học phí và số buổi được tính theo số buổi còn lại của lớp.</p></>}
    </Modal>
  );
}

function Receipt({ en, onClose, onDone }: { en: any; onClose: () => void; onDone: () => void }) {
  const toast = useToast(); const [amount, setAmount] = useState(en.money.receivable); const [method, setMethod] = useState('cash'); const [err, setErr] = useState('');
  async function save() { try { await post(`/enrollments/${en.id}/receipts`, { amount, method }); toast('Đã ghi nhận thu tiền'); onDone(); } catch (e) { setErr((e as Error).message); } }
  return <Modal title="Ghi nhận thu tiền" onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" onClick={save}>Thu tiền</button></>}>
    {err && <div className="err">{err}</div>}<p>{en.class_code} · còn phải thu <b>{vnd(en.money.receivable)}</b></p>
    <Field label="Số tiền (đ)" required><input className="input" type="number" min={1000} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} autoFocus /></Field>
    <Field label="Hình thức"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="card">Quẹt thẻ</option><option value="wallet">Ví điện tử</option></select></Field></Modal>;
}

function RefundReq({ en, onClose, onDone }: { en: any; onClose: () => void; onDone: () => void }) {
  const toast = useToast(); const [reason, setReason] = useState(''); const [cc, setCc] = useState(false); const [err, setErr] = useState('');
  async function save() { try { await post(`/enrollments/${en.id}/refund-request`, { reason, centerCancelled: cc }); toast('Đã gửi yêu cầu hoàn phí, chờ quản lý duyệt'); onDone(); } catch (e) { setErr((e as Error).message); } }
  return <Modal title="Yêu cầu hoàn phí" onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={!reason.trim()} onClick={save}>Gửi yêu cầu</button></>}>
    {err && <div className="err">{err}</div>}
    <p className="muted">Số tiền hoàn do hệ thống tính: buổi còn lại × đơn giá thực trả − phí xử lý 10% (không hoàn nếu đã học quá 50% khóa). Khi được duyệt, hệ thống đồng thời trừ buổi và ghi phiếu hoàn.</p>
    <Field label="Lý do" required><textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    <label><input type="checkbox" checked={cc} onChange={(e) => setCc(e.target.checked)} /> Do trung tâm hủy lớp (hoàn 100%, không phí)</label></Modal>;
}

function Adjust({ en, onClose, onDone }: { en: any; onClose: () => void; onDone: () => void }) {
  const toast = useToast(); const [sessions, setS] = useState(1); const [reason, setReason] = useState(''); const [kind, setKind] = useState('gift'); const [err, setErr] = useState('');
  async function save() { try { await post(`/enrollments/${en.id}/adjust`, { sessions, reason, kind }); toast('Đã ghi phát sinh buổi'); onDone(); } catch (e) { setErr((e as Error).message); } }
  return <Modal title="Điều chỉnh số buổi" onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={!reason.trim() || !sessions} onClick={save}>Ghi phát sinh</button></>}>
    {err && <div className="err">{err}</div>}<p className="muted">Số buổi không sửa trực tiếp: mọi thay đổi là một dòng phát sinh có lý do, người thực hiện và thời điểm.</p>
    <div className="grid2"><Field label="Loại"><select className="input" value={kind} onChange={(e) => setKind(e.target.value)}><option value="gift">Tặng buổi</option><option value="adjust">Điều chỉnh sai sót</option></select></Field>
      <Field label="Số buổi (+/−)"><input className="input" type="number" value={sessions} onChange={(e) => setS(Number(e.target.value))} /></Field></div>
    <Field label="Lý do" required><textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></Modal>;
}

const ENTRY: Record<string, string> = { purchase: 'Mua khóa', gift: 'Tặng buổi', attend: 'Có mặt', absent_unexcused: 'Vắng không phép', absent_excused: 'Vắng có phép', makeup_use: 'Học bù', makeup_expire: 'Quyền bù hết hạn', transfer_out: 'Chuyển ra', transfer_in: 'Chuyển vào', refund: 'Hoàn phí', adjust: 'Điều chỉnh', reversal: 'Phát sinh đảo' };

function Ledger({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useAsync(() => get(`/enrollments/${id}`), [id]);
  return <Modal wide title="Sổ phát sinh buổi & phiếu thu" onClose={onClose}>
    {!data ? <p className="muted">Đang tải…</p> : <>
      <dl className="kv"><dt>Học phí sau ưu đãi</dt><dd>{vnd(data.enrollment.net)}</dd><dt>Đã thu</dt><dd>{vnd(data.money.collected)}</dd><dt>Còn phải thu</dt><dd>{vnd(data.money.receivable)}</dd><dt>Doanh thu đã thực hiện</dt><dd>{vnd(data.money.recognized)}</dd><dt>Tiền nhận trước</dt><dd>{vnd(data.money.deferred)}</dd><dt>Buổi còn lại</dt><dd>{data.balance.sessions} + {data.balance.makeup} quyền bù</dd></dl>
      <h2 style={{ margin: '14px 0 6px' }}>Phát sinh buổi</h2>
      <Table rowKey={(e: any) => e.id} rows={[...data.entries].reverse()} cols={[
        { key: 'a', head: 'Thời gian', render: (e: any) => new Date(e.at).toLocaleString('vi-VN') }, { key: 't', head: 'Loại', render: (e: any) => ENTRY[e.type] ?? e.type },
        { key: 's', head: 'Buổi', right: true, render: (e: any) => (e.sessions > 0 ? '+' : '') + e.sessions + (e.makeup ? ` / bù ${e.makeup > 0 ? '+' : ''}${e.makeup}` : '') }, { key: 'r', head: 'Lý do', hideMobile: true, render: (e: any) => e.reason ?? '' }]} />
      <h2 style={{ margin: '14px 0 6px' }}>Phiếu thu</h2>
      <Table rowKey={(r: any) => r.id} empty="Chưa có phiếu thu" rows={[...data.receipts].reverse()} cols={[
        { key: 'a', head: 'Thời gian', render: (r: any) => new Date(r.at).toLocaleString('vi-VN') }, { key: 'm', head: 'Số tiền', right: true, render: (r: any) => <span className={r.amount < 0 ? 'bad' : ''}>{vnd(r.amount)}</span> },
        { key: 's', head: 'Trạng thái', render: (r: any) => r.voided ? <Chip kind="danger">Đã hủy: {r.voided.reason}</Chip> : r.adjustsId ? <Chip kind="warn">Điều chỉnh</Chip> : <Chip kind="ok">Hợp lệ</Chip> }]} />
    </>}
  </Modal>;
}

function Results({ id }: { id: string }) {
  const { data } = useAsync(() => get(`/students/${id}/results`), [id]);
  if (!data) return null;
  return <div className="card"><div className="card-head"><h2>Kết quả học tập</h2>{data.attendance.rate !== null && <Chip kind={data.attendance.rate >= 80 ? 'ok' : 'warn'}>Chuyên cần {data.attendance.rate}% ({data.attendance.present}/{data.attendance.total} buổi)</Chip>}</div>
    <Table rowKey={(r: any) => r.title + r.date + r.class_code} rows={data.results} empty="Chưa có điểm kiểm tra" cols={[{ key: 'd', head: 'Ngày', render: (r: any) => dmy(r.date) }, { key: 't', head: 'Bài', render: (r: any) => <>{r.title}<div className="muted">{r.class_code}</div></> },
      { key: 's', head: 'Điểm', right: true, render: (r: any) => r.score == null ? '—' : <b>{r.score}/{r.max_score}</b> }, { key: 'c', head: 'Nhận xét', hideMobile: true, render: (r: any) => r.comment ?? '' }]} /></div>;
}

function TransferClass({ en, centerId, onClose, onDone }: { en: any; centerId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast(); const [err, setErr] = useState(''); const [classId, setClassId] = useState('');
  const { data } = useAsync(() => get(`/classes?centerId=${centerId}`), [centerId]);
  const list = (data ?? []).filter((c: any) => c.code !== en.class_code && c.course_name === en.course_name && ['open', 'running'].includes(c.status) && c.students < c.capacity);
  async function save() { try { await post(`/enrollments/${en.id}/transfer-class`, { classId }); toast('Đã đổi lớp, số dư buổi và công nợ được giữ nguyên'); onDone(); } catch (e) { setErr((e as Error).message); } }
  return <Modal title="Đổi lớp trong cùng khóa" onClose={onClose} foot={<><button className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={!classId} onClick={save}>Đổi lớp</button></>}>
    {err && <div className="err">{err}</div>}<p className="muted">Hiện học lớp {en.class_code}. Số buổi còn lại và học phí giữ nguyên.</p>
    <Field label="Lớp mới" required><select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">— Chọn lớp —</option>{list.map((c: any) => <option key={c.id} value={c.id}>{c.code} · {c.students}/{c.capacity} HV</option>)}</select></Field>
    {list.length === 0 && <p className="muted">Không có lớp khác cùng khóa còn chỗ.</p>}</Modal>;
}

export function StudentDetail({ ctx, id }: { ctx: Ctx; id: string }) {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => get(`/students/${id}`), [id]);
  const [m, setM] = useState<null | { kind: string; en?: any }>(null); const [edit, setEdit] = useState(false);
  const can = ENROLL.includes(ctx.user.role); const mgr = ctx.user.role === 'admin' || ctx.user.role === 'manager';
  if (loading) return <p className="muted">Đang tải…</p>; if (error || !data) return <div className="err">{error}</div>;
  const s = data.student;
  async function status(en: any, to: string) { try { await post(`/enrollments/${en.id}/status`, { to }); toast('Đã cập nhật trạng thái'); reload(); } catch (e) { toast((e as Error).message, 'err'); } }
  const done = () => { setM(null); reload(); };
  return (<>
    <div className="page-head"><div><div className="crumb"><a style={{ cursor: 'pointer' }} onClick={() => ctx.go('students')}>Học viên</a> / {s.name}</div><h1>{s.name}</h1><div className="sub">{s.code} · {data.enrollments.length} lần ghi danh</div></div><div className="grow" />
      {WRITE.includes(ctx.user.role) && <button className="btn" onClick={() => setEdit(true)}>Sửa thông tin</button>}{can && <button className="btn primary" onClick={() => setM({ kind: 'enroll' })}>+ Ghi danh khóa mới</button>}</div>
    <div className="card"><dl className="kv"><dt>Phụ huynh</dt><dd>{s.guardian_name} · {s.guardian_phone}</dd><dt>Ngày sinh</dt><dd>{dmy(s.dob)}</dd><dt>Trường</dt><dd>{s.school ?? '—'}</dd><dt>Ghi chú</dt><dd>{s.note ?? '—'}</dd></dl></div>
    <h2 style={{ margin: '4px 0 8px' }}>Ghi danh & học phí</h2>
    {data.enrollments.length === 0 ? <div className="empty">Chưa ghi danh khóa nào.</div> : data.enrollments.map((e: any) => (
      <div className="card" key={e.id}>
        <div className="card-head"><h2>{e.course_name} · {e.class_code}</h2><Chip kind={STATUS[e.status]?.[1]}>{STATUS[e.status]?.[0]}</Chip></div>
        <div className="kpis" style={{ marginBottom: 10 }}>
          <div className="kpi" style={{ cursor: 'default' }}><div className="l">Buổi còn lại</div><div className={`v ${e.remaining <= 3 ? 'warn' : ''}`}>{e.remaining}<span className="muted" style={{ fontSize: 13 }}> /{e.bought}</span></div>{e.makeup > 0 && <div className="muted">gồm {e.makeup} quyền học bù</div>}</div>
          <div className="kpi" style={{ cursor: 'default' }}><div className="l">Đã thu / học phí</div><div className="v" style={{ fontSize: 18 }}>{vnd(e.money.collected)}</div><div className="muted">của {vnd(e.net)}</div></div>
          <div className="kpi" style={{ cursor: 'default' }}><div className="l">Còn phải thu</div><div className={`v ${e.money.receivable ? 'bad' : ''}`} style={{ fontSize: 18 }}>{e.money.receivable ? vnd(e.money.receivable) : 'Đã đủ'}</div></div></div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <button className="btn sm" onClick={() => setM({ kind: 'ledger', en: e })}>Sổ buổi & phiếu thu</button>
          {can && e.money.receivable > 0 && ['active', 'frozen'].includes(e.status) && <button className="btn sm primary" onClick={() => setM({ kind: 'receipt', en: e })}>Thu tiền</button>}
          {can && e.status === 'active' && <button className="btn sm" onClick={() => status(e, 'frozen')}>Bảo lưu</button>}
          {can && e.status === 'frozen' && <button className="btn sm" onClick={() => status(e, 'active')}>Học lại</button>}
          {mgr && ['active', 'frozen'].includes(e.status) && <button className="btn sm" onClick={() => setM({ kind: 'adjust', en: e })}>Điều chỉnh buổi</button>}
          {can && e.status === 'active' && <button className="btn sm" onClick={() => setM({ kind: 'transfer', en: e })}>Đổi lớp</button>}
          {can && ['active', 'frozen'].includes(e.status) && <button className="btn sm" onClick={() => setM({ kind: 'refund', en: e })}>Hoàn phí</button>}
        </div></div>))}
    {ctx.user.role !== 'frontdesk' && ctx.user.role !== 'accountant' && <Results id={id} />}
    {m?.kind === 'enroll' && <Enroll ctx={ctx} student={s} onClose={() => setM(null)} onDone={done} />}
    {m?.kind === 'receipt' && <Receipt en={m.en} onClose={() => setM(null)} onDone={done} />}
    {m?.kind === 'refund' && <RefundReq en={m.en} onClose={() => setM(null)} onDone={done} />}
    {m?.kind === 'adjust' && <Adjust en={m.en} onClose={() => setM(null)} onDone={done} />}
    {m?.kind === 'transfer' && <TransferClass en={m.en} centerId={s.center_id} onClose={() => setM(null)} onDone={done} />}
    {m?.kind === 'ledger' && <Ledger id={m.en.id} onClose={() => setM(null)} />}
    {edit && <StudentForm ctx={ctx} initial={s} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
  </>);
}
