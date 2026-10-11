import type { Policy } from './policy.js';
import type { SessionEntryType } from './ledger.js';

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'unexcused' | 'makeup';

const HOUR = 3_600_000;

/** Vắng có phép chỉ khi báo trước đủ giờ quy định. */
export function classifyAbsence(sessionStart: string, reportedAt: string | null, p: Policy): 'excused' | 'unexcused' {
  if (!reportedAt) return 'unexcused';
  return Date.parse(sessionStart) - Date.parse(reportedAt) >= p.excusedNoticeHours * HOUR ? 'excused' : 'unexcused';
}

export function toEntryType(s: AttendanceStatus): Extract<SessionEntryType, 'attend' | 'absent_unexcused' | 'absent_excused' | 'makeup_use'> {
  return s === 'present' || s === 'late' ? 'attend' : s === 'excused' ? 'absent_excused' : s === 'unexcused' ? 'absent_unexcused' : 'makeup_use';
}

/** Khóa điểm danh sau N giờ kể từ giờ kết thúc buổi (QĐ-09). */
export function isLocked(sessionEnd: string, now: string, p: Policy): boolean {
  return Date.parse(now) - Date.parse(sessionEnd) > p.attendanceLockHours * HOUR;
}

/** Sửa điểm danh: trong hạn thì sửa được; quá hạn cần người duyệt + lý do; sau khóa sổ tháng thì chỉ điều chỉnh kỳ sau. */
export function canEdit(args: { sessionEnd: string; now: string; monthClosed: boolean; approvedBy?: string; reason?: string }, p: Policy): { ok: true } | { ok: false; why: string } {
  if (args.monthClosed) return { ok: false, why: 'Tháng đã khóa sổ: chỉ được lập điều chỉnh vào kỳ sau' };
  if (!isLocked(args.sessionEnd, args.now, p)) return { ok: true };
  if (args.approvedBy && args.reason) return { ok: true };
  return { ok: false, why: 'Đã quá hạn khóa điểm danh: cần quản lý trung tâm duyệt và ghi lý do' };
}

/** Tối đa quyền bù cấp theo tỉ lệ số buổi khóa. */
export function canGrantMakeup(totalSessions: number, grantedSoFar: number, p: Policy): boolean {
  return grantedSoFar < Math.floor(totalSessions * p.makeupMaxRatio);
}
