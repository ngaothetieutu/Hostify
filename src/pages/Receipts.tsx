import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, TextField, MenuItem, Button, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useReceiptStore } from '../stores/receiptStore';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Receipts() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { receipts, fetchReceipts, isLoading } = useReceiptStore();
  
  const [filterMethod, setFilterMethod] = useState<string>('all');
  
  useEffect(() => {
    fetchReceipts();
  }, []);

  const filtered = receipts.filter(r => {
    if (filterMethod !== 'all' && r.method !== filterMethod) return false;
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
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Hình thức"
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            sx={{ minWidth: 150 }}
            size="small"
          >
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="cash">Tiền mặt</MenuItem>
            <MenuItem value="transfer">Chuyển khoản</MenuItem>
          </TextField>
        </Box>
      </Card>

      {isLoading ? (
        <Typography color="text.secondary">Đang tải...</Typography>
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Chưa có phiếu thu nào</Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
          {filtered.map((r: any) => (
            <Card 
              key={r.id} 
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover } }}
              onClick={() => navigate(`/receipts/${r.id}`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">Phòng {r.room?.roomNumber}</Typography>
                  <Chip size="small" label={r.method === 'cash' ? 'Tiền mặt' : 'Chuyển'} color={r.method === 'cash' ? 'success' : 'primary'} variant="outlined" />
                </Box>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>{formatCurrency(r.amount)}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">Ngày Thu: {r.recordedAt ? formatDate(r.recordedAt) : '--'}</Typography>
                {r.note && <Typography variant="caption" color="text.secondary" display="block" noWrap>Ghi chú: {r.note}</Typography>}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
