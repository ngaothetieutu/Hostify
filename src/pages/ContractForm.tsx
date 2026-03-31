import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  Checkbox,
  FormControlLabel,
  Divider,
  useTheme,
  Alert,
  Autocomplete,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader, NumericFormatCustom } from '../components/common';
import { useBuildingStore } from '../stores/buildingStore';
import { useRoomStore } from '../stores/roomStore';
import { useTenantStore } from '../stores/tenantStore';
import { useMeterStore } from '../stores/meterStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatCurrency } from '../utils/formatters';
import { getDefaultContractServices, calculateServiceFees } from '../utils/serviceHelpers';
import type { ContractService } from '../db/database';
import dayjs from 'dayjs';

export default function ContractForm() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetRoomId = searchParams.get('roomId');
  const editContractId = searchParams.get('edit');

  const { buildings, fetchBuildings } = useBuildingStore();
  const { rooms, fetchRooms } = useRoomStore();
  const { tenants, contracts, fetchTenants, fetchContracts, createContract, updateContract, getContractById } = useTenantStore();
  const { saveReading } = useMeterStore();

  const [roomId, setRoomId] = useState(presetRoomId || '');
  const [tenantId, setTenantId] = useState('');
  const [coTenantIds, setCoTenantIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().add(12, 'month').format('YYYY-MM-DD'));
  const [deposit, setDeposit] = useState('');
  const [numberOfTenants, setNumberOfTenants] = useState('1');
  
  const [initialElectricity, setInitialElectricity] = useState('0');
  const [initialWater, setInitialWater] = useState('0');
  
  const { serviceTypes } = useSettingsStore();
  const [services, setServices] = useState<ContractService[]>(() => getDefaultContractServices(useSettingsStore.getState().serviceTypes));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBuildings();
    fetchRooms();
    fetchTenants();
    fetchContracts();
  }, [fetchBuildings, fetchRooms, fetchTenants, fetchContracts]);

  // Load existing contract if edit mode
  useEffect(() => {
    if (editContractId) {
      getContractById(parseInt(editContractId)).then((contract) => {
        if (contract) {
          setRoomId(contract.roomId.toString());
          setTenantId(contract.tenantId.toString());
          setCoTenantIds(contract.coTenantIds || []);
          setStartDate(contract.startDate);
          setEndDate(contract.endDate || '');
          setDeposit(contract.deposit.toString());
          setNumberOfTenants(contract.numberOfTenants.toString());
          setServices(JSON.parse(contract.servicesJson));
        }
      });
    }
  }, [editContractId, getContractById]);

  // Auto-fill rent from selected room
  const selectedRoom = rooms.find((r) => r.id === parseInt(roomId));
  const monthlyRent = selectedRoom?.baseRent ?? 0;

  // Available room options
  const roomOptions = rooms.filter((r) => r.status === 'vacant' || r.id === parseInt(roomId));

  // Calculate service fees preview
  const serviceFees = calculateServiceFees(services, parseInt(numberOfTenants) || 1, serviceTypes);

  // Filter out occupied tenants
  const activeContracts = contracts.filter((c) => c.status === 'active' && c.id !== parseInt(editContractId || '-1'));
  const occupiedTenantIds = new Set<number>();
  activeContracts.forEach((c) => {
    occupiedTenantIds.add(c.tenantId);
    if (c.coTenantIds) {
      c.coTenantIds.forEach((id) => occupiedTenantIds.add(id));
    }
  });
  const availableTenants = tenants.filter((t) => !occupiedTenantIds.has(t.id!));

  // Toggle service
  const toggleService = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) => (s.serviceId === serviceId ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  // Update service price
  const updateServicePrice = (serviceId: string, price: number) => {
    setServices((prev) =>
      prev.map((s) => (s.serviceId === serviceId ? { ...s, price } : s)),
    );
  };

  const handleSave = async () => {
    if (!roomId || !tenantId) {
      setError('Vui lòng chọn phòng và khách thuê');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = {
        roomId: parseInt(roomId),
        tenantId: parseInt(tenantId),
        coTenantIds,
        startDate,
        endDate: endDate || undefined,
        monthlyRent,
        deposit: parseFloat(deposit.toString()) || 0,
        numberOfTenants: parseInt(numberOfTenants) || 1,
        services,
      };

      if (editContractId) {
        await updateContract(parseInt(editContractId), data);
      } else {
        await createContract(data);
        // Chốt số điện nước đầu vào
        const start = dayjs(startDate);
        await saveReading({
          roomId: parseInt(roomId),
          year: start.year(),
          month: start.month() + 1,
          electricityOld: parseInt(initialElectricity) || 0,
          electricityNew: parseInt(initialElectricity) || 0,
          waterOld: parseInt(initialWater) || 0,
          waterNew: parseInt(initialWater) || 0,
        });
      }

      navigate(`/rooms/${roomId}`);
    } catch (e: any) {
      setError(e.message || 'Lỗi khi tạo hợp đồng');
    } finally {
      setSaving(false);
    }
  };

  const getBuildingName = (buildingId: number) =>
    buildings.find((b) => b.id === buildingId)?.name ?? '';

  return (
    <Box>
      <PageHeader
        title={editContractId ? "✏️ Sửa hợp đồng" : "📝 Tạo hợp đồng"}
        subtitle="Quản lý khách thuê và dịch vụ phòng"
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* ─── Left: Contract Info ─── */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                Thông tin hợp đồng
              </Typography>

              {/* Room */}
              <Autocomplete
                options={roomOptions}
                getOptionLabel={(r) => `Phòng ${r.roomNumber} — ${getBuildingName(r.buildingId)} — ${formatCurrency(r.baseRent)}/th`}
                value={roomOptions.find((r) => r.id === parseInt(roomId)) || null}
                onChange={(_, newValue) => setRoomId(newValue ? String(newValue.id) : '')}
                disabled={!!editContractId}
                renderInput={(params) => <TextField {...params} label="Chọn phòng *" />}
                sx={{ mb: 2.5 }}
              />

              {/* Main Tenant */}
              <Autocomplete
                options={availableTenants}
                getOptionLabel={(t) => `${t.fullName} (${t.phone || 'Không SĐT'})`}
                value={availableTenants.find((t) => t.id === parseInt(tenantId)) || null}
                onChange={(_, newValue) => setTenantId(newValue ? String(newValue.id) : '')}
                renderInput={(params) => <TextField {...params} label="Người đăng ký (đại diện) *" />}
                sx={{ mb: 2.5 }}
              />

              {/* Co-Tenants */}
              <Autocomplete
                multiple
                options={availableTenants.filter(t => t.id !== parseInt(tenantId))}
                getOptionLabel={(t) => `${t.fullName} (${t.phone || 'Không SĐT'})`}
                value={availableTenants.filter((t) => coTenantIds.includes(t.id!))}
                onChange={(_, newValue) => setCoTenantIds(newValue.map(t => t.id!))}
                renderInput={(params) => <TextField {...params} label="Thành viên ở chung (Tùy chọn)" />}
                sx={{ mb: 2.5 }}
              />

              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Ngày bắt đầu"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Ngày kết thúc"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Tiền cọc (VNĐ)"
                    name="deposit"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    InputProps={{ inputComponent: NumericFormatCustom as any }}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Số người ở"
                    value={numberOfTenants}
                    onChange={(e) => setNumberOfTenants(e.target.value)}
                    type="number"
                    fullWidth
                  />
                </Grid>
              </Grid>

              {!editContractId && (
                <Grid container spacing={2} sx={{ mb: 2.5 }}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      label="Số điện ban đầu"
                      value={initialElectricity}
                      onChange={(e) => setInitialElectricity(e.target.value)}
                      type="number"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      label="Số nước ban đầu"
                      value={initialWater}
                      onChange={(e) => setInitialWater(e.target.value)}
                      type="number"
                      fullWidth
                    />
                  </Grid>
                </Grid>
              )}

              {selectedRoom && (
                <Box sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: `${theme.palette.primary.main}08`,
                  border: `1px solid ${theme.palette.primary.main}22`,
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    💰 Giá thuê: {formatCurrency(monthlyRent)}/tháng
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    Tự động lấy từ giá phòng {selectedRoom.roomNumber}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Right: Services ─── */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                🔧 Dịch vụ đăng ký
              </Typography>

              {serviceTypes.map((svcType) => {
                const svc = services.find((s) => s.serviceId === svcType.id);
                if (!svc) return null;
                const numTenants = parseInt(numberOfTenants) || 1;
                const qty = svcType.unit === 'person' ? numTenants : 1;
                const amount = svc.enabled ? svc.price * qty : 0;

                return (
                  <Box key={svcType.id} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={svc.enabled}
                            onChange={() => toggleService(svcType.id)}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {svcType.icon} {svcType.label}
                          </Typography>
                        }
                      />
                      {svc.enabled && (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          {formatCurrency(amount)}
                        </Typography>
                      )}
                    </Box>
                    {svc.enabled && (
                      <Box sx={{ ml: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          name="servicePrice"
                          value={svc.price}
                          onChange={(e) => updateServicePrice(svcType.id, parseFloat(e.target.value) || 0)}
                          InputProps={{ inputComponent: NumericFormatCustom as any }}
                          size="small"
                          sx={{ width: 120 }}
                        />
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {svcType.unitLabel}
                          {svcType.unit === 'person' && ` × ${qty} người`}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}

              <Divider sx={{ my: 2 }} />

              {/* Total preview */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Tiền phòng</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(monthlyRent)}</Typography>
              </Box>
              {serviceFees.items.map((item) => (
                <Box key={item.serviceId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{item.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">Tổng/tháng (ước tính)</Typography>
                <Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, fontWeight: 800 }}>
                  {formatCurrency(monthlyRent + serviceFees.total)}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mt: 0.5 }}>
                * Chưa bao gồm điện nước
              </Typography>
            </CardContent>
          </Card>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button variant="outlined" onClick={() => navigate(-1)} sx={{ flex: 1 }}>
              Hủy
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={<SaveIcon />}
              sx={{ flex: 1 }}
            >
              {saving ? 'Đang lưu...' : editContractId ? 'Lưu thay đổi' : 'Tạo hợp đồng'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
