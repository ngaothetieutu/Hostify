// ─── Default Rates ───
export const DEFAULT_ELECTRICITY_RATE = 3500; // VNĐ/kWh
export const DEFAULT_WATER_RATE = 30000;      // VNĐ/m³

// ─── Service Types ───
// unit: 'person' = tính theo số người, 'room' = tính theo phòng
export interface ServiceType {
  id: string;
  label: string;
  icon: string;
  defaultPrice: number;
  unit: 'person' | 'room';
  unitLabel: string;
}
// ─── Bill Item Types ───
export const BILL_ITEM_TYPES = [
  { value: 'rent', label: 'Tiền phòng' },
  { value: 'electricity', label: 'Tiền điện' },
  { value: 'water', label: 'Tiền nước' },
  { value: 'washing', label: 'Máy giặt' },
  { value: 'elevator', label: 'Thang máy' },
  { value: 'cleaning', label: 'Vệ sinh' },
  { value: 'wifi', label: 'Wifi' },
  { value: 'parking', label: 'Đỗ xe' },
  { value: 'other', label: 'Khác' },
] as const;

// ─── Room Statuses ───
export const ROOM_STATUSES = [
  { value: 'vacant', label: 'Trống' },
  { value: 'occupied', label: 'Đang thuê' },
  { value: 'maintenance', label: 'Đang sửa' },
] as const;

// ─── Payment Methods ───
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản' },
] as const;

// ─── App Info ───
export const APP_VERSION = '2.0.0';
export const APP_NAME = 'Hostify - Quản lý Lưu trú';

// ─── Navigation ───
export const NAV_ITEMS = [
  { path: '/', label: 'Tổng quan', icon: 'Dashboard' },
  { path: '/rooms', label: 'Phòng', icon: 'MeetingRoom' },
  { path: '/tenants', label: 'Khách thuê', icon: 'People' },
  { path: '/bills', label: 'Hóa đơn', icon: 'Receipt' },
  { path: '/meters', label: 'Điện nước', icon: 'Speed' },
  { path: '/settings', label: 'Cài đặt', icon: 'Settings' },
] as const;

// ─── Drawer Width ───
export const DRAWER_WIDTH = 260;
