export type EnrollmentStatus = 'registered' | 'waiting_class' | 'active' | 'completed' | 'frozen' | 'transferred' | 'dropped';

const NEXT: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  registered: ['waiting_class'],
  waiting_class: ['active'],
  active: ['completed', 'frozen', 'transferred', 'dropped'],
  frozen: ['active', 'dropped'],
  completed: [], transferred: [], dropped: [],
};

export const isTerminal = (s: EnrollmentStatus) => NEXT[s].length === 0;
export const canMove = (from: EnrollmentStatus, to: EnrollmentStatus) => NEXT[from].includes(to);

export function move(from: EnrollmentStatus, to: EnrollmentStatus): EnrollmentStatus {
  if (!canMove(from, to)) throw new Error(`Không thể chuyển trạng thái ghi danh ${from} → ${to}`);
  return to;
}

/** Cảnh báo trùng: cùng học viên, cùng khóa, cùng trung tâm, còn hiệu lực. */
export function isDuplicate(existing: { studentId: string; courseId: string; centerId: string; status: EnrollmentStatus }[], x: { studentId: string; courseId: string; centerId: string }): boolean {
  return existing.some((e) => e.studentId === x.studentId && e.courseId === x.courseId && e.centerId === x.centerId && !isTerminal(e.status));
}
