import { useEffect, useState } from 'react';
import { get, post, setToken, hasToken, ROLE_LABEL, type User, type Role } from './api';
import { Field, useToast } from './ui';
import { Dashboard } from './pages/Dashboard';
import { Students, StudentDetail } from './pages/Students';
import { Classes, ClassDetail } from './pages/Classes';
import { Schedule } from './pages/Schedule';
import { Debts, Refunds, Reports, AuditLog } from './pages/Finance';
import { Leads } from './pages/Leads';
import { Teachers, Timesheet } from './pages/Teachers';

export interface Ctx { user: User; centerId: string; centers: { id: string; name: string }[]; go: (p: string) => void }

const NAV: { g: string; items: { id: string; label: string; roles: Role[] | '*' }[] }[] = [
  { g: 'Tổng quan', items: [{ id: 'dashboard', label: 'Bảng điều khiển', roles: '*' }] },
  { g: 'Học viên', items: [{ id: 'students', label: 'Học viên', roles: '*' }] },
  { g: 'Tuyển sinh', items: [{ id: 'leads', label: 'Lead & tư vấn', roles: ['admin', 'manager', 'frontdesk'] }] },
  { g: 'Lớp & lịch', items: [
    { id: 'classes', label: 'Danh sách lớp', roles: ['admin', 'manager', 'academic', 'frontdesk'] },
    { id: 'schedule', label: 'Lịch học & điểm danh', roles: '*' }] },
  { g: 'Giáo viên', items: [
    { id: 'teachers', label: 'Giáo viên', roles: ['admin', 'manager', 'academic', 'accountant'] },
    { id: 'timesheet', label: 'Bảng công', roles: ['admin', 'manager', 'accountant', 'teacher'] }] },
  { g: 'Học phí', items: [
    { id: 'debts', label: 'Công nợ', roles: ['admin', 'manager', 'accountant', 'frontdesk'] },
    { id: 'refunds', label: 'Hoàn phí', roles: ['admin', 'manager', 'accountant'] }] },
  { g: 'Báo cáo', items: [
    { id: 'reports', label: 'Báo cáo 4 cơ sở', roles: ['admin'] },
    { id: 'audit', label: 'Nhật ký thay đổi', roles: ['admin', 'manager'] }] },
];

const useHash = () => {
  const [h, setH] = useState(location.hash.slice(2) || 'dashboard');
  useEffect(() => { const f = () => setH(location.hash.slice(2) || 'dashboard'); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return [h, (p: string) => { location.hash = '/' + p; }] as const;
};

function Login({ onDone }: { onDone: (u: User) => void }) {
  const [username, setU] = useState(''); const [password, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await post('/auth/login', { username, password }); setToken(r.token); onDone(r.user); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="login"><form className="card" onSubmit={submit}>
      <div className="logo" style={{ marginBottom: 14 }}><i>A</i>Quản lý trung tâm tiếng Anh</div>
      {err && <div className="err">{err}</div>}
      <Field label="Tên đăng nhập"><input className="input" value={username} onChange={(e) => setU(e.target.value)} autoFocus autoComplete="username" /></Field>
      <Field label="Mật khẩu"><input className="input" type="password" value={password} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></Field>
      <button className="btn primary" style={{ width: '100%', height: 38 }} disabled={busy || !username || !password}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      <p className="muted" style={{ fontSize: 12 }}>Dùng thử: <code>admin</code> / <code>admin123</code>; hoặc <code>manager.cg</code>, <code>frontdesk.cg</code>, <code>accountant.cg</code>, <code>teacher.cg</code> / <code>123456</code></p>
    </form></div>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(null); const [ready, setReady] = useState(!hasToken());
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]); const [centerId, setCenterId] = useState('');
  const [route, go] = useHash(); const [open, setOpen] = useState(false); const toast = useToast();

  useEffect(() => { if (hasToken()) get('/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true)); }, []);
  useEffect(() => { const f = () => setUser(null); window.addEventListener('ecms-logout', f); return () => window.removeEventListener('ecms-logout', f); }, []);
  useEffect(() => { if (user) get('/centers').then((c) => { setCenters(c); setCenterId(user.role === 'admin' ? '' : user.centerId ?? ''); }).catch((e) => toast(e.message, 'err')); }, [user]);
  useEffect(() => setOpen(false), [route]);

  if (!ready) return null;
  if (!user) return <Login onDone={setUser} />;
  const ctx: Ctx = { user, centerId, centers, go };
  const [page, arg] = route.split('/');
  const allowed = NAV.flatMap((g) => g.items).filter((i) => i.roles === '*' || i.roles.includes(user.role)).map((i) => i.id);
  const p = page && (allowed.includes(page)) ? page : 'dashboard';

  return (
    <div className={`app ${open ? 'nav-open' : ''}`}>
      <header className="topbar">
        <button className="icon-btn menu-btn" aria-label="Mở menu" onClick={() => setOpen(!open)}>☰</button>
        <div className="logo"><i>A</i><span className="hide-sm">Quản lý trung tâm</span></div>
        <div className="grow" />
        {user.role === 'admin' ? (
          <select className="input" style={{ width: 'auto', maxWidth: 190 }} aria-label="Cơ sở" value={centerId} onChange={(e) => setCenterId(e.target.value)}>
            <option value="">Tất cả cơ sở</option>{centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>) : <span className="chip">{centers[0]?.name ?? ''}</span>}
        <span className="hide-sm muted">{user.name} · {ROLE_LABEL[user.role]}</span>
        <button className="btn sm" onClick={() => { setToken(null); setUser(null); }}>Đăng xuất</button>
      </header>
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
      <nav className="sidebar nav" aria-label="Điều hướng chính">
        {NAV.map((g) => { const items = g.items.filter((i) => i.roles === '*' || i.roles.includes(user.role)); return items.length ? (
          <div key={g.g}><div className="nav-g">{g.g}</div>{items.map((i) => <a key={i.id} className={p === i.id ? 'on' : ''} onClick={() => go(i.id)}>{i.label}</a>)}</div>) : null; })}
      </nav>
      <main className="main" key={centerId + p + (arg ?? '')}>
        {p === 'dashboard' && <Dashboard ctx={ctx} />}
        {p === 'students' && (arg ? <StudentDetail ctx={ctx} id={arg} /> : <Students ctx={ctx} />)}
        {p === 'classes' && (arg ? <ClassDetail ctx={ctx} id={arg} /> : <Classes ctx={ctx} />)}
        {p === 'schedule' && <Schedule ctx={ctx} />}
        {p === 'leads' && <Leads ctx={ctx} />}
        {p === 'teachers' && <Teachers ctx={ctx} />}
        {p === 'timesheet' && <Timesheet ctx={ctx} />}
        {p === 'debts' && <Debts ctx={ctx} />}
        {p === 'refunds' && <Refunds ctx={ctx} />}
        {p === 'reports' && <Reports ctx={ctx} />}
        {p === 'audit' && <AuditLog ctx={ctx} />}
      </main>
    </div>
  );
}
