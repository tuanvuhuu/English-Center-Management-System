export interface User { id: string; username: string; name: string; role: Role; centerId: string | null }
export type Role = 'admin' | 'manager' | 'academic' | 'teacher' | 'accountant' | 'frontdesk';

let token: string | null = (() => { try { return localStorage.getItem('ecms-token'); } catch { return null; } })();
export const setToken = (t: string | null) => { token = t; try { t ? localStorage.setItem('ecms-token', t) : localStorage.removeItem('ecms-token'); } catch { /* bỏ qua */ } };
export const hasToken = () => !!token;

export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch('/api' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) { if (r.status === 401) { setToken(null); window.dispatchEvent(new Event('ecms-logout')); } throw new ApiError(r.status, data?.error ?? 'Có lỗi xảy ra'); }
  return data as T;
}
export const get = <T = any>(p: string) => api<T>('GET', p);
export const post = <T = any>(p: string, b?: unknown) => api<T>('POST', p, b ?? {});
export const put = <T = any>(p: string, b?: unknown) => api<T>('PUT', p, b ?? {});
export const del = <T = any>(p: string) => api<T>('DELETE', p);

export const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
export const dmy = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
export const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const ROLE_LABEL: Record<Role, string> = { admin: 'Quản trị tổ chức', manager: 'Quản lý trung tâm', academic: 'Học vụ', teacher: 'Giáo viên', accountant: 'Kế toán', frontdesk: 'Lễ tân / Tuyển sinh' };
