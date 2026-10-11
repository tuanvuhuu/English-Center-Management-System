import type { Policy } from './policy.js';
import { valueOfSessions, type VND } from './money.js';

export interface RefundInput {
  net: VND; // học phí sau ưu đãi của ghi danh
  sessionsBought: number;
  sessionsRemaining: number;
  discountClawback: VND; // ưu đãi bị thu hồi
  materialsReceived: VND; // giáo trình đã nhận
  centerCancelled: boolean; // trung tâm hủy lớp
}

export interface RefundResult { amount: VND; fee: VND; gross: VND; blockedReason?: string; needsAdmin: boolean }

/** QĐ-04: buổi còn lại × đơn giá thực trả − ưu đãi thu hồi − phí xử lý − giáo trình. Trung tâm hủy lớp: hoàn 100% không phí. */
export function calcRefund(i: RefundInput, p: Policy): RefundResult {
  const gross = valueOfSessions(i.net, i.sessionsBought, i.sessionsRemaining);
  if (i.centerCancelled) return { amount: gross, fee: 0, gross, needsAdmin: gross > p.adminApproveRefundOver };
  const progress = (i.sessionsBought - i.sessionsRemaining) / i.sessionsBought;
  if (progress > p.refundMaxProgress) return { amount: 0, fee: 0, gross, blockedReason: 'Đã học quá mức cho phép hoàn phí', needsAdmin: false };
  const fee = Math.floor(gross * p.refundFeeRate);
  const amount = Math.max(0, gross - i.discountClawback - fee - i.materialsReceived);
  return { amount, fee, gross, needsAdmin: amount > p.adminApproveRefundOver };
}

/** Người tạo ≠ người duyệt ≠ người chi (tách nhiệm vụ). */
export function segregationOk(creator: string, approver: string, payer: string): boolean {
  return creator !== approver && approver !== payer && creator !== payer;
}
