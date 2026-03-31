import { create } from 'zustand';
import { supabase } from '../db/supabaseClient';
import type { MeterReading } from '../db/database';

interface MeterState {
  readings: MeterReading[];
  loading: boolean;
  fetchReadings: (filter?: { roomId?: number; year?: number; month?: number }) => Promise<void>;
  getReading: (roomId: number, year: number, month: number) => Promise<MeterReading | undefined>;
  getPreviousReading: (roomId: number, year: number, month: number) => Promise<MeterReading | undefined>;
  saveReading: (data: Omit<MeterReading, 'id' | 'recordedAt'>) => Promise<MeterReading>;
}

export const useMeterStore = create<MeterState>((set, get) => ({
  readings: [],
  loading: false,

  fetchReadings: async (filter) => {
    set({ loading: true });
    try {
      let query = supabase.from('meterReadings').select('*');
      if (filter?.roomId) query = query.eq('roomId', filter.roomId);
      if (filter?.year) query = query.eq('year', filter.year);
      if (filter?.month) query = query.eq('month', filter.month);
      const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false });
      if (error) throw error;
      set({ readings: data || [], loading: false });
    } catch (error) {
      console.error('fetchReadings error:', error);
      set({ loading: false });
    }
  },

  getReading: async (roomId, year, month) => {
    const { data } = await supabase.from('meterReadings')
      .select('*').eq('roomId', roomId).eq('year', year).eq('month', month).maybeSingle();
    return data || undefined;
  },

  getPreviousReading: async (roomId, currentYear, currentMonth) => {
    const { data } = await supabase.from('meterReadings').select('*')
      .eq('roomId', roomId)
      .or(`year.lt.${currentYear},and(year.eq.${currentYear},month.lt.${currentMonth})`)
      .order('year', { ascending: false }).order('month', { ascending: false })
      .limit(1).maybeSingle();
    return data || undefined;
  },

  saveReading: async (data) => {
    const existing = await get().getReading(data.roomId, data.year, data.month);
    if (existing) {
      const { data: updated, error } = await supabase.from('meterReadings').update({
        electricityOld: data.electricityOld, electricityNew: data.electricityNew,
        waterOld: data.waterOld, waterNew: data.waterNew, photoPath: data.photoPath,
      }).eq('id', existing.id!).select().single();
      if (error) throw error;
      await get().fetchReadings();
      return updated;
    } else {
      const { data: newRow, error } = await supabase.from('meterReadings')
        .insert([{ ...data }]).select().single();
      if (error) throw error;
      await get().fetchReadings();
      return newRow;
    }
  },
}));
