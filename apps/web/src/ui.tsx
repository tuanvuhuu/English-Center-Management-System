import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/* Toast */
const ToastCtx = createContext<(msg: string, kind?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);
  useEffect(() => { if (!t) return; const id = setTimeout(() => setT(null), 3500); return () => clearTimeout(id); }, [t]);
  return <ToastCtx.Provider value={(msg, kind = 'ok') => setT({ msg, kind })}>{children}{t && <div className={`toast ${t.kind}`} role="status">{t.msg}</div>}</ToastCtx.Provider>;
}

export function Modal({ title, onClose, children, foot, wide }: { title: string; onClose: () => void; children: ReactNode; foot?: ReactNode; wide?: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" aria-label="Đóng" onClick={onClose}>✕</button></div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return <label className="field"><span>{label}{required && <b className="req"> *</b>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Confirm({ title, text, danger, onYes, onNo, yes = 'Đồng ý' }: { title: string; text: ReactNode; danger?: boolean; onYes: () => void; onNo: () => void; yes?: string }) {
  return <Modal title={title} onClose={onNo} foot={<><button className="btn" onClick={onNo}>Hủy</button><button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onYes}>{yes}</button></>}><p>{text}</p></Modal>;
}

export function Chip({ kind = 'muted', children }: { kind?: 'ok' | 'warn' | 'danger' | 'info' | 'muted'; children: ReactNode }) { return <span className={`chip ${kind}`}>{children}</span>; }

export interface Col<T> { key: string; head: string; render: (r: T) => ReactNode; right?: boolean; hideMobile?: boolean }
export function Table<T>({ cols, rows, onRow, empty = 'Không có dữ liệu', rowKey }: { cols: Col<T>[]; rows: T[]; onRow?: (r: T) => void; empty?: string; rowKey: (r: T) => string }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table className="cards">
        <thead><tr>{cols.map((c) => <th key={c.key} className={c.right ? 'r' : ''}>{c.head}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={rowKey(r)} className={onRow ? 'click' : ''} onClick={(e) => { if ((e.target as HTMLElement).closest('button,a,input,select')) return; onRow?.(r); }}>
            {cols.map((c) => <td key={c.key} data-label={c.head} className={`${c.right ? 'r' : ''} ${c.hideMobile ? 'hide-m' : ''}`}>{c.render(r)}</td>)}
          </tr>))}
        </tbody>
      </table>
    </div>
  );
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [n, setN] = useState(0);
  useEffect(() => { let on = true; setLoading(true); fn().then((d) => on && (setData(d), setError(null))).catch((e) => on && setError(e.message)).finally(() => on && setLoading(false)); return () => { on = false; }; /* eslint-disable-next-line */ }, [...deps, n]);
  return { data, loading, error, reload: () => setN((x) => x + 1) };
}
