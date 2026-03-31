import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
  useTheme,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Snackbar,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader, ConfirmDialog, NumericFormatCustom } from '../components/common';
import { APP_VERSION, DEFAULT_ELECTRICITY_RATE, DEFAULT_WATER_RATE } from '../utils/constants';
import { useSettingsStore } from '../stores/settingsStore';
import type { AppServiceType } from '../stores/settingsStore';
import { formatCurrency } from '../utils/formatters';
import { seedSampleData } from '../db/seed';
import { supabase } from '../db/supabaseClient';
export default function Settings() {
  const theme = useTheme();
  const { serviceTypes, addServiceType, updateServiceType, deleteServiceType } = useSettingsStore();

  const [seeding, setSeeding] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: 'seed' | 'clear' }>({ open: false, type: 'seed' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Services UI
  const [serviceDialog, setServiceDialog] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [svcForm, setSvcForm] = useState<Partial<AppServiceType>>({});
  
  const openEditService = (svc?: AppServiceType) => {
    if (svc) {
      setEditingServiceId(svc.id);
      setSvcForm(svc);
    } else {
      setEditingServiceId(null);
      setSvcForm({ id: `custom_${Date.now()}`, label: '', icon: '🔧', defaultPrice: 0, unit: 'room', unitLabel: '/phòng/tháng' });
    }
    setServiceDialog(true);
  };

  const handleSaveService = () => {
    if (!svcForm.label || !svcForm.id) return;
    if (editingServiceId) {
      updateServiceType(editingServiceId, svcForm);
    } else {
      addServiceType(svcForm as AppServiceType);
    }
    setServiceDialog(false);
  };

  const [deleteSvcId, setDeleteSvcId] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedSampleData();
      setSnackbar({
        open: true,
        message: `✅ Đã tạo ${result.buildingCount} tòa nhà, ${result.roomCount} phòng, ${result.tenantCount} khách thuê!`,
        severity: 'success',
      });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: '❌ Lỗi khi tạo dữ liệu mẫu', severity: 'error' });
    } finally {
      setSeeding(false);
    }
  };

  const handleClearAll = async () => {
    try {
      // Xóa ngược từ con lên cha để không vi phạm khoá ngoại trên Supabase
      await supabase.from('payments').delete().neq('id', 0);
      await supabase.from('billItems').delete().neq('id', 0);
      await supabase.from('bills').delete().neq('id', 0);
      await supabase.from('meterReadings').delete().neq('id', 0);
      await supabase.from('contracts').delete().neq('id', 0);
      await supabase.from('rooms').delete().neq('id', 0);
      await supabase.from('tenants').delete().neq('id', 0);
      await supabase.from('buildings').delete().neq('id', 0);
      
      setSnackbar({ open: true, message: '✅ Đã xóa sạch toàn bộ dữ liệu trên Supabase', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: '❌ Lỗi khi xóa dữ liệu', severity: 'error' });
    }
  };

  const infoRow = (label: string, value: string) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <Box>
      <PageHeader title="⚙️ Cài đặt" subtitle="Thông tin ứng dụng và cấu hình" />

      {/* App Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
            Thông tin ứng dụng
          </Typography>
          {infoRow('Phiên bản', `v${APP_VERSION}`)}
          <Divider />
          {infoRow('Nền tảng', 'Progressive Web App')}
          <Divider />
          {infoRow('Dữ liệu', 'Lưu trên thiết bị (IndexedDB)')}
        </CardContent>
      </Card>

      {/* Default Rates */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
            Đơn giá mặc định
          </Typography>
          {infoRow('Điện', `${formatCurrency(DEFAULT_ELECTRICITY_RATE)}/kWh`)}
          <Divider />
          {infoRow('Nước', `${formatCurrency(DEFAULT_WATER_RATE)}/m³`)}
        </CardContent>
      </Card>

      {/* Service Types */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>
              Dịch vụ (tính vào hợp đồng)
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => openEditService()}>
              Thêm
            </Button>
          </Box>
          {serviceTypes.map((svc, i) => (
            <Box key={svc.id}>
              {i > 0 && <Divider />}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {svc.icon} {svc.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(svc.defaultPrice)}{svc.unitLabel}
                  </Typography>
                  <IconButton size="small" onClick={() => openEditService(svc)} color="info">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setDeleteSvcId(svc.id)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ))}
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: theme.palette.text.secondary }}>
            * Dịch vụ được tích chọn khi tạo hợp đồng, tự động cộng vào hóa đơn hàng tháng
          </Typography>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
            Quản lý dữ liệu
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<StorageIcon />}
              onClick={() => setConfirmDialog({ open: true, type: 'seed' })}
              disabled={seeding}
            >
              {seeding ? 'Đang tạo...' : 'Tạo dữ liệu mẫu'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => setConfirmDialog({ open: true, type: 'clear' })}
            >
              Xóa toàn bộ dữ liệu
            </Button>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: theme.palette.text.secondary }}>
            Dữ liệu mẫu: Nhà trọ Cô Hợi (6 tầng), 15 phòng (T1: 102-103, T2-5: x01-x03, T6: 601)
          </Typography>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
            Sao lưu & Khôi phục
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
            Sao lưu dữ liệu JSON hoặc export CSV để mở bằng Excel / Google Sheets.
          </Typography>
          <Button variant="contained" href="/backup" startIcon={<StorageIcon />}>
            Mở trang Sao lưu
          </Button>
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.type === 'seed' ? 'Tạo dữ liệu mẫu?' : 'Xóa toàn bộ dữ liệu?'}
        message={confirmDialog.type === 'seed'
          ? 'Tạo dữ liệu mẫu sẽ XÓA toàn bộ dữ liệu hiện tại. Bạn chắc chắn?'
          : 'XÓA TOÀN BỘ dữ liệu? Hành động này không thể hoàn tác!'
        }
        confirmText={confirmDialog.type === 'seed' ? 'Tạo dữ liệu' : 'Xóa hết'}
        confirmColor={confirmDialog.type === 'seed' ? 'primary' : 'error'}
        onConfirm={() => {
          setConfirmDialog({ ...confirmDialog, open: false });
          if (confirmDialog.type === 'seed') handleSeed();
          else handleClearAll();
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />

      <ConfirmDialog
        open={Boolean(deleteSvcId)}
        title="Xóa dịch vụ?"
        message="Hợp đồng đang sử dụng dịch vụ này vẫn lưu số tiền cũ, nhưng dịch vụ sẽ không còn hiển thị để đăng ký mới. Bạn có chắc chắn?"
        confirmText="Xóa"
        confirmColor="error"
        onConfirm={() => {
          if (deleteSvcId) deleteServiceType(deleteSvcId);
          setDeleteSvcId(null);
        }}
        onCancel={() => setDeleteSvcId(null)}
      />

      {/* Edit Service Dialog */}
      <Dialog open={serviceDialog} onClose={() => setServiceDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingServiceId ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            label="Tên dịch vụ *"
            value={svcForm.label || ''}
            onChange={(e) => setSvcForm({ ...svcForm, label: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Icon (Emoji)"
            value={svcForm.icon || ''}
            onChange={(e) => setSvcForm({ ...svcForm, icon: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Đơn giá mặc định (VNĐ)"
            value={svcForm.defaultPrice || ''}
            onChange={(e) => setSvcForm({ ...svcForm, defaultPrice: parseFloat(e.target.value) || 0 })}
            InputProps={{ inputComponent: NumericFormatCustom as any }}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            select
            label="Phương thức tính"
            value={svcForm.unit || 'room'}
            onChange={(e) => {
               const u = e.target.value as 'room' | 'person';
               setSvcForm({ ...svcForm, unit: u, unitLabel: u === 'room' ? '/phòng/tháng' : '/người/tháng' });
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="room">Theo phòng</MenuItem>
            <MenuItem value="person">Theo đầu người</MenuItem>
          </TextField>
          <TextField
            label="Nhãn đơn vị hiển thị"
            value={svcForm.unitLabel || ''}
            onChange={(e) => setSvcForm({ ...svcForm, unitLabel: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setServiceDialog(false)} color="inherit">Hủy</Button>
          <Button onClick={handleSaveService} variant="contained" disabled={!svcForm.label}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
