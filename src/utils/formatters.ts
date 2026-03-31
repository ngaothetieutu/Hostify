import dayjs from 'dayjs';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).format('DD/MM/YYYY');
}

export function formatMonthYear(month: number, year: number): string {
  return `T${month}/${year}`;
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = dayjs();
  return { month: now.month() + 1, year: now.year() };
}

export const roomStatusLabel: Record<string, string> = {
  vacant: 'Trống',
  occupied: 'Đang thuê',
  maintenance: 'Đang sửa',
};

export const roomStatusColor: Record<string, string> = {
  vacant: '#EF4444',     // Red for vacant
  occupied: '#10B981',   // Green for occupied
  maintenance: '#F97316',
};

export const billStatusLabel: Record<string, string> = {
  unpaid: 'Chưa TT',
  paid: 'Đã TT',
  overdue: 'Quá hạn',
};

export const billStatusColor: Record<string, string> = {
  unpaid: '#F59E0B',
  paid: '#10B981',
  overdue: '#EF4444',
};

export const contractStatusLabel: Record<string, string> = {
  active: 'Đang hiệu lực',
  expired: 'Hết hạn',
  terminated: 'Đã chấm dứt',
};

export const contractStatusColor: Record<string, string> = {
  active: '#10B981',
  expired: '#F59E0B',
  terminated: '#EF4444',
};
