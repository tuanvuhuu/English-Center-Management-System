import { useState } from 'react';
import { get, post, vnd, dmy } from '../api';
import { Modal, Field, Chip, Table, useAsync, useToast } from '../ui';
import type { Ctx } from '../App';

export function Debts({ ctx }: { ctx: Ctx }) {
  const toast = useToast(); const { data, loading, error, reload } = useAsync(() => get(`/debts?centerId=${ctx.centerId}`), [ctx.centerId]);
  const [pay, setPay] = useState<any>(null); const [amount, setAmount] = useState(0); const [method, setMethod] = useState('cash'); const [err, setErr] = useState('');
  const total = (data ?? []).reduce((s: number, r: any) => s + r.receivable, 0); const canPay = ctx.user.role !== 'teacher';
  async function save() { try { await post(`/enrollments/${pay.enrollment_id}/receipts`, { amount, method }); toast('Đã ghi nhận thu tiền'); setPay(null); reload(); } catch (e) { setErr((e as Error).message); } }
  return (<>
    <div className="page-head"><div><div className="crumb">Học phí</div><h1>Công nợ</h1><div className="sub">{data ? `${data.length} khoản · tổng ${vnd(total)}` : ''}</div></div></div>
    {error && <div className="err">{error}</div>}{loading && !data && <p className="muted">Đang tải…</p>}
    {data && <Table rowKey={(r: any) => r.enrollment_id} rows={data} empty="Không có khoản nợ nào" onRow={(r: any) => ctx.go('students/' + r.student_id)} cols={[
      { key: 'n', head: 'Học viên', render: (r: any) => <><b>{r.name}</b><div className="muted">{r.code} · {r.class_code}</div></> }, { key: 'p', head: 'Điện thoại', hideMobile: true, render: (r: any) => r.guardian_phone },
      { key: 'd', head: 'Ghi danh', hideMobile: true, render: (r: any) => dmy(r.created_at) }, { key: 'c', head: 'Đã thu', right: true, render: (r: any) => `${vnd(r.collected)} / ${vnd(r.net)}` },
      { key: 'r', head: 'Còn nợ', right: true, render: (r: any) => <b className="bad">{vnd(r.receivable)}</b> },
      { key: 'a', head: '', right: true, render: (r: any) => canPay ? <button className="btn sm primary" onClick={() => { setPay(r); setAmount(r.receivable); setErr(''); }}>Thu tiền</button> : null }]} />}
    {pay && <Modal title={`Thu tiền · ${pay.name}`} onClose={() => setPay(null)} foot={<><button className="btn" onClick={() => setPay(null)}>Hủy</button><button className="btn primary" onClick={save}>Thu tiền</button></>}>
      {err && <div className="err">{err}</div>}<p>Còn nợ <b>{vnd(pay.receivable)}</b></p>
      <Field label="Số tiền (đ)"><input className="input" type="number" step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} autoFocus /></Field>
      <Field label="Hình thức"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="card">Quẹt thẻ</option><option value="wallet">Ví điện tử</option></select></Field></Modal>}
  </>);
}

const RS: Record<string, [string, 'warn' | 'ok' | 'danger']> = { wait: ['Chờ duyệt', 'warn'], approved: ['Đã duyệt', 'ok'], rejected: ['Từ chối', 'danger'] };
export function Refunds({ ctx }: { ctx: Ctx }) {
  const toast = useToast(); const { data, loading, error, reload } = useAsync(() => get(`/refunds?centerId=${ctx.centerId}`), [ctx.centerId]);
  const can = ctx.user.role === 'admin' || ctx.user.role === 'manager';
  async function decide(r: any, approve: boolean) { try { await post(`/refunds/${r.id}/decide`, { approve }); toast(approve ? 'Đã duyệt: hệ thống đã trừ buổi và ghi phiếu hoàn' : 'Đã từ chối'); reload(); } catch (e) { toast((e as Error).message, 'err'); } }
  return (<>
    <div className="page-head"><div><div className="crumb">Học phí</div><h1>Yêu cầu hoàn phí</h1></div></div>
    {error && <div className="err">{error}</div>}{loading && !data && <p className="muted">Đang tải…</p>}
    {data && <Table rowKey={(r: any) => r.id} rows={data} empty="Chưa có yêu cầu hoàn phí" cols={[
      { key: 'n', head: 'Học viên', render: (r: any) => <><b>{r.student_name}</b><div className="muted">{r.student_code} · {r.class_code}</div></> }, { key: 'r', head: 'Lý do', hideMobile: true, render: (r: any) => r.reason },
      { key: 'b', head: 'Buổi hoàn', right: true, render: (r: any) => r.sessions }, { key: 'm', head: 'Số tiền hoàn', right: true, render: (r: any) => <><b>{vnd(r.amount)}</b><div className="muted">phí xử lý {vnd(r.fee)}</div></> },
      { key: 's', head: 'Trạng thái', render: (r: any) => <><Chip kind={RS[r.status]?.[1]}>{RS[r.status]?.[0]}</Chip>{r.needs_admin ? <div className="muted">Cần admin duyệt</div> : null}</> },
      { key: 'a', head: '', right: true, render: (r: any) => r.status === 'wait' && can ? <><button className="btn sm primary" onClick={() => decide(r, true)}>Duyệt</button> <button className="btn sm" onClick={() => decide(r, false)}>Từ chối</button></> : null }]} />}
  </>);
}

export function Reports({ ctx: _ctx }: { ctx: Ctx }) {
  const { data, loading, error } = useAsync(() => get('/reports/centers'), []);
  return (<>
    <div className="page-head"><div><div className="crumb">Báo cáo</div><h1>Báo cáo hợp nhất 4 cơ sở</h1></div></div>
    {error && <div className="err">{error}</div>}{loading && <p className="muted">Đang tải…</p>}
    {data && <><Table rowKey={(r: any) => r.id} rows={data} cols={[{ key: 'n', head: 'Cơ sở', render: (r: any) => <b>{r.name}</b> }, { key: 's', head: 'Học viên đang học', right: true, render: (r: any) => r.students }, { key: 'c', head: 'Lớp đang chạy', right: true, render: (r: any) => r.classes },
      { key: 'm', head: 'Đã thu', right: true, render: (r: any) => vnd(r.collected) }, { key: 'o', head: 'Còn phải thu', right: true, render: (r: any) => <span className="bad">{vnd(r.outstanding)}</span> }]} />
      <p className="muted" style={{ marginTop: 10 }}>Tổng đã thu: <b>{vnd(data.reduce((s: number, r: any) => s + r.collected, 0))}</b> · Tổng còn phải thu: <b>{vnd(data.reduce((s: number, r: any) => s + r.outstanding, 0))}</b></p></>}
  </>);
}

export function AuditLog({ ctx: _ctx }: { ctx: Ctx }) {
  const { data, loading, error } = useAsync(() => get('/audit?limit=200'), []);
  return (<>
    <div className="page-head"><div><div className="crumb">Báo cáo</div><h1>Nhật ký thay đổi</h1><div className="sub">Không ai sửa hoặc xóa được nhật ký</div></div></div>
    {error && <div className="err">{error}</div>}{loading && <p className="muted">Đang tải…</p>}
    {data && <Table rowKey={(r: any) => String(r.id)} rows={data} cols={[{ key: 't', head: 'Thời gian', render: (r: any) => new Date(r.at).toLocaleString('vi-VN') }, { key: 'u', head: 'Người thực hiện', render: (r: any) => r.actor }, { key: 'a', head: 'Hành động', render: (r: any) => <Chip kind="info">{r.action}</Chip> }, { key: 'e', head: 'Đối tượng', render: (r: any) => r.entity }, { key: 'd', head: 'Chi tiết', hideMobile: true, render: (r: any) => <span className="muted" style={{ fontSize: 11 }}>{(r.detail ?? '').slice(0, 90)}</span> }]} />}
  </>);
}
