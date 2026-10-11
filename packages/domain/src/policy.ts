/** Chính sách theo trung tâm. Mọi con số nghiệp vụ nằm ở đây, KHÔNG hard-code (bất biến #10).
 *  Giá trị mặc định = đề xuất trong sổ quyết định, chưa chốt. */
export interface Policy {
  version: number;
  effectiveFrom: string; // YYYY-MM-DD
  excusedNoticeHours: number; // QĐ-02
  makeupValidDays: number; // QĐ-02
  makeupMaxRatio: number; // QĐ-02: tối đa % số buổi khóa
  attendanceLockHours: number; // QĐ-09
  freezeMaxMonths: number; // QĐ-03
  freezeMaxTimes: number; // QĐ-03
  refundFeeRate: number; // QĐ-04
  refundMaxProgress: number; // QĐ-04: không hoàn nếu đã học quá tỉ lệ này
  maxDiscountCount: number; // QĐ-07
  maxDiscountRate: number; // QĐ-07
  maxSessionDebt: number; // học nợ tối đa
  adminApproveRefundOver: number; // QĐ-19 (VND)
  adminApproveDiscountOver: number; // QĐ-19
}

export const DEFAULT_POLICY: Policy = {
  version: 1,
  effectiveFrom: '2026-06-01',
  excusedNoticeHours: 24,
  makeupValidDays: 30,
  makeupMaxRatio: 0.2,
  attendanceLockHours: 48,
  freezeMaxMonths: 3,
  freezeMaxTimes: 1,
  refundFeeRate: 0.1,
  refundMaxProgress: 0.5,
  maxDiscountCount: 2,
  maxDiscountRate: 0.3,
  maxSessionDebt: 2,
  adminApproveRefundOver: 5_000_000,
  adminApproveDiscountOver: 0.2,
};

/** Chọn phiên bản chính sách có hiệu lực tại ngày ký (không áp ngược – bất biến #6). */
export function policyAt(versions: Policy[], date: string): Policy {
  const ok = versions.filter((p) => p.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const p = ok[0];
  if (!p) throw new Error(`Không có chính sách hiệu lực tại ${date}`);
  return p;
}
