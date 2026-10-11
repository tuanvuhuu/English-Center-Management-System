import type { VND } from './money.js';

/** Sổ tiền: phiếu thu không xóa; hủy trong ngày có lý do, sau ngày lập phiếu điều chỉnh. */
export interface Receipt { id: string; enrollmentId: string; amount: VND; at: string; voided?: { reason: string; at: string }; adjustsId?: string }

export interface Money4 { receivable: VND; collected: VND; recognized: VND; deferred: VND }

/** Tách 4 con số (bất biến #7). recognized = phần doanh thu theo buổi đã trừ. */
export function money4(args: { net: VND; receipts: Receipt[]; sessionsBought: number; sessionsConsumed: number }): Money4 {
  const collected = args.receipts.filter((r) => !r.voided).reduce((s, r) => s + r.amount, 0);
  const recognized = Math.min(collected, Math.floor((args.net * args.sessionsConsumed) / args.sessionsBought));
  return { receivable: Math.max(0, args.net - collected), collected, recognized, deferred: collected - recognized };
}

export function voidReceipt(r: Receipt, now: string, reason: string): Receipt {
  if (!reason) throw new Error('Hủy phiếu bắt buộc có lý do');
  if (r.voided) throw new Error('Phiếu đã hủy');
  if (r.at.slice(0, 10) !== now.slice(0, 10)) throw new Error('Sau ngày thu: lập phiếu điều chỉnh, không hủy trực tiếp');
  return { ...r, voided: { reason, at: now } };
}

export function adjustmentReceipt(r: Receipt, id: string, delta: VND, at: string, reason: string): Receipt {
  if (!reason) throw new Error('Điều chỉnh bắt buộc có lý do');
  return { id, enrollmentId: r.enrollmentId, amount: delta, at, adjustsId: r.id };
}
