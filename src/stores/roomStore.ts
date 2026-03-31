import { create } from 'zustand';
import { supabase } from '../db/supabaseClient';
import type { Room } from '../db/database';

interface RoomState {
  rooms: Room[];
  loading: boolean;
  fetchRooms: (buildingId?: number) => Promise<void>;
  addRoom: (data: Omit<Room, 'id' | 'createdAt'>) => Promise<Room>;
  updateRoom: (id: number, data: Partial<Room>) => Promise<void>;
  deleteRoom: (id: number) => Promise<void>;
  updateRoomStatus: (id: number, status: Room['status']) => Promise<void>;
  getRoomById: (id: number) => Promise<Room | undefined>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  loading: false,

  fetchRooms: async (buildingId) => {
    set({ loading: true });
    try {
      let query = supabase.from('rooms').select('*').order('id', { ascending: true });
      if (buildingId) {
        query = query.eq('buildingId', buildingId);
      }
      const { data, error } = await query;
      if (error) throw error;
      set({ rooms: data || [], loading: false });
    } catch (error) {
      console.error('fetchRooms error:', error);
      set({ loading: false });
    }
  },

  addRoom: async (data) => {
    try {
      const { data: newRow, error } = await supabase
        .from('rooms')
        .insert([{ ...data }])
        .select()
        .single();
      if (error) throw error;
      await get().fetchRooms();
      return newRow;
    } catch (error) {
      console.error('addRoom error:', error);
      throw error;
    }
  },

  updateRoom: async (id, data) => {
    try {
      const { error } = await supabase.from('rooms').update(data).eq('id', id);
      if (error) throw error;
      await get().fetchRooms();
    } catch (error) {
      console.error('updateRoom error:', error);
    }
  },

  deleteRoom: async (id) => {
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
      await get().fetchRooms();
    } catch (error) {
      console.error('deleteRoom error:', error);
    }
  },

  updateRoomStatus: async (id, status) => {
    try {
      const { error } = await supabase.from('rooms').update({ status }).eq('id', id);
      if (error) throw error;
      await get().fetchRooms();
    } catch (error) {
      console.error('updateRoomStatus error:', error);
    }
  },

  getRoomById: async (id) => {
    const { data } = await supabase.from('rooms').select('*').eq('id', id).single();
    return data || undefined;
  },
}));
