import { create } from 'zustand';
import { supabase } from '../db/supabaseClient';
import type { Tenant, Contract, ContractService } from '../db/database';

interface TenantState {
  tenants: Tenant[];
  contracts: Contract[];
  loading: boolean;

  fetchTenants: () => Promise<void>;
  addTenant: (data: Omit<Tenant, 'id' | 'createdAt'>) => Promise<Tenant>;
  updateTenant: (id: number, data: Partial<Tenant>) => Promise<void>;
  deleteTenant: (id: number) => Promise<void>;
  getTenantById: (id: number) => Promise<Tenant | undefined>;

  fetchContracts: (filter?: { roomId?: number; tenantId?: number; status?: string }) => Promise<void>;
  createContract: (data: {
    roomId: number; tenantId: number; coTenantIds?: number[];
    startDate: string; endDate?: string; monthlyRent: number; deposit: number;
    numberOfTenants: number; services: ContractService[];
  }) => Promise<Contract>;
  updateContract: (id: number, data: {
    tenantId: number; coTenantIds?: number[]; startDate: string; endDate?: string;
    monthlyRent: number; deposit: number; numberOfTenants: number; services: ContractService[];
  }) => Promise<void>;
  terminateContract: (contractId: number) => Promise<void>;
  getActiveContractForRoom: (roomId: number) => Promise<Contract | undefined>;
  getContractsByRoom: (roomId: number) => Promise<Contract[]>;
  getContractById: (id: number) => Promise<Contract | undefined>;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenants: [],
  contracts: [],
  loading: false,

  // ─── Tenants ───

  fetchTenants: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.from('tenants').select('*').order('id', { ascending: true });
      if (error) throw error;
      set({ tenants: data || [], loading: false });
    } catch (error) {
      console.error('fetchTenants error:', error);
      set({ loading: false });
    }
  },

  addTenant: async (data) => {
    const { data: newRow, error } = await supabase
      .from('tenants')
      .insert([{ ...data, status: data.status || 'active' }])
      .select().single();
    if (error) throw error;
    await get().fetchTenants();
    return newRow;
  },

  updateTenant: async (id, data) => {
    const { error } = await supabase.from('tenants').update(data).eq('id', id);
    if (error) throw error;
    await get().fetchTenants();
  },

  deleteTenant: async (id) => {
    const { count } = await supabase.from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', id).eq('status', 'active');
    if ((count || 0) > 0) throw new Error('Không thể xóa khách đang có hợp đồng hiệu lực');
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) throw error;
    await get().fetchTenants();
  },

  getTenantById: async (id) => {
    const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
    return data || undefined;
  },

  // ─── Contracts ───

  getContractById: async (id) => {
    const { data } = await supabase.from('contracts').select('*').eq('id', id).single();
    return data || undefined;
  },

  fetchContracts: async (filter) => {
    set({ loading: true });
    try {
      let query = supabase.from('contracts').select('*');
      if (filter?.roomId) query = query.eq('roomId', filter.roomId);
      if (filter?.tenantId) query = query.eq('tenantId', filter.tenantId);
      if (filter?.status) query = query.eq('status', filter.status);
      const { data, error } = await query.order('id', { ascending: false });
      if (error) throw error;
      set({ contracts: data || [], loading: false });
    } catch (error) {
      console.error('fetchContracts error:', error);
      set({ loading: false });
    }
  },

  createContract: async (data) => {
    const { count } = await supabase.from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('roomId', data.roomId).eq('status', 'active');
    if ((count || 0) > 0) throw new Error('Phòng này đã có hợp đồng đang hiệu lực');

    const { data: newRow, error } = await supabase.from('contracts').insert([{
      roomId: data.roomId, tenantId: data.tenantId, coTenantIds: data.coTenantIds || [],
      startDate: data.startDate, endDate: data.endDate, monthlyRent: data.monthlyRent,
      deposit: data.deposit, numberOfTenants: data.numberOfTenants,
      servicesJson: JSON.stringify(data.services), status: 'active',
    }]).select().single();
    if (error) throw error;

    await supabase.from('rooms').update({ status: 'occupied' }).eq('id', data.roomId);
    await get().fetchContracts();
    return newRow;
  },

  updateContract: async (id, data) => {
    const { error } = await supabase.from('contracts').update({
      tenantId: data.tenantId, coTenantIds: data.coTenantIds || [],
      startDate: data.startDate, endDate: data.endDate, monthlyRent: data.monthlyRent,
      deposit: data.deposit, numberOfTenants: data.numberOfTenants,
      servicesJson: JSON.stringify(data.services),
    }).eq('id', id);
    if (error) throw error;
    await get().fetchContracts();
  },

  terminateContract: async (contractId) => {
    const { data: contract } = await supabase.from('contracts').select('*').eq('id', contractId).single();
    if (!contract) return;
    await supabase.from('contracts').update({ status: 'terminated' }).eq('id', contractId);
    const { count } = await supabase.from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('roomId', contract.roomId).eq('status', 'active').neq('id', contractId);
    if ((count || 0) === 0) {
      await supabase.from('rooms').update({ status: 'vacant' }).eq('id', contract.roomId);
    }
    await get().fetchContracts();
  },

  getActiveContractForRoom: async (roomId) => {
    const { data } = await supabase.from('contracts')
      .select('*').eq('roomId', roomId).eq('status', 'active').maybeSingle();
    return data || undefined;
  },

  getContractsByRoom: async (roomId) => {
    const { data } = await supabase.from('contracts').select('*').eq('roomId', roomId).order('id', { ascending: false });
    return data || [];
  },
}));



