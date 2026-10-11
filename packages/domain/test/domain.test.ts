import { describe, it, expect } from 'vitest';
import * as D from '../src/index.js';
const P = D.DEFAULT_POLICY;
const mk = (o: Partial<D.SessionEntry> & { id: string; type: D.SessionEntryType }): D.SessionEntry =>
  ({ enrollmentId: 'e1', sessions: 0, makeup: 0, actor: 'u', at: '2026-10-01T10:00:00Z', ...o });

describe('Sổ phát sinh buổi', () => {
  it('số dư là tổng phát sinh; vắng có phép trừ 1 và cộng 1 quyền bù', () => {
    let l: D.SessionEntry[] = [];
    l = D.append(l, mk({ id: '1', type: 'purchase', sessions: 36 }));
    l = D.append(l, mk({ id: '2', type: 'attend', ...D.EFFECT.attend }));
    l = D.append(l, mk({ id: '3', type: 'absent_excused', ...D.EFFECT.absent_excused }));
    expect(D.balanceOf(l, 'e1')).toEqual({ sessions: 34, makeup: 1 });
    expect(D.visibleRemaining(D.balanceOf(l, 'e1'))).toBe(35);
  });
  it('học bù chỉ trừ quyền bù, không trừ quỹ buổi', () => {
    let l = D.append([], mk({ id: '1', type: 'purchase', sessions: 10 }));
    l = D.append(l, mk({ id: '2', type: 'absent_excused', ...D.EFFECT.absent_excused }));
    l = D.append(l, mk({ id: '3', type: 'makeup_use', ...D.EFFECT.makeup_use }));
    expect(D.balanceOf(l, 'e1')).toEqual({ sessions: 9, makeup: 0 });
  });
  it('không được dùng quyền bù khi không có', () => {
    const l = D.append([], mk({ id: '1', type: 'purchase', sessions: 10 }));
    expect(() => D.append(l, mk({ id: '2', type: 'makeup_use', ...D.EFFECT.makeup_use }))).toThrow(/bù/);
  });
  it('học nợ tối đa 2 buổi', () => {
    let l = D.append([], mk({ id: '1', type: 'purchase', sessions: 1 }));
    l = D.append(l, mk({ id: '2', type: 'attend', sessions: -1 }), { maxDebt: P.maxSessionDebt });
    l = D.append(l, mk({ id: '3', type: 'attend', sessions: -1 }), { maxDebt: P.maxSessionDebt });
    l = D.append(l, mk({ id: '4', type: 'attend', sessions: -1 }), { maxDebt: P.maxSessionDebt });
    expect(() => D.append(l, mk({ id: '5', type: 'attend', sessions: -1 }), { maxDebt: P.maxSessionDebt })).toThrow(/học nợ/);
  });
  it('điều chỉnh/tặng bắt buộc lý do và người duyệt', () => {
    expect(() => D.append([], mk({ id: '1', type: 'adjust', sessions: 1 }))).toThrow(/lý do/);
    expect(() => D.append([], mk({ id: '1', type: 'adjust', sessions: 1, reason: 'sai' }))).toThrow(/duyệt/);
  });
  it('sai thì tạo phát sinh đảo; không đảo hai lần, không sửa dòng cũ', () => {
    let l = D.append([], mk({ id: '1', type: 'purchase', sessions: 10 }));
    l = D.append(l, mk({ id: '2', type: 'attend', sessions: -1 }));
    const before = JSON.stringify(l);
    const l2 = D.reverse(l, '2', { id: '3', actor: 'qltt', at: '2026-10-02T00:00:00Z', reason: 'điểm danh nhầm', approvedBy: 'qltt' });
    expect(D.balanceOf(l2, 'e1').sessions).toBe(10);
    expect(JSON.stringify(l)).toBe(before);
    expect(l2).toHaveLength(3);
    expect(() => D.reverse(l2, '2', { id: '4', actor: 'a', at: 'x', reason: 'r', approvedBy: 'b' })).toThrow(/đã bị đảo/);
  });
  it('không trùng id phát sinh', () => {
    const l = D.append([], mk({ id: '1', type: 'purchase', sessions: 1 }));
    expect(() => D.append(l, mk({ id: '1', type: 'purchase', sessions: 1 }))).toThrow(/Trùng/);
  });
});

describe('Vòng đời ghi danh', () => {
  it('đi đúng luồng và chặn chuyển sai', () => {
    expect(D.move('registered', 'waiting_class')).toBe('waiting_class');
    expect(D.move('active', 'frozen')).toBe('frozen');
    expect(D.move('frozen', 'active')).toBe('active');
    expect(() => D.move('completed', 'active')).toThrow();
    expect(() => D.move('registered', 'active')).toThrow();
  });
  it('cảnh báo trùng ghi danh còn hiệu lực', () => {
    const ex = [{ studentId: 's', courseId: 'c', centerId: 't', status: 'active' as const }];
    expect(D.isDuplicate(ex, { studentId: 's', courseId: 'c', centerId: 't' })).toBe(true);
    expect(D.isDuplicate([{ ...ex[0]!, status: 'completed' }], { studentId: 's', courseId: 'c', centerId: 't' })).toBe(false);
  });
});

describe('Điểm danh', () => {
  it('vắng có phép chỉ khi báo trước ≥ 24h', () => {
    const start = '2026-10-10T12:00:00Z';
    expect(D.classifyAbsence(start, '2026-10-09T11:00:00Z', P)).toBe('excused');
    expect(D.classifyAbsence(start, '2026-10-09T13:00:00Z', P)).toBe('unexcused');
    expect(D.classifyAbsence(start, null, P)).toBe('unexcused');
  });
  it('khóa sau 48h; sửa sau đó cần duyệt + lý do; khóa sổ tháng thì chặn hẳn', () => {
    const end = '2026-10-10T12:00:00Z';
    expect(D.canEdit({ sessionEnd: end, now: '2026-10-12T11:00:00Z', monthClosed: false }, P).ok).toBe(true);
    expect(D.canEdit({ sessionEnd: end, now: '2026-10-12T13:00:00Z', monthClosed: false }, P).ok).toBe(false);
    expect(D.canEdit({ sessionEnd: end, now: '2026-10-12T13:00:00Z', monthClosed: false, approvedBy: 'q', reason: 'mất mạng' }, P).ok).toBe(true);
    expect(D.canEdit({ sessionEnd: end, now: '2026-12-01T00:00:00Z', monthClosed: true, approvedBy: 'q', reason: 'x' }, P).ok).toBe(false);
  });
  it('giới hạn quyền bù 20% số buổi khóa', () => {
    expect(D.canGrantMakeup(36, 6, P)).toBe(true);
    expect(D.canGrantMakeup(36, 7, P)).toBe(false);
  });
});

describe('Học phí & hoàn phí', () => {
  it('ưu đãi: tối đa 2 ưu đãi và 30%, vượt thì cần duyệt', () => {
    expect(D.applyDiscounts(10_000_000, [{ code: 'a', kind: 'percent', value: 10 }], 2, 0.3)).toMatchObject({ net: 9_000_000, needsApproval: false });
    expect(D.applyDiscounts(10_000_000, [{ code: 'a', kind: 'percent', value: 20 }, { code: 'b', kind: 'percent', value: 15 }], 2, 0.3).needsApproval).toBe(true);
    expect(D.applyDiscounts(10_000_000, [{ code: 'a', kind: 'amount', value: 1 }, { code: 'b', kind: 'amount', value: 1 }, { code: 'c', kind: 'amount', value: 1 }], 2, 0.3).needsApproval).toBe(true);
  });
  it('hoàn phí theo công thức QĐ-04', () => {
    // 9.000.000 / 36 buổi = 250.000/buổi; còn 24 buổi => 6.000.000; phí 10% = 600.000
    const r = D.calcRefund({ net: 9_000_000, sessionsBought: 36, sessionsRemaining: 24, discountClawback: 500_000, materialsReceived: 200_000, centerCancelled: false }, P);
    expect(r).toMatchObject({ gross: 6_000_000, fee: 600_000, amount: 4_700_000, needsAdmin: false });
  });
  it('không hoàn khi đã học quá 50%', () => {
    const r = D.calcRefund({ net: 9_000_000, sessionsBought: 36, sessionsRemaining: 10, discountClawback: 0, materialsReceived: 0, centerCancelled: false }, P);
    expect(r.amount).toBe(0); expect(r.blockedReason).toBeTruthy();
  });
  it('trung tâm hủy lớp: hoàn 100% không phí, kể cả khi đã học quá nửa', () => {
    const r = D.calcRefund({ net: 9_000_000, sessionsBought: 36, sessionsRemaining: 10, discountClawback: 500_000, materialsReceived: 200_000, centerCancelled: true }, P);
    expect(r).toMatchObject({ amount: 2_500_000, fee: 0 });
  });
  it('hoàn trên 5 triệu cần admin tổ chức duyệt; tách nhiệm vụ 3 người', () => {
    const r = D.calcRefund({ net: 20_000_000, sessionsBought: 40, sessionsRemaining: 40, discountClawback: 0, materialsReceived: 0, centerCancelled: false }, P);
    expect(r.needsAdmin).toBe(true);
    expect(D.segregationOk('a', 'b', 'c')).toBe(true);
    expect(D.segregationOk('a', 'a', 'c')).toBe(false);
  });
  it('chính sách đổi giữa chừng không áp ngược cho ghi danh đã ký', () => {
    const v2 = { ...P, version: 2, effectiveFrom: '2026-09-01', refundFeeRate: 0.2 };
    expect(D.policyAt([P, v2], '2026-08-15').refundFeeRate).toBe(0.1);
    expect(D.policyAt([P, v2], '2026-09-02').refundFeeRate).toBe(0.2);
  });
  it('tiền là số nguyên đồng', () => { expect(() => D.assertVND(1.5)).toThrow(); });
});

describe('Tiền: 4 con số & phiếu thu', () => {
  const r1: D.Receipt = { id: 'r1', enrollmentId: 'e1', amount: 6_000_000, at: '2026-10-01T09:00:00Z' };
  it('tách phải thu / đã thu / doanh thu thực hiện / tiền nhận trước', () => {
    expect(D.money4({ net: 9_000_000, receipts: [r1], sessionsBought: 36, sessionsConsumed: 12 }))
      .toEqual({ receivable: 3_000_000, collected: 6_000_000, recognized: 3_000_000, deferred: 3_000_000 });
  });
  it('hủy phiếu chỉ trong ngày và phải có lý do; sau ngày phải lập phiếu điều chỉnh', () => {
    expect(() => D.voidReceipt(r1, '2026-10-01T15:00:00Z', '')).toThrow(/lý do/);
    expect(D.voidReceipt(r1, '2026-10-01T15:00:00Z', 'nhập nhầm').voided).toBeTruthy();
    expect(() => D.voidReceipt(r1, '2026-10-02T09:00:00Z', 'x')).toThrow(/điều chỉnh/);
    const adj = D.adjustmentReceipt(r1, 'r2', -6_000_000, '2026-10-02T09:00:00Z', 'thu nhầm');
    expect(D.money4({ net: 9_000_000, receipts: [r1, adj], sessionsBought: 36, sessionsConsumed: 0 }).collected).toBe(0);
  });
});
