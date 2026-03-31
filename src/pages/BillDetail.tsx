import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Grid,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import PaymentIcon from '@mui/icons-material/Payment';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import html2canvas from 'html2canvas';
import { StatusBadge, ConfirmDialog, EmptyState, NumericFormatCustom } from '../components/common';
import { useBillStore } from '../stores/billStore';
import { useRoomStore } from '../stores/roomStore';
import { formatCurrency, formatDate, formatMonthYear } from '../utils/formatters';
import type { Bill, BillItem, Payment } from '../db/database';

export interface BillDetailProps {
  idProp?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export default function BillDetail({ idProp, onClose, isModal }: BillDetailProps) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = idProp || paramId;
  const navigate = useNavigate();
  const theme = useTheme();

  const { getBillById, addPayment, deletePayment, deleteBill } = useBillStore();
  const { getRoomById } = useRoomStore();

  const [billData, setBillData] = useState<{ bill: Bill; items: BillItem[]; payments: Payment[] } | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [deleteBillDialogOpen, setDeleteBillDialogOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    const data = await getBillById(parseInt(id));
    if (data) {
      setBillData(data);
      const room = await getRoomById(data.bill.roomId);
      if (room) setRoomNumber(room.roomNumber);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) return null;

  if (!billData) {
    return <EmptyState icon="🔍" title="Không tìm thấy" subtitle="Hóa đơn không tồn tại hoặc đã bị xóa" />;
  }

  const { bill, items, payments } = billData;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, bill.totalAmount - totalPaid);

  const handleAddPayment = async () => {
    if (!paymentAmount) return;
    await addPayment({
      billId: bill.id!,
      amount: Number(paymentAmount),
      method: paymentMethod,
      note: paymentNote,
    });
    setPaymentDialogOpen(false);
    setPaymentAmount('');
    setPaymentNote('');
    loadData();
  };

  const handleDeleteBill = async () => {
    await deleteBill(bill.id!);
    if (isModal && onClose) onClose();
    else navigate('/bills');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCapture = async () => {
    const element = document.getElementById('invoice-print-area');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: theme.palette.background.paper });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `HoaDon_P${roomNumber}_T${bill.month}_${bill.year}.png`;
      link.click();
    } catch (e) {
      console.error("Lỗi chụp ảnh hóa đơn", e);
      alert("Lỗi khi chụp ảnh hóa đơn");
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => {
          if (isModal && onClose) onClose();
          else navigate('/bills');
        }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Hóa đơn T{bill.month}/{bill.year}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            Phòng {roomNumber}
          </Typography>
        </Box>
        <StatusBadge status={bill.status} type="bill" size="medium" />
      </Box>

      <Grid container spacing={3}>
        {/* Invoice Area */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card id="invoice-print-area">
            <CardContent sx={{ p: { xs: 2, md: 4 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>HÓA ĐƠN TIỀN NHÀ</Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                    Kỳ: {formatMonthYear(bill.month, bill.year)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Phòng {roomNumber}</Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    Tạo ngày: {formatDate(bill.createdAt)}
                  </Typography>
                  {bill.dueDate && (
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                      Hạn chót: {formatDate(bill.dueDate)}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Items List */}
              <Box sx={{ mb: 4 }}>
                <Grid container sx={{ mb: 1 }}>
                  <Grid size={{ xs: 4, sm: 5 }}><Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>Nội dung</Typography></Grid>
                  <Grid size={{ xs: 2, sm: 1 }}><Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.secondary, display: 'block', textAlign: 'center' }}>SL</Typography></Grid>
                  <Grid size={{ xs: 3, sm: 3 }}><Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.secondary, display: 'block', textAlign: 'right' }}>Đơn giá</Typography></Grid>
                  <Grid size={{ xs: 3, sm: 3 }}><Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.secondary, display: 'block', textAlign: 'right' }}>Thành tiền</Typography></Grid>
                </Grid>
                {items.map((item, idx) => (
                  <Grid container key={idx} sx={{ mb: 1.5, alignItems: 'center' }}>
                    <Grid size={{ xs: 4, sm: 5 }}><Typography variant="caption" component="div" sx={{ lineHeight: 1.2 }}>{item.description}</Typography></Grid>
                    <Grid size={{ xs: 2, sm: 1 }}><Typography variant="caption" component="div" sx={{ textAlign: 'center' }}>{item.quantity}</Typography></Grid>
                    <Grid size={{ xs: 3, sm: 3 }}><Typography variant="caption" component="div" sx={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</Typography></Grid>
                    <Grid size={{ xs: 3, sm: 3 }}><Typography variant="body2" component="div" sx={{ fontWeight: 700, textAlign: 'right', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{formatCurrency(item.amount)}</Typography></Grid>
                  </Grid>
                ))}
              </Box>
              
              <Divider sx={{ mb: 2 }} />

              {/* Total Summary */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 250 }}>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Đã thanh toán:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(totalPaid)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 250 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Cần thu:</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: remaining > 0 ? theme.palette.error.main : theme.palette.success.main }}>
                    {formatCurrency(remaining)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Action / Payment Area */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Actions */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
               <Button
                variant="contained"
                fullWidth
                startIcon={<PaymentIcon />}
                disabled={remaining <= 0}
                onClick={() => {
                  setPaymentAmount(remaining);
                  setPaymentDialogOpen(true);
                }}
                sx={{ mb: 1.5 }}
              >
                Ghi nhận thanh toán
              </Button>
               <Button
                variant="outlined"
                fullWidth
                startIcon={<CameraAltIcon />}
                onClick={handleCapture}
                sx={{ mb: 1.5 }}
              >
                Chụp hóa đơn
              </Button>
               <Button
                variant="outlined"
                fullWidth
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{ mb: 1.5 }}
              >
                In hóa đơn
              </Button>
               <Button
                variant="text"
                color="error"
                fullWidth
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteBillDialogOpen(true)}
              >
                Xóa hóa đơn
              </Button>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Lịch sử thanh toán</Typography>
              {payments.length === 0 ? (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Chưa có thanh toán nào.</Typography>
              ) : (
                payments.map((p) => (
                  <Box key={p.id} sx={{ mb: 2, p: 1.5, bgcolor: theme.palette.background.default, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</Typography>
                      <Chip label={p.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'} size="small" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {formatDate(p.paidAt)} {p.note && `• ${p.note}`}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async () => {
                          if (confirm('Xóa giao dịch này?')) {
                            await deletePayment(p.id!, bill.id!);
                            loadData();
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Ghi nhận thanh toán</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            label="Số tiền"
            name="paymentAmount"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
            InputProps={{ inputComponent: NumericFormatCustom as any }}
            fullWidth
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            select
            label="Phương thức"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="cash">Tiền mặt</MenuItem>
            <MenuItem value="transfer">Chuyển khoản</MenuItem>
          </TextField>
          <TextField
            label="Ghi chú"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPaymentDialogOpen(false)} color="inherit">Hủy</Button>
          <Button onClick={handleAddPayment} variant="contained" disabled={!paymentAmount}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteBillDialogOpen}
        title="Xóa hóa đơn?"
        message="Dữ liệu không thể phục hồi. Vui lòng xóa các thanh toán (nếu có) trước khi xóa hóa đơn."
        onConfirm={handleDeleteBill}
        onCancel={() => setDeleteBillDialogOpen(false)}
      />

    </Box>
  );
}
