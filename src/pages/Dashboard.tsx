import { useEffect, useState } from 'react';
import { Box, Grid, Typography, useTheme, TextField, MenuItem, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { SummaryCard, EmptyState } from '../components/common';
import { useBuildingStore } from '../stores/buildingStore';
import { useRoomStore } from '../stores/roomStore';
import { formatCurrency, getCurrentMonthYear } from '../utils/formatters';
import { supabase } from '../db/supabaseClient';

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const { buildings, fetchBuildings } = useBuildingStore();
  const { rooms, fetchRooms } = useRoomStore();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [totalBilled, setTotalBilled] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  useEffect(() => {
    fetchBuildings();
    fetchRooms();
  }, [fetchBuildings, fetchRooms]);

  const totalRooms = rooms.length;
  const vacantRooms = rooms.filter((r) => r.status === 'vacant').length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Supabase Finance Logic
  useEffect(() => {
    async function loadFinance() {
      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('year', selectedYear)
        .eq('month', selectedMonth);
        
      if (!bills || bills.length === 0) {
        setTotalBilled(0);
        setTotalPaid(0);
        return;
      }

      let billed = 0;
      for (const b of bills) {
        billed += b.totalAmount;
      }
      
      const billIds = bills.map(b => b.id);
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .in('billId', billIds);

      let paid = 0;
      if (payments) {
        paid = payments.reduce((sum, p) => sum + p.amount, 0);
      }

      setTotalBilled(billed);
      setTotalPaid(paid);
    }
    loadFinance();
  }, [selectedMonth, selectedYear]);

  // Backup Reminder Logic
  useEffect(() => {
    const today = new Date();
    if (today.getDate() >= 15) {
      const currentMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
      const lastBackup = localStorage.getItem('last_gdrive_auto_backup_date');
      if (lastBackup !== currentMonthKey) {
        setShowBackupReminder(true);
      }
    }
  }, []);

  const handleGoBackup = () => {
    // Chỉ đánh dấu là đã nhắc, hoặc đánh dấu sau khi backup thành công (Làm đơn giản ở đây)
    // Tạm thời chỉ chuyển trang. Việc đánh dấu nên làm ở trang Backup.
    navigate('/backup');
  };

  const totalUnpaid = Math.max(0, totalBilled - totalPaid);

  return (
    <Box>
      {/* ─── Backup Reminder ─── */}
      {showBackupReminder && (
        <Alert
          severity="error"
          variant="filled"
          icon={<CloudSyncIcon fontSize="inherit" />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleGoBackup}
              sx={{ fontWeight: 'bold' }}
            >
              SAO LƯU NGAY
            </Button>
          }
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Đã đến hạn sao lưu định kỳ hàng tháng!
          </Typography>
          <Typography variant="body2">
            Hôm nay đã qua ngày 15. Hãy dành 10 giây đẩy dữ liệu lên Google Drive để đảm bảo an toàn tuyệt đối nhé.
          </Typography>
        </Alert>
      )}

      {/* ─── Welcome Header ─── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: theme.palette.text.primary }}>
          Xin chào! 👋
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
          Tổng quan tình hình kinh doanh
        </Typography>
      </Box>

      {/* ─── Summary Cards ─── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <SummaryCard title="Tổng phòng" value={totalRooms} icon="🏠" color="#0EA5E9" />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <SummaryCard title="Phòng trống" value={vacantRooms} icon="🔑" color="#10B981" />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <SummaryCard title="Tỷ lệ lấp đầy" value={`${occupancyRate}%`} icon="📊" color="#6366F1" />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <SummaryCard title="Tòa nhà" value={buildings.length} icon="🏢" color="#F59E0B" />
        </Grid>
      </Grid>

      {/* ─── Finance Section ─── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2, mt: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>💰 Tài chính</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            size="small"
            sx={{ bgcolor: theme.palette.background.paper, minWidth: 120 }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <MenuItem key={m} value={m}>Tháng {m}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            size="small"
            sx={{ bgcolor: theme.palette.background.paper, minWidth: 100 }}
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
              <MenuItem key={y} value={y}>Năm {y}</MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6 }}>
          <SummaryCard title="Đã thu" value={formatCurrency(totalPaid)} icon="✅" color="#10B981" />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <SummaryCard title="Chưa thu" value={formatCurrency(totalUnpaid)} icon="⏳" color="#EF4444" />
        </Grid>
      </Grid>

      {/* ─── Guide ─── */}
      {totalRooms === 0 && (
        <EmptyState
          icon="🚀"
          title="Bắt đầu sử dụng"
          subtitle="Thêm tòa nhà → Thêm phòng → Tạo hợp đồng → Ghi chỉ số → Tạo hóa đơn"
        />
      )}
    </Box>
  );
}
