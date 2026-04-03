import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Divider, Button, TextField, MenuItem, useTheme, Alert } from '@mui/material';
import { supabase } from '../db/supabaseClient';
import { useReceiptStore } from '../stores/receiptStore';
import { formatCurrency } from '../utils/formatters';
import { NumericFormatCustom } from '../components/common';

interface DebtRow {
  roomId: number;
  roomNumber: string;
  tenantName: string;
  unpaidBills: any[];
  totalDebt: number;
}

export default function Debts() {
  const theme = useTheme();
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { createReceiptAndAllocate } = useReceiptStore();

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'transfer'>('transfer');
  const [paymentNote, setPaymentNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    setLoading(true);
    // 1. Get all unpaid/overdue bills
    const { data: bills } = await supabase
      .from('bills')
      .select('*, room:rooms(roomNumber), contract:contracts(tenant:tenants(fullName))')
      .in('status', ['unpaid', 'overdue'])
      .order('year', { ascending: true }) // Oldest first
      .order('month', { ascending: true });

    if (!bills) {
      setDebts([]);
      setLoading(false);
      return;
    }

    // 2. Map bills to rooms and calculate total remaining
    const roomMap = new Map<number, DebtRow>();

    for (const b of bills) {
      // Find payments
      const { data: allocs } = await supabase.from('receiptAllocations').select('amount').eq('billId', b.id);
      const paid = allocs?.reduce((s, a) => s + a.amount, 0) || 0;
      const remaining = b.totalAmount - paid;

      if (remaining > 0) {
        if (!roomMap.has(b.roomId)) {
          roomMap.set(b.roomId, {
            roomId: b.roomId,
            roomNumber: b.room?.roomNumber || 'Unknown',
            tenantName: b.contract?.tenant?.fullName || 'Trống',
            unpaidBills: [],
            totalDebt: 0
          });
        }
        const r = roomMap.get(b.roomId)!;
        r.unpaidBills.push({ ...b, remaining });
        r.totalDebt += remaining;
      }
    }

    setDebts(Array.from(roomMap.values()));
    setLoading(false);
  };

  const handlePay = async () => {
    if (!selectedRoomId || !paymentAmount) return;
    const roomDebt = debts.find(d => d.roomId === selectedRoomId);
    if (!roomDebt) return;

    let totalToAllocate = Number(paymentAmount);
    if (totalToAllocate <= 0) return;

    setProcessing(true);

    const billsToPay: { billId: number, allocatedAmount: number }[] = [];
    
    // Allocate to oldest bills first (already sorted by year/month)
    for (const b of roomDebt.unpaidBills) {
      if (totalToAllocate <= 0) break;
      const amountForThisBill = Math.min(b.remaining, totalToAllocate);
      billsToPay.push({ billId: b.id, allocatedAmount: amountForThisBill });
      totalToAllocate -= amountForThisBill;
    }

    try {
      await createReceiptAndAllocate(
        selectedRoomId, 
        Number(paymentAmount), 
        paymentMethod, 
        paymentNote || `Thanh toán công nợ`, 
        billsToPay
      );
      setPaymentAmount('');
      setPaymentNote('');
      setSelectedRoomId(null);
      await loadDebts();
    } catch (err: any) {
      alert("Lỗi tạo phiếu thu: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const totalSystemDebt = debts.reduce((s, d) => s + d.totalDebt, 0);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Theo dõi Công Nợ</Typography>
      </Box>

      {/* System total */}
      <Card sx={{ mb: 4, bgcolor: theme.palette.error.main, color: 'white', borderRadius: 4 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" sx={{ opacity: 0.9, mb: 1 }}>Tổng công nợ toàn hệ thống</Typography>
          <Typography variant="h3" fontWeight={900}>{formatCurrency(totalSystemDebt)}</Typography>
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Phân bổ Thu Tiền (Gạch Nợ)</Typography>
      <Card sx={{ mb: 4, p: 2 }}>
        <CardContent>
          <TextField
            select
            fullWidth
            label="Chọn phòng thanh toán"
            value={selectedRoomId || ''}
            onChange={(e) => setSelectedRoomId(Number(e.target.value))}
            sx={{ mb: 2 }}
          >
            {debts.map(d => (
              <MenuItem key={d.roomId} value={d.roomId}>
                Phòng {d.roomNumber} - {d.tenantName} (Nợ: {formatCurrency(d.totalDebt)})
              </MenuItem>
            ))}
          </TextField>

          {selectedRoomId && (
            <>
              <TextField
                fullWidth
                label="Số tiền thực thu"
                name="amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                InputProps={{
                  inputComponent: NumericFormatCustom as any,
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                select
                fullWidth
                label="Hình thức"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                sx={{ mb: 2 }}
              >
                <MenuItem value="transfer">Chuyển khoản</MenuItem>
                <MenuItem value="cash">Tiền mặt</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Ghi chú"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Alert severity="info" sx={{ mb: 3 }}>
                Hệ thống sẽ tự động trừ lùi số tiền này vào các hóa đơn cũ nhất của phòng.
              </Alert>

              <Button 
                variant="contained" 
                fullWidth 
                size="large"
                disabled={!paymentAmount || processing}
                onClick={handlePay}
              >
                {processing ? 'Đang xử lý...' : 'TẠO PHIẾU THU & GẠCH NỢ'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Chi tiết nợ từng phòng</Typography>
      {debts.length === 0 && !loading ? (
        <Typography color="text.secondary">Hiện không có phòng nào nợ</Typography>
      ) : (
        debts.map(d => (
          <Card key={d.roomId} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">Phòng {d.roomNumber} - {d.tenantName}</Typography>
                <Typography variant="subtitle1" color="error" fontWeight="bold">{formatCurrency(d.totalDebt)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              {d.unpaidBills.map(b => (
                <Box key={b.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Hóa đơn T{b.month}/{b.year}</Typography>
                  <Typography variant="body2">{formatCurrency(b.remaining)}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}
