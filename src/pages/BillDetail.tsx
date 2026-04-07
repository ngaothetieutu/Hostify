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
  Collapse,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import PaymentIcon from '@mui/icons-material/Payment';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import html2canvas from 'html2canvas';
import { StatusBadge, ConfirmDialog, EmptyState, NumericFormatCustom } from '../components/common';
import { useBillStore } from '../stores/billStore';
import { useRoomStore } from '../stores/roomStore';
import { useReceiptStore } from '../stores/receiptStore';
import { formatCurrency, formatDate, formatMonthYear } from '../utils/formatters';
import type { Bill, BillItem } from '../db/database';

export interface BillDetailProps {
  idProp?: string;
  onClose?: () => void;
  isModal?: boolean;
}

// ─── Collapsible Section Component ───
function SectionCard({
  title,
  icon,
  defaultOpen = true,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card sx={{ mb: 2 }}>
      <Box
        onClick={() => setOpen((o) => !o)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          py: 1.5,
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: open ? `1px solid ${theme.palette.divider}` : 'none',
          transition: 'background 0.15s',
          '&:hover': { bgcolor: `${theme.palette.primary.main}08` },
        }}
      >
        <Box sx={{ color: theme.palette.primary.main, display: 'flex', mr: 1 }}>{icon}</Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>{title}</Typography>
        {action && <Box onClick={(e) => e.stopPropagation()} sx={{ mr: 1 }}>{action}</Box>}
        {open ? <ExpandLessIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />}
      </Box>
      <Collapse in={open}>
        <CardContent sx={{ pt: 2 }}>{children}</CardContent>
      </Collapse>
    </Card>
  );
}

export default function BillDetail({ idProp, onClose, isModal }: BillDetailProps) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = idProp || paramId;
  const navigate = useNavigate();
  const theme = useTheme();

  const { getBillById, deleteBill } = useBillStore();
  const { getRoomById } = useRoomStore();

  const [billData, setBillData] = useState<{ bill: Bill; items: BillItem[]; allocations: any[] } | null>(null);
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

  const { bill, items, allocations } = billData;
  const totalPaid = allocations.reduce((sum: number, p: any) => sum + p.amount, 0);
  const remaining = Math.max(0, bill.totalAmount - totalPaid);

  // Group items by category
  const rentItem = items.find((i) => i.itemType === 'rent');
  const utilityItems = items.filter((i) => i.itemType === 'electricity' || i.itemType === 'water');
  const serviceItems = items.filter((i) => !['rent', 'electricity', 'water'].includes(i.itemType));

  const handleAddPayment = async () => {
    if (!paymentAmount) return;
    try {
      await useReceiptStore.getState().createReceiptAndAllocate(
        bill.roomId,
        Number(paymentAmount),
        paymentMethod,
        paymentNote,
        [{ billId: bill.id!, allocatedAmount: Number(paymentAmount) }]
      );
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNote('');
      loadData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
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
      const filename = `HoaDon_P${roomNumber}_T${bill.month}_${bill.year}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Không thể tạo file ảnh!');
          return;
        }

        const file = new File([blob], filename, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Hóa đơn phòng ${roomNumber}`,
              text: `Gửi hóa đơn tiền nhà phòng ${roomNumber} tháng ${bill.month}/${bill.year}`,
            });
            return;
          } catch (shareError) {
            console.log('Share cancelled or failed', shareError);
          }
        }

        const imageUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(imageUrl), 100);
      }, 'image/png');
    } catch (e: any) {
      console.error('Lỗi chụp ảnh hóa đơn', e);
      alert(`Lỗi khi chụp ảnh hóa đơn: ${e.message}`);
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

      <Grid container spacing={2.5}>
        {/* ─── Left Column: Bill Sections ─── */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Summary Banner */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              mb: 2,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}18, ${theme.palette.primary.main}06)`,
              border: `1px solid ${theme.palette.primary.main}30`,
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>Tổng hóa đơn</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                {formatCurrency(bill.totalAmount)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>Còn lại</Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: remaining > 0 ? theme.palette.error.main : theme.palette.success.main }}
              >
                {formatCurrency(remaining)}
              </Typography>
            </Box>
          </Box>

          {/* Section 1: Thông tin chung */}
          <SectionCard title="Thông tin chung" icon={<InfoOutlinedIcon fontSize="small" />} defaultOpen={false}>
            <Grid container spacing={1.5}>
              {[
                { label: 'Kỳ hóa đơn', value: formatMonthYear(bill.month, bill.year) },
                { label: 'Phòng', value: `Phòng ${roomNumber}` },
                { label: 'Ngày tạo', value: formatDate(bill.createdAt) },
                { label: 'Hạn chót', value: bill.dueDate ? formatDate(bill.dueDate) : '—' },
              ].map(({ label, value }) => (
                <Grid size={{ xs: 6 }} key={label}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
                </Grid>
              ))}
            </Grid>
          </SectionCard>

          {/* Section 2: Chi tiết tiền — printable area */}
          <SectionCard
            title="Chi tiết hóa đơn"
            icon={<ReceiptLongIcon fontSize="small" />}
            defaultOpen={true}
          >
            <Box id="invoice-print-area">
              {/* Rent */}
              {rentItem && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Tiền phòng
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="body2">{rentItem.description}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(rentItem.amount)}</Typography>
                  </Box>
                </Box>
              )}

              {/* Utilities */}
              {utilityItems.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Điện &amp; Nước
                    </Typography>
                    {utilityItems.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Box>
                          <Typography variant="body2">{item.description}</Typography>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            {formatCurrency(item.unitPrice)} × {item.quantity} {item.itemType === 'electricity' ? 'kWh' : 'khối'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(item.amount)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              {/* Services */}
              {serviceItems.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Dịch vụ &amp; Chi phí khác
                    </Typography>
                    {serviceItems.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Box>
                          <Typography variant="body2">{item.description}</Typography>
                          {item.quantity > 1 && (
                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                              {formatCurrency(item.unitPrice)} × {item.quantity}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(item.amount)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Totals */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Tổng hóa đơn</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(bill.totalAmount)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Đã thanh toán</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.success.main }}>- {formatCurrency(totalPaid)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Cần thu</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: remaining > 0 ? theme.palette.error.main : theme.palette.success.main }}>
                    {formatCurrency(remaining)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </SectionCard>

          {/* Section 3: Lịch sử thanh toán */}
          <SectionCard
            title="Lịch sử thanh toán"
            icon={<PaymentsOutlinedIcon fontSize="small" />}
            defaultOpen={allocations.length > 0}
          >
            {allocations.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                Chưa có thanh toán nào
              </Typography>
            ) : (
              allocations.map((p: any) => (
                <Box
                  key={p.id}
                  sx={{
                    mb: 1.5,
                    p: 1.5,
                    bgcolor: theme.palette.background.default,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</Typography>
                      <Chip label={p.receipt?.method === 'cash' ? 'Tiền mặt' : 'CK'} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {p.receipt?.recordedAt ? formatDate(p.receipt.recordedAt) : ''}
                      {p.receipt?.note && ` • ${p.receipt.note}`}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (confirm('Xóa giao dịch này và hủy phân bổ?')) {
                        await useReceiptStore.getState().deleteReceipt(p.receiptId);
                        loadData();
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </SectionCard>
        </Grid>

        {/* ─── Right Column: Actions ─── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>Thao tác</Typography>

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
                startIcon={<EditIcon />}
                onClick={() => navigate(`/bills/create?edit=${bill.id}`)}
                sx={{ mb: 1.5 }}
              >
                Sửa hóa đơn
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

              <Divider sx={{ my: 1.5 }} />

              <Button
                variant="text"
                color="error"
                fullWidth
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (bill.status === 'paid') {
                    alert('Hóa đơn đã thanh toán không được xóa!');
                    return;
                  }
                  setDeleteBillDialogOpen(true);
                }}
              >
                Xóa hóa đơn
              </Button>
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
