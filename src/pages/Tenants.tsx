import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  TextField,
  Fab,
  InputAdornment,
  useTheme,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  MenuItem,
  Chip,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import { PageHeader, EmptyState } from '../components/common';
import { useTenantStore } from '../stores/tenantStore';

export default function Tenants() {
  const theme = useTheme();
  const { tenants, fetchTenants, addTenant, updateTenant } = useTenantStore();
  const [search, setSearch] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const openAddDialog = () => {
    setEditingId(null);
    setFullName('');
    setPhone('');
    setIdCardNumber('');
    setPermanentAddress('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setStatus('active');
    setDialogOpen(true);
  };

  const openEditDialog = (tenant: any) => {
    setEditingId(tenant.id);
    setFullName(tenant.fullName);
    setPhone(tenant.phone || '');
    setIdCardNumber(tenant.idCardNumber || '');
    setPermanentAddress(tenant.permanentAddress || '');
    setEmergencyContactName(tenant.emergencyContactName || '');
    setEmergencyContactPhone(tenant.emergencyContactPhone || '');
    setStatus(tenant.status || 'active');
    setDialogOpen(true);
  };

  const filtered = tenants.filter((t) =>
    t.fullName.toLowerCase().includes(search.toLowerCase()) ||
    t.phone.includes(search) ||
    t.idCardNumber.includes(search),
  );

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      const data = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        idCardNumber: idCardNumber.trim(),
        permanentAddress: permanentAddress.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        status,
      };

      if (editingId) {
        await updateTenant(editingId, data);
      } else {
        await addTenant(data);
      }
      setDialogOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="👤 Khách thuê"
        subtitle={`${tenants.length} khách thuê`}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Thêm khách
          </Button>
        }
      />

      {/* Search */}
      <TextField
        placeholder="Tìm tên, SĐT, CCCD..."
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
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: theme.palette.background.paper },
        }}
      />

      {/* Tenant List */}
      {filtered.length > 0 ? (
        <Grid container spacing={2}>
          {filtered.map((tenant) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tenant.id}>
              <Card sx={{ '&:hover': { transform: 'translateY(-2px)' }, transition: 'transform 0.2s', opacity: tenant.status === 'inactive' ? 0.7 : 1 }}>
                <CardActionArea onClick={() => openEditDialog(tenant)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {tenant.fullName}
                      </Typography>
                      <Chip 
                        label={tenant.status === 'inactive' ? 'Đã dọn đi' : 'Đang ở'} 
                        size="small" 
                        color={tenant.status === 'inactive' ? 'default' : 'success'} 
                        variant="outlined" 
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {tenant.phone || '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <BadgeIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {tenant.idCardNumber || '—'}
                      </Typography>
                    </Box>
                    {tenant.permanentAddress && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HomeIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }} noWrap>
                          {tenant.permanentAddress}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState icon="👤" title="Chưa có khách thuê" subtitle="Thêm khách thuê để tạo hợp đồng" />
      )}

      {/* FAB */}
      <Fab
        color="primary"
        onClick={openAddDialog}
        sx={{ position: 'fixed', bottom: { xs: 80, md: 24 }, right: 24 }}
      >
        <AddIcon />
      </Fab>

      {/* Add Tenant Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {editingId ? '✏️ Sửa khách thuê' : '👤 Thêm khách thuê'}
          <IconButton onClick={() => setDialogOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            select
            label="Trạng thái ở"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="active">Đang ở</MenuItem>
            <MenuItem value="inactive">Đã dọn đi</MenuItem>
          </TextField>
          <TextField
            label="Họ tên *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            label="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Số CCCD / CMND"
            value={idCardNumber}
            onChange={(e) => setIdCardNumber(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Địa chỉ thường trú"
            value={permanentAddress}
            onChange={(e) => setPermanentAddress(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
            Liên hệ khẩn cấp
          </Typography>
          <TextField
            label="Tên người liên hệ"
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="SĐT người liên hệ"
            value={emergencyContactPhone}
            onChange={(e) => setEmergencyContactPhone(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Hủy</Button>
          <Button onClick={handleSave} variant="contained" disabled={!fullName.trim() || saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
