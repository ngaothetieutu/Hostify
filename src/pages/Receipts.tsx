import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, TextField, MenuItem, Button, useTheme, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useReceiptStore } from '../stores/receiptStore';
import { useRoomStore } from '../stores/roomStore';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Receipts() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { receipts, fetchReceipts, isLoading } = useReceiptStore();
  const { rooms, fetchRooms } = useRoomStore();
  
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  
  useEffect(() => {
    fetchReceipts();
    fetchRooms();
  }, []);

  const years = Array.from(new Set(receipts.map(r => r.recordedAt ? new Date(r.recordedAt).getFullYear() : null).filter(Boolean))).sort((a,b) => Number(b) - Number(a));
  
  const filtered = receipts.filter(r => {
    if (filterMethod !== 'all' && r.method !== filterMethod) return false;
    if (filterRoom !== 'all' && r.roomId?.toString() !== filterRoom) return false;
    
    if (r.recordedAt) {
      const date = new Date(r.recordedAt);
      if (filterMonth !== 'all' && (date.getMonth() + 1).toString() !== filterMonth) return false;
      if (filterYear !== 'all' && date.getFullYear().toString() !== filterYear) return false;
    }
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Danh sách Phiếu Thu</Typography>
        <Button variant="contained" onClick={() => navigate('/debts')}>
          Tạo Phiếu / Gạch Nợ
        </Button>
      </Box>

      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              fullWidth
              label="Phòng"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              size="small"
            >
              <MenuItem value="all">Tất cả phòng</MenuItem>
              {rooms.map(room => (
                <MenuItem key={room.id} value={room.id?.toString()}>Phòng {room.roomNumber}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              fullWidth
              label="Tháng"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              size="small"
            >
              <MenuItem value="all">Tất cả tháng</MenuItem>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <MenuItem key={m} value={m.toString()}>Tháng {m}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              fullWidth
              label="Năm"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              size="small"
            >
              <MenuItem value="all">Tất cả năm</MenuItem>
              {years.map(y => (
                <MenuItem key={y} value={y?.toString()}>Năm {y}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
             <TextField
              select
              fullWidth
              label="Hình thức"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              size="small"
            >
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="cash">Tiền mặt</MenuItem>
              <MenuItem value="transfer">Chuyển khoản</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {isLoading ? (
        <Typography color="text.secondary">Đang tải...</Typography>
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Chưa có phiếu thu nào</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((r: any) => (
            <Card 
              key={r.id} 
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover } }}
              onClick={() => navigate(`/receipts/${r.id}`)}
            >
              <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', fontWeight: 'bold' }}>
                  {r.room?.roomNumber}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                     <Typography variant="subtitle1" fontWeight="bold">Phòng {r.room?.roomNumber}</Typography>
                     <Chip size="small" label={r.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'} color={r.method === 'cash' ? 'success' : 'primary'} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {r.recordedAt ? formatDate(r.recordedAt) : '--'} {r.note && `• ${r.note}`}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" fontWeight="bold" color={theme.palette.success.main}>{formatCurrency(r.amount)}</Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
