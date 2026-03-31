import { create } from 'zustand';
import { supabase } from '../db/supabaseClient';
import type { Building } from '../db/database';

interface BuildingState {
  buildings: Building[];
  loading: boolean;
  fetchBuildings: () => Promise<void>;
  addBuilding: (data: Omit<Building, 'id' | 'createdAt'>) => Promise<Building>;
  updateBuilding: (id: number, data: Partial<Building>) => Promise<void>;
  deleteBuilding: (id: number) => Promise<void>;
}

export const useBuildingStore = create<BuildingState>((set, get) => ({
  buildings: [],
  loading: false,

  fetchBuildings: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      set({ buildings: data || [], loading: false });
    } catch (error) {
      console.error('fetchBuildings error:', error);
      set({ loading: false });
    }
  },

  addBuilding: async (data) => {
    try {
      const { data: newRow, error } = await supabase
        .from('buildings')
        .insert([{ ...data }])
        .select()
        .single();
      if (error) throw error;
      await get().fetchBuildings();
      return newRow;
    } catch (error) {
      console.error('addBuilding error:', error);
      throw error;
    }
  },

  updateBuilding: async (id, data) => {
    try {
      const { error } = await supabase.from('buildings').update(data).eq('id', id);
      if (error) throw error;
      await get().fetchBuildings();
    } catch (error) {
      console.error('updateBuilding error:', error);
    }
  },

  deleteBuilding: async (id) => {
    try {
      // Vì trên SQL đã cài đặt CASCADING Delete (khi xóa tòa nhà sẽ tự động xóa tất cả phòng và khách)
      // Nên ta chỉ cần xóa tòa nhà là đủ.
      const { error } = await supabase.from('buildings').delete().eq('id', id);
      if (error) throw error;
      await get().fetchBuildings();
    } catch (error) {
      console.error('deleteBuilding error:', error);
    }
  },
}));
