/** Tiền VND là số nguyên đồng. Không dùng số thực để cộng trừ. */
export type VND = number;

export function assertVND(n: number): VND {
  if (!Number.isInteger(n)) throw new Error(`Số tiền phải là số nguyên đồng: ${n}`);
  return n;
}

/** Học phí sau ưu đãi: áp tuần tự, làm tròn xuống đồng; kiểm tra trần cộng dồn (QĐ-07). */
export interface Discount { code: string; kind: 'percent' | 'amount'; value: number; scholarship?: boolean }

export function applyDiscounts(gross: VND, discounts: Discount[], maxCount: number, maxRate: number): { net: VND; total: VND; needsApproval: boolean } {
  const regular = discounts.filter((d) => !d.scholarship);
  const needsApproval = regular.length > maxCount;
  let total = 0;
  for (const d of discounts) total += d.kind === 'percent' ? Math.floor((gross * d.value) / 100) : d.value;
  const capped = Math.min(total, gross);
  const overRate = capped > Math.floor(gross * maxRate) && regular.length === discounts.length;
  return { net: gross - capped, total: capped, needsApproval: needsApproval || overRate };
}

/** Đơn giá thực trả mỗi buổi = học phí sau ưu đãi ÷ số buổi mua (bất biến #5). Trả về phân số (tử/mẫu) để không mất độ chính xác. */
export function unitPrice(net: VND, sessionsBought: number): { num: VND; den: number } {
  if (sessionsBought <= 0) throw new Error('Số buổi mua phải > 0');
  return { num: net, den: sessionsBought };
}

/** Giá trị của n buổi theo đơn giá thực trả, làm tròn xuống đồng (một nơi duy nhất làm tròn). */
export function valueOfSessions(net: VND, sessionsBought: number, n: number): VND {
  return Math.floor((net * n) / sessionsBought);
}
