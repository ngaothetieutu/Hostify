import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppServiceType {
  id: string;
  label: string;
  unit: 'room' | 'person';
  defaultPrice: number;
  icon: string;
  unitLabel: string;
}

export const DEFAULT_SERVICE_TYPES: AppServiceType[] = [
  { id: 'washing',  label: 'Máy giặt',  icon: '🫧', defaultPrice: 100000, unit: 'person', unitLabel: '/người/tháng' },
  { id: 'elevator', label: 'Thang máy', icon: '🛗', defaultPrice: 50000,  unit: 'person', unitLabel: '/người/tháng' },
  { id: 'cleaning', label: 'Vệ sinh',   icon: '🧹', defaultPrice: 30000,  unit: 'room',   unitLabel: '/phòng/tháng' },
  { id: 'wifi',     label: 'Wifi',       icon: '📶', defaultPrice: 100000, unit: 'room',   unitLabel: '/phòng/tháng' },
];

interface SettingsState {
  serviceTypes: AppServiceType[];
  addServiceType: (service: AppServiceType) => void;
  updateServiceType: (id: string, service: Partial<AppServiceType>) => void;
  deleteServiceType: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serviceTypes: DEFAULT_SERVICE_TYPES,
      
      addServiceType: (service) => set((state) => ({ 
        serviceTypes: [...state.serviceTypes, service] 
      })),
      
      updateServiceType: (id, updatedFields) => set((state) => ({
        serviceTypes: state.serviceTypes.map(s => s.id === id ? { ...s, ...updatedFields } : s)
      })),

      deleteServiceType: (id) => set((state) => ({
        serviceTypes: state.serviceTypes.filter(s => s.id !== id)
      })),
    }),
    {
      name: 'qlphongtro-settings',
    }
  )
);
