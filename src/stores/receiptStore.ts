import { create } from 'zustand';
import { supabase } from '../db/supabaseClient';
import type { Receipt, ReceiptAllocation } from '../db/database';
import { useBillStore } from './billStore';

interface ReceiptState {
  receipts: any[];
  allocations: any[];
  isLoading: boolean;
  error: string | null;
  fetchReceipts: () => Promise<void>;
  fetchReceiptById: (id: number) => Promise<{ receipt: Receipt; allocations: any[] } | null>;
  createReceiptAndAllocate: (roomId: number, amount: number, method: 'cash'|'transfer', note: string, billsToPay: { billId: number, allocatedAmount: number }[]) => Promise<void>;
  deleteReceipt: (id: number) => Promise<void>;
}

export const useReceiptStore = create<ReceiptState>((set, get) => ({
  receipts: [],
  allocations: [],
  isLoading: false,
  error: null,

  fetchReceipts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*, room:rooms!inner(roomNumber)')
        .order('recordedAt', { ascending: false });

      if (error) throw error;
      set({ receipts: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchReceiptById: async (id: number) => {
    const { data: receipt, error: rError } = await supabase
      .from('receipts')
      .select('*, room:rooms!inner(roomNumber), tenant:tenants(fullName)')
      .eq('id', id)
      .single();

    if (rError || !receipt) return null;

    const { data: allocations } = await supabase
      .from('receiptAllocations')
      .select('*, bill:bills(*)')
      .eq('receiptId', id);

    return { receipt, allocations: allocations || [] };
  },

  createReceiptAndAllocate: async (roomId, amount, method, note, billsToPay) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Get active tenant for room
      const { data: contract } = await supabase
        .from('contracts')
        .select('tenantId')
        .eq('roomId', roomId)
        .eq('status', 'active')
        .maybeSingle();

      // 2. Create Receipt
      const { data: receipt, error: rError } = await supabase
        .from('receipts')
        .insert([{
          roomId,
          tenantId: contract ? contract.tenantId : null,
          amount,
          method,
          note
        }])
        .select()
        .single();
      
      if (rError) throw rError;

      // 3. Create Allocations (AND copy to old payments table for compatibility if you want to be safe, BUT the prompt requires full migration, so just Allocations)
      const allocData = billsToPay.map(b => ({
        receiptId: receipt.id,
        billId: b.billId,
        amount: b.allocatedAmount
      }));

      const { error: aError } = await supabase
        .from('receiptAllocations')
        .insert(allocData);
      
      if (aError) throw aError;

      // 4. Update bills status
      // We rely on billStore to recalculate the status if we fetch it, or we do it here.
      for (const b of billsToPay) {
        // Find current bill total paid by summing receiptAllocations
        const { data: currentAllocs } = await supabase
          .from('receiptAllocations')
          .select('amount')
          .eq('billId', b.billId);
        
        const totalPaid = currentAllocs?.reduce((sum, a) => sum + a.amount, 0) || 0;
        
        // Find bill total amount
        const { data: bill } = await supabase.from('bills').select('totalAmount, dueDate').eq('id', b.billId).single();
        if (bill) {
          const isOverdue = bill.dueDate && new Date() > new Date(bill.dueDate);
          const status = totalPaid >= bill.totalAmount ? 'paid' : isOverdue ? 'overdue' : 'unpaid';
          await supabase.from('bills').update({ status }).eq('id', b.billId);
        }
      }

      await get().fetchReceipts();
      useBillStore.getState().fetchBills();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteReceipt: async (id: number) => {
    // Delete receipt (cascade will delete allocations)
    // We should first fetch allocations to know which bills to update status!
    const { data: allocations } = await supabase
      .from('receiptAllocations')
      .select('billId')
      .eq('receiptId', id);
    
    await supabase.from('receipts').delete().eq('id', id);

    // Update bill statuses
    if (allocations) {
      const billIds = [...new Set(allocations.map(a => a.billId))];
      for (const billId of billIds) {
        const { data: currentAllocs } = await supabase
          .from('receiptAllocations')
          .select('amount')
          .eq('billId', billId);
        
        const totalPaid = currentAllocs?.reduce((sum, a) => sum + a.amount, 0) || 0;
        const { data: bill } = await supabase.from('bills').select('totalAmount, dueDate').eq('id', billId).single();
        if (bill) {
          const isOverdue = bill.dueDate && new Date() > new Date(bill.dueDate);
          const status = totalPaid >= bill.totalAmount ? 'paid' : isOverdue ? 'overdue' : 'unpaid';
          await supabase.from('bills').update({ status }).eq('id', billId);
        }
      }
    }
    
    await get().fetchReceipts();
    useBillStore.getState().fetchBills();
  }
}));
