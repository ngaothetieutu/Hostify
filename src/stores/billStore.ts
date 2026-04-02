import { create } from 'zustand';
import { supabase } from '../db/supabaseClient';
import type { Bill, BillItem, Payment } from '../db/database';
import dayjs from 'dayjs';

interface BillState {
  bills: Bill[];
  billItems: BillItem[];
  allocations: any[]; // To track allocations if needed
  loading: boolean;
  fetchBills: (filter?: { roomId?: number; year?: number; month?: number; status?: string }) => Promise<void>;
  getBillById: (id: number) => Promise<{ bill: Bill; items: BillItem[]; allocations: any[] } | undefined>;
  createBill: (data: {
    roomId: number; contractId?: number; year: number; month: number;
    items: Omit<BillItem, 'id' | 'billId'>[]; dueDate?: string;
  }) => Promise<Bill>;
  updateBill: (id: number, data: {
    year: number; month: number; items: Omit<BillItem, 'id' | 'billId'>[]; dueDate?: string;
  }) => Promise<Bill>;
  deleteBill: (id: number) => Promise<void>;
  addPayment: (data: Omit<Payment, 'id' | 'paidAt'>) => Promise<Payment>;
  deletePayment: (paymentId: number, billId: number) => Promise<void>;
}

export const useBillStore = create<BillState>((set, get) => ({
  bills: [],
  billItems: [],
  allocations: [],
  loading: false,

  fetchBills: async (filter) => {
    set({ loading: true });
    try {
      let query = supabase.from('bills').select('*');
      if (filter?.roomId) query = query.eq('roomId', filter.roomId);
      if (filter?.year) query = query.eq('year', filter.year);
      if (filter?.month) query = query.eq('month', filter.month);
      if (filter?.status) query = query.eq('status', filter.status);
      const { data: bills, error } = await query.order('id', { ascending: false });
      if (error) throw error;

      const billIds = (bills || []).map((b) => b.id);
      let items: BillItem[] = [];
      if (billIds.length > 0) {
        const { data } = await supabase.from('billItems').select('*').in('billId', billIds);
        items = data || [];
      }
      set({ bills: bills || [], billItems: items, loading: false });
    } catch (error) {
      console.error('fetchBills error:', error);
      set({ loading: false });
    }
  },

  getBillById: async (id) => {
    const { data: bill } = await supabase.from('bills').select('*').eq('id', id).single();
    if (!bill) return undefined;
    const { data: items } = await supabase.from('billItems').select('*').eq('billId', id);
    const { data: allocations } = await supabase.from('receiptAllocations').select('*, receipt:receipts(*)').eq('billId', id).order('id', { ascending: false });
    return { bill, items: items || [], allocations: allocations || [] };
  },

  createBill: async (data) => {
    const { data: existing } = await supabase.from('bills')
      .select('id').eq('roomId', data.roomId).eq('year', data.year).eq('month', data.month).maybeSingle();
    if (existing) throw new Error(`Phòng này đã có hóa đơn T${data.month}/${data.year}`);

    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
    const { data: newBill, error } = await supabase.from('bills').insert([{
      roomId: data.roomId, contractId: data.contractId, year: data.year, month: data.month,
      totalAmount, status: 'unpaid', dueDate: data.dueDate,
    }]).select().single();
    if (error) throw error;

    if (data.items.length > 0) {
      const { error: itemError } = await supabase.from('billItems').insert(
        data.items.map((item) => ({ ...item, billId: newBill.id }))
      );
      if (itemError) throw itemError;
    }

    await get().fetchBills();
    return newBill;
  },

  updateBill: async (id, data) => {
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
    const { data: updatedBill, error } = await supabase.from('bills').update({
      year: data.year,
      month: data.month,
      dueDate: data.dueDate,
      totalAmount,
    }).eq('id', id).select().single();
    if (error) throw error;

    await supabase.from('billItems').delete().eq('billId', id);
    if (data.items.length > 0) {
      await supabase.from('billItems').insert(
        data.items.map((item) => ({ ...item, billId: id }))
      );
    }

    const result = await get().getBillById(id);
    if (result) {
      const totalPaid = result.allocations.reduce((sum, p) => sum + p.amount, 0);
      const isOverdue = result.bill.dueDate && dayjs().isAfter(dayjs(result.bill.dueDate));
      const status = totalPaid >= totalAmount ? 'paid' : isOverdue ? 'overdue' : 'unpaid';
      await supabase.from('bills').update({ status }).eq('id', id);
    }

    await get().fetchBills();
    return updatedBill;
  },

  deleteBill: async (id) => {
    const { count } = await supabase.from('receiptAllocations').select('*', { count: 'exact', head: true }).eq('billId', id);
    if ((count || 0) > 0) throw new Error('Hóa đơn đã có dữ liệu phân bổ từ phiếu thu, vui lòng xóa phân bổ/phiếu thu trước.');
    await supabase.from('billItems').delete().eq('billId', id);
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) throw error;
    await get().fetchBills();
  },

  // Backward compatibility wrapper (will be deprecated, rely on receiptStore instead)
  addPayment: async () => {
    // Legacy support: We use useReceiptStore instead in the components, but we throw error here to force update
    throw new Error('Please use receiptStore.createReceiptAndAllocate instead');
  },

  deletePayment: async () => {
    throw new Error('Please use receiptStore.deleteReceipt instead');
  },
}));
