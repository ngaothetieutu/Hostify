import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button, Divider, useTheme, Chip, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useReceiptStore } from '../stores/receiptStore';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function ReceiptDetail() {
  const { id } = useParams();
  const theme = useTheme();
  const navigate = useNavigate();
  const { fetchReceiptById, deleteReceipt } = useReceiptStore();

  const [receiptData, setReceiptData] = useState<{ receipt: any; allocations: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData(Number(id));
    }
  }, [id]);

  const loadData = async (receiptId: number) => {
    setLoading(true);
    const data = await fetchReceiptById(receiptId);
    setReceiptData(data);
    setLoading(false);
  };

  if (loading) return <Typography sx={{ p: 3 }}>Đang tải...</Typography>;
  if (!receiptData) return <Typography sx={{ p: 3 }}>Không tìm thấy Phiếu Thu!</Typography>;

  const { receipt, allocations } = receiptData;
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const balance = receipt.amount - totalAllocated;

  const handleDelete = async () => {
    if (confirm('Xóa phiếu thu này? Toàn bộ các hóa đơn đã được gạch nợ sẽ quay lại trạng thái nợ.')) {
      await deleteReceipt(receipt.id);
      navigate('/receipts');
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/receipts')} sx={{ mr: 1, bgcolor: theme.palette.background.paper }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold">Chi tiết Phiếu Thu</Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">Ngày thu: {formatDate(receipt.recordedAt)}</Typography>
            <Chip size="small" label={receipt.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'} color={receipt.method === 'cash' ? 'success' : 'primary'} />
          </Box>
          <Typography variant="h4" fontWeight={900} sx={{ mb: 1, color: theme.palette.primary.main }}>
            {formatCurrency(receipt.amount)}
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Phòng {receipt.room?.roomNumber} {receipt.tenant ? `- ${receipt.tenant.fullName}` : ''}
          </Typography>
          {receipt.note && <Typography variant="body2" color="text.secondary">Ghi chú: {receipt.note}</Typography>}
          
          <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.action.hover, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Đã gạch nợ:</Typography>
              <Typography variant="body2" fontWeight="bold">{formatCurrency(totalAllocated)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Số dư còn lại:</Typography>
              <Typography variant="body2" fontWeight="bold" color={balance > 0 ? 'success.main' : 'text.primary'}>
                {formatCurrency(balance)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Chi tiết gạch nợ hóa đơn</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {allocations.length === 0 ? (
             <Typography variant="body2" color="text.secondary">Chưa phân bổ vào hóa đơn nào</Typography>
          ) : (
            allocations.map((a, index) => (
              <Box key={a.id}>
                {index > 0 && <Divider sx={{ my: 1.5 }} />}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                     <Typography variant="subtitle2" fontWeight="bold">Hóa đơn T{a.bill?.month}/{a.bill?.year}</Typography>
                  </Box>
                  <Typography variant="subtitle2" fontWeight="bold">{formatCurrency(a.amount)}</Typography>
                </Box>
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      <Button variant="outlined" color="error" fullWidth startIcon={<DeleteIcon />} onClick={handleDelete}>
        Xóa Phiếu Thu
      </Button>
    </Box>
  );
}
