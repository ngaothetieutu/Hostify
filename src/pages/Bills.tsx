import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  InputAdornment,
  useTheme,
  Card,
  CardContent,
  CardActionArea,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import html2canvas from 'html2canvas';
import { PageHeader, EmptyState } from '../components/common';
import { useBillStore } from '../stores/billStore';
import { useRoomStore } from '../stores/roomStore';
import { useTenantStore } from '../stores/tenantStore';
import { useMeterStore } from '../stores/meterStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calculateServiceFees, parseContractServices } from '../utils/serviceHelpers';
import type { BillItem } from '../db/database';
import dayjs from 'dayjs';

export default function Bills() {
  const theme = useTheme();
  const navigate = useNavigate();

  const { bills, fetchBills, billItems, createBill } = useBillStore();
  const { rooms, fetchRooms } = useRoomStore();
  const { getActiveContractForRoom } = useTenantStore();
  const { getReading, getPreviousReading } = useMeterStore();
  const { serviceTypes } = useSettingsStore();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [generatingMonth, setGeneratingMonth] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'warning' | 'error'}>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchRooms();
    fetchBills();
  }, [fetchRooms, fetchBills]);

  const handleGenerateMonthBills = async () => {
    try {
      setGeneratingMonth(true);
      const month = dayjs().month() + 1;
      const year = dayjs().year();
      const dueDate = dayjs().date(15).format('YYYY-MM-DD');

      let generatedCount = 0;

      for (const room of rooms) {
        if (room.status !== 'occupied') continue;
        
        const hasBill = bills.some(b => b.roomId === room.id && b.month === month && b.year === year);
        if (hasBill) continue;

        const contract = await getActiveContractForRoom(room.id!);
        if (!contract) continue;

        const reading = await getReading(room.id!, year, month);
        let elecOld = 0, elecNew = 0, waterOld = 0, waterNew = 0;
        if (reading) {
          elecOld = reading.electricityOld; elecNew = reading.electricityNew;
          waterOld = reading.waterOld; waterNew = reading.waterNew;
        } else {
          const prev = await getPreviousReading(room.id!, year, month);
          elecOld = prev?.electricityNew || 0; elecNew = elecOld;
          waterOld = prev?.waterNew || 0; waterNew = waterOld;
        }

        const newItems: Omit<BillItem, 'id' | 'billId'>[] = [];
        newItems.push({
          itemType: 'rent', description: 'Tiền phòng', quantity: 1,
          unitPrice: contract.monthlyRent, amount: contract.monthlyRent,
        });

        const services = parseContractServices(contract.servicesJson);
        const { items: svcItems } = calculateServiceFees(services, contract.numberOfTenants, serviceTypes);
        for (const svc of svcItems) {
          let t: BillItem['itemType'] = 'other';
          if (['washing', 'elevator', 'cleaning', 'wifi', 'internet', 'parking', 'garbage'].includes(svc.serviceId)) { t = svc.serviceId as any; }
          newItems.push({ itemType: t, description: svc.label, quantity: svc.quantity, unitPrice: svc.unitPrice, amount: svc.amount });
        }

        const eDiff = Math.max(elecNew - elecOld, 0);
        newItems.push({
          itemType: 'electricity', description: `Tiền điện (${elecOld} → ${elecNew})`,
          quantity: eDiff, unitPrice: room.electricityRate, amount: eDiff * room.electricityRate,
        });

        const wDiff = Math.max(waterNew - waterOld, 0);
        newItems.push({
          itemType: 'water', description: `Tiền nước (${waterOld} → ${waterNew})`,
          quantity: wDiff, unitPrice: room.waterRate, amount: wDiff * room.waterRate,
        });

        await createBill({ roomId: room.id!, contractId: contract.id, year, month, items: newItems, dueDate });
        generatedCount++;
      }
      
      await fetchBills();

      if (generatedCount === 0) {
        alert(`Hoàn tất quét! Không có phòng nào đủ điều kiện để tạo hóa đơn mới (Lý do: Tất cả phòng đang trống, chưa có hợp đồng, hoặc đã có hóa đơn Tháng ${month}/${year}).`);
      } else {
        alert(`Tạo thành công ${generatedCount} hóa đơn cho Tháng ${month}!`);
      }

    } catch (e: any) {
      console.error("Lỗi tạo hóa đơn tháng:", e);
      alert(`Có lỗi xảy ra khi tạo HĐ (${e.message || 'Lỗi không xác định'})`);
    } finally {
      setGeneratingMonth(false);
    }
  };

  const getBillUsage = (billId: number, type: 'electricity' | 'water') => {
    const item = billItems.find(i => i.billId === billId && i.itemType === type);
    return item ? item.quantity : 0;
  };

  const filteredBills = bills.filter((b) => {
    const room = rooms.find((r) => r.id === b.roomId);
    if (!room) return false;
    const matchSearch = room.roomNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchMonth = filterMonth === 'all' || b.month.toString() === filterMonth;
    return matchSearch && matchStatus && matchMonth;
  });

  const getRoomNumber = (roomId: number) => rooms.find((r) => r.id === roomId)?.roomNumber ?? '';

  const handleCaptureList = async () => {
    const element = document.getElementById('bills-list-print-area');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: theme.palette.background.paper 
      });
      
      const title = filterMonth === 'all' ? 'DanhSachHoaDon_TatCa' : `DanhSachHoaDon_Thang_${filterMonth}`;
      const filename = `${title}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert("Không thể tạo file ảnh!");
          return;
        }

        const file = new File([blob], filename, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Danh sách hóa đơn",
            });
            return;
          } catch (shareError) {
            console.log("Share cancelled or failed", shareError);
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
      console.error("Lỗi chụp danh sách", e);
      alert(`Lỗi chụp ảnh danh sách hóa đơn: ${e.message}`);
    }
  };

  const handleCopyList = () => {
    if (filteredBills.length === 0) {
      setSnackbar({ open: true, message: 'Không có hóa đơn nào để copy.', severity: 'warning' });
      return;
    }

    let textData = `=== DANH SÁCH HOÁ ĐƠN ${filterMonth !== 'all' ? `THÁNG ${filterMonth}` : ''} ===\n\n`;
    
    filteredBills.forEach(bill => {
      const roomStr = getRoomNumber(bill.roomId);
      const eUsg = getBillUsage(bill.id!, 'electricity');
      const wUsg = getBillUsage(bill.id!, 'water');
      const statusText = bill.status === 'paid' ? 'Đã thanh toán' : bill.status === 'unpaid' ? 'Chưa thanh toán' : 'Quá hạn';

      textData += `🏠 Phòng ${roomStr} (Kỳ: T${bill.month}/${bill.year})\n`;
      textData += `- Điện (${eUsg} kWh) | Nước (${wUsg} khối)\n`;
      textData += `- Cần nộp: ${formatCurrency(bill.totalAmount)} (${statusText})\n`;
      textData += `-----------------------\n`;
    });

    navigator.clipboard.writeText(textData)
      .then(() => setSnackbar({ open: true, message: 'Đã copy danh sách hóa đơn!', severity: 'success' }))
      .catch((err) => {
        console.error("Khổng thể copy danh sách", err);
        setSnackbar({ open: true, message: 'Có lỗi khi copy danh sách hóa đơn!', severity: 'error' });
      });
  };

  return (
    <Box>
      <PageHeader
        title="💰 Hóa đơn"
        subtitle={`${bills.length} hóa đơn đã tạo`}
        action={
          <Grid container spacing={1} sx={{ width: '100%' }}>
            <Grid size={{ xs: 6, sm: 'auto' }}>
              <Button 
                variant="outlined" 
                color="info"
                startIcon={<ContentCopyIcon />} 
                onClick={handleCopyList}
                fullWidth
              >
                Copy DS
              </Button>
            </Grid>
            <Grid size={{ xs: 6, sm: 'auto' }}>
              <Button 
                variant="outlined" 
                color="primary"
                startIcon={<CameraAltIcon />} 
                onClick={handleCaptureList}
                fullWidth
              >
                Chụp ảnh
              </Button>
            </Grid>
            <Grid size={{ xs: 6, sm: 'auto' }}>
              <Button 
                variant="outlined" 
                color="secondary"
                startIcon={generatingMonth ? <CircularProgress size={20} /> : <FlashOnIcon />} 
                onClick={handleGenerateMonthBills}
                disabled={generatingMonth}
                fullWidth
              >
                {generatingMonth ? 'Đang tạo...' : 'Tạo tự động'}
              </Button>
            </Grid>
            <Grid size={{ xs: 6, sm: 'auto' }}>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => navigate('/bills/create')}
                fullWidth
              >
                Tạo Hóa Đơn
              </Button>
            </Grid>
          </Grid>
        }
      />

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            placeholder="Tìm theo số phòng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: theme.palette.background.paper } }}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            fullWidth
            size="small"
            sx={{ bgcolor: theme.palette.background.paper }}
          >
            <MenuItem value="all">Tất cả tháng</MenuItem>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <MenuItem key={m} value={m.toString()}>Tháng {m}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <TextField
            select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            fullWidth
            size="small"
            sx={{ bgcolor: theme.palette.background.paper }}
          >
            <MenuItem value="all">Tất cả trạng thái</MenuItem>
            <MenuItem value="unpaid">Chưa thanh toán</MenuItem>
            <MenuItem value="paid">Đã thanh toán</MenuItem>
            <MenuItem value="overdue">Quá hạn</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="grid" aria-label="Lưới"><GridViewIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="list" aria-label="Danh sách"><ViewListIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* List */}
      {filteredBills.length > 0 ? (
        viewMode === 'grid' ? (
          <Grid container spacing={2} id="bills-list-print-area">
            {filteredBills.map((bill) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={bill.id}>
                <Card sx={{ '&:hover': { transform: 'translateY(-2px)' }, transition: 'transform 0.2s', opacity: bill.status === 'paid' ? 0.7 : 1 }}>
                  <CardActionArea onClick={() => navigate(`/bills/${bill.id}`)}>
                    <CardContent sx={{ pb: '16px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          Phòng {getRoomNumber(bill.roomId)}
                        </Typography>
                        <Box component="span" sx={{
                          fontSize: '0.72rem', fontWeight: 800, px: 1.2, py: 0.4, borderRadius: 1.5,
                          bgcolor: bill.status === 'paid' ? '#10b981' : bill.status === 'unpaid' ? '#f59e0b' : '#ef4444',
                          color: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {bill.status === 'paid' ? 'Đã TT' : bill.status === 'unpaid' ? 'Chưa TT' : 'Quá hạn'}
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 1, display: 'block' }}>Kỳ hóa đơn: T{bill.month}/{bill.year}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Điện: <strong style={{color: theme.palette.text.primary}}>{getBillUsage(bill.id!, 'electricity')}</strong> kWh</Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Nước: <strong style={{color: theme.palette.text.primary}}>{getBillUsage(bill.id!, 'water')}</strong> khối</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 1 }}>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Tổng thu:</Typography>
                        <Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, fontWeight: 800 }}>
                          {formatCurrency(bill.totalAmount)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box id="bills-list-print-area" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredBills.map((bill) => (
              <Card sx={{ display: 'flex', flexDirection: 'column', opacity: bill.status === 'paid' ? 0.7 : 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover', transform: 'translateX(4px)' }, transition: 'transform 0.2s', cursor: 'pointer' }} key={bill.id} elevation={0}>
                <CardActionArea onClick={() => navigate(`/bills/${bill.id}`)}>
                  <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 1.5, md: 3 }, alignItems: { xs: 'stretch', md: 'center' }, py: 1.5, pb: '12px !important' }}>
                    {/* Room & Period */}
                    <Box sx={{ width: { xs: '100%', md: '20%' }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>P.{getRoomNumber(bill.roomId)}</Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>Kỳ T{bill.month}/{bill.year}</Typography>
                      </Box>
                      {/* Mobile Status */}
                      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                        <Box component="span" sx={{
                          fontSize: '0.72rem', fontWeight: 800, px: 1.2, py: 0.4, borderRadius: 1.5,
                          bgcolor: bill.status === 'paid' ? '#10b981' : bill.status === 'unpaid' ? '#f59e0b' : '#ef4444',
                          color: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {bill.status === 'paid' ? 'Đã TT' : bill.status === 'unpaid' ? 'Chưa TT' : 'Quá hạn'}
                        </Box>
                      </Box>
                    </Box>

                    {/* Usage Items */}
                    <Box sx={{ width: { xs: '100%', md: '30%' }, display: 'flex', gap: 3 }}>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        ⚡ Điện: <strong style={{color: theme.palette.text.primary}}>{getBillUsage(bill.id!, 'electricity')}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        💧 Nước: <strong style={{color: theme.palette.text.primary}}>{getBillUsage(bill.id!, 'water')}</strong>
                      </Typography>
                    </Box>

                    {/* Amount & Date */}
                    <Box sx={{ width: { xs: '100%', md: '30%' }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        {bill.dueDate && (
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>Hạn: {formatDate(bill.dueDate)}</Typography>
                        )}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                        {formatCurrency(bill.totalAmount)}
                      </Typography>
                    </Box>

                    {/* Status Desktop */}
                    <Box sx={{ width: { xs: '100%', md: '15%' }, display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end' }}>
                      <Box component="span" sx={{
                        fontSize: '0.8rem', fontWeight: 800, px: 1.5, py: 0.5, borderRadius: 1.5,
                        bgcolor: bill.status === 'paid' ? '#10b981' : bill.status === 'unpaid' ? '#f59e0b' : '#ef4444',
                        color: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {bill.status === 'paid' ? 'Đã thanh toán' : bill.status === 'unpaid' ? 'Chưa thanh toán' : 'Quá hạn'}
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )
      ) : (
        <EmptyState icon="💰" title="Không tìm thấy hóa đơn" subtitle="Thử thay đổi bộ lọc hoặc tạo hóa đơn mới" />
      )}



      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%', fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
