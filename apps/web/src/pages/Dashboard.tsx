import { get, vnd } from '../api';
import { Chip, useAsync } from '../ui';
import type { Ctx } from '../App';

export function Dashboard({ ctx }: { ctx: Ctx }) {
  const { data: d, error, loading } = useAsync(() => get(`/dashboard?centerId=${ctx.centerId}`), [ctx.centerId]);
  if (loading) return <p className="muted">Đang tải…</p>;
  if (error || !d) return <div className="err">{error}</div>;
  const finance = ctx.user.role !== 'teacher' && ctx.user.role !== 'academic';
  return (<>
    <div className="page-head"><div><div className="crumb">Tổng quan</div><h1>Xin chào, {ctx.user.name}</h1></div></div>
    <div className="kpis">
      <button className="kpi" onClick={() => ctx.go('students')}><div className="l">Học viên đang học</div><div className="v">{d.activeStudents}</div></button>
      <button className="kpi" onClick={() => ctx.go('students')}><div className="l">Sắp hết buổi (≤ 3)</div><div className="v warn">{d.lowSessions}</div></button>
      {finance && <button className="kpi" onClick={() => ctx.go('debts')}><div className="l">Công nợ</div><div className="v bad">{vnd(d.debt)}</div><div className="muted">{d.debtors} học viên còn nợ</div></button>}
      {finance && <div className="kpi" style={{ cursor: 'default' }}><div className="l">Thu trong tháng</div><div className="v">{vnd(d.revenueMonth)}</div></div>}
      {finance && <button className="kpi" onClick={() => ctx.go('refunds')}><div className="l">Hoàn phí chờ duyệt</div><div className="v">{d.waitRefunds}</div></button>}
      <button className="kpi" onClick={() => ctx.go('classes')}><div className="l">Lớp thiếu sĩ số (&lt; 6)</div><div className="v warn">{d.underClasses}</div></button>
    </div>
    <div className="card"><div className="card-head"><h2>Lớp học hôm nay</h2><Chip>{d.todaySessions.length} buổi</Chip></div>
      {d.todaySessions.length === 0 ? <p className="muted">Hôm nay không có lớp.</p> : d.todaySessions.map((s: any) => (
        <div className="sess" key={s.id} onClick={() => ctx.go('schedule')}><span className="t">{s.start_time}</span><div className="grow"><b>{s.code}</b> · {s.room_name ?? '—'} · {s.teacher_name ?? 'Chưa có GV'}</div>
          {s.status === 'cancelled' ? <Chip kind="danger">Đã hủy</Chip> : s.marked ? <Chip kind="ok">Đã điểm danh</Chip> : <Chip kind="warn">Chưa điểm danh</Chip>}</div>))}
    </div>
  </>);
}
