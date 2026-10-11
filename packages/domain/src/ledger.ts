/** Sổ phát sinh buổi học. Số dư LUÔN được tính từ các dòng, không có hàm "set số dư" (bất biến #2, #3). */
export type SessionEntryType =
  | 'purchase' | 'gift' | 'attend' | 'absent_unexcused' | 'absent_excused' | 'makeup_use'
  | 'makeup_expire' | 'transfer_out' | 'transfer_in' | 'refund' | 'adjust' | 'reversal';

export interface SessionEntry {
  id: string;
  enrollmentId: string;
  type: SessionEntryType;
  sessions: number; // thay đổi quỹ buổi (+/-)
  makeup: number; // thay đổi quyền học bù (+/-)
  reason?: string;
  actor: string;
  at: string; // ISO
  reverses?: string; // id dòng bị đảo
  approvedBy?: string;
}

export interface Balance { sessions: number; makeup: number }

/** Quy tắc mặc định QĐ-02: buổi diễn ra đều trừ 1; vắng có phép +1 quyền bù. */
export const EFFECT: Record<'attend' | 'absent_unexcused' | 'absent_excused' | 'makeup_use' | 'makeup_expire', { sessions: number; makeup: number }> = {
  attend: { sessions: -1, makeup: 0 },
  absent_unexcused: { sessions: -1, makeup: 0 },
  absent_excused: { sessions: -1, makeup: +1 },
  makeup_use: { sessions: 0, makeup: -1 },
  makeup_expire: { sessions: 0, makeup: -1 },
};

export function balanceOf(entries: readonly SessionEntry[], enrollmentId: string): Balance {
  return entries.filter((e) => e.enrollmentId === enrollmentId).reduce<Balance>(
    (b, e) => ({ sessions: b.sessions + e.sessions, makeup: b.makeup + e.makeup }), { sessions: 0, makeup: 0 });
}

/** Số buổi phụ huynh thấy = buổi chưa diễn ra + quyền bù còn hiệu lực. */
export function visibleRemaining(b: Balance): number { return b.sessions + b.makeup; }

/** Thêm dòng vào sổ: trả về mảng MỚI, không sửa/xóa dòng cũ. */
export function append(entries: readonly SessionEntry[], e: SessionEntry, opts: { maxDebt?: number } = {}): SessionEntry[] {
  if (entries.some((x) => x.id === e.id)) throw new Error('Trùng id phát sinh');
  if ((e.type === 'adjust' || e.type === 'reversal' || e.type === 'gift') && !e.reason) throw new Error('Phát sinh này bắt buộc có lý do');
  if ((e.type === 'gift' || e.type === 'adjust' || e.type === 'refund' || e.type.startsWith('transfer')) && !e.approvedBy) throw new Error('Phát sinh này cần người duyệt');
  const next = [...entries, e];
  const bal = balanceOf(next, e.enrollmentId);
  const maxDebt = opts.maxDebt ?? 0;
  if (bal.sessions < -maxDebt) throw new Error(`Vượt mức học nợ tối đa ${maxDebt} buổi`);
  if (bal.makeup < 0) throw new Error('Quyền học bù không thể âm');
  return next;
}

/** Sai thì tạo phát sinh đảo, không xóa. */
export function reverse(entries: readonly SessionEntry[], targetId: string, by: { id: string; actor: string; at: string; reason: string; approvedBy: string }): SessionEntry[] {
  const t = entries.find((x) => x.id === targetId);
  if (!t) throw new Error('Không tìm thấy phát sinh cần đảo');
  if (entries.some((x) => x.reverses === targetId)) throw new Error('Phát sinh đã bị đảo');
  if (t.type === 'reversal') throw new Error('Không đảo một phát sinh đảo');
  return append(entries, { id: by.id, enrollmentId: t.enrollmentId, type: 'reversal', sessions: -t.sessions, makeup: -t.makeup, reason: by.reason, actor: by.actor, at: by.at, reverses: t.id, approvedBy: by.approvedBy }, { maxDebt: Number.MAX_SAFE_INTEGER });
}
