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
  Chip,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CancelIcon from '@mui/icons-material/Cancel';
import { supabase } from '../db/supabaseClient';
import { StatusBadge, ConfirmDialog, EmptyState } from '../components/common';
import { useRoomStore } from '../stores/roomStore';
import { useBuildingStore } from '../stores/buildingStore';
import { useTenantStore } from '../stores/tenantStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { parseContractServices, calculateServiceFees } from '../utils/serviceHelpers';
import { useSettingsStore } from '../stores/settingsStore';
import type { Room, Contract, Tenant } from '../db/database';

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { getRoomById, deleteRoom } = useRoomStore();
  const { buildings, fetchBuildings } = useBuildingStore();
  const { getContractsByRoom, getTenantById, terminateContract } = useTenantStore();
  const { serviceTypes } = useSettingsStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenantMap, setTenantMap] = useState<Record<number, Tenant>>({});
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState<number | null>(null);
  const [roomDebt, setRoomDebt] = useState<number>(0);

  const loadData = async () => {
    if (!id) return;
    const r = await getRoomById(parseInt(id));
    setRoom(r ?? null);

    const cts = await getContractsByRoom(parseInt(id));
    // Sort: active first, then by date desc
    cts.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setContracts(cts);

    // Load tenant names
    const map: Record<number, Tenant> = {};
    for (const c of cts) {
      if (!map[c.tenantId]) {
        const t = await getTenantById(c.tenantId);
        if (t) map[c.tenantId] = t;
      }
    }
    setTenantMap(map);

    // Calculate room debt
    const { data: unpaidBills } = await supabase.from('bills').select('id, totalAmount').eq('roomId', parseInt(id)).in('status', ['unpaid', 'overdue']);
    let currentDebt = 0;
    if (unpaidBills && unpaidBills.length > 0) {
      for (const b of unpaidBills) {
        const { data: allocs } = await supabase.from('receiptAllocations').select('amount').eq('billId', b.id);
        const paid = allocs?.reduce((s, a) => s + a.amount, 0) || 0;
        currentDebt += (b.totalAmount - paid);
      }
    }
    setRoomDebt(currentDebt);

    setLoading(false);
  };

  useEffect(() => {
    fetchBuildings();
    loadData();
  }, [id]);

  if (loading) return null;

  if (!room) {
    return (
      <EmptyState icon="🔍" title="Không tìm thấy phòng" subtitle="Phòng không tồn tại hoặc đã bị xóa" />
    );
  }

  const building = buildings.find((b) => b.id === room.buildingId);
  const activeContract = contracts.find((c) => c.status === 'active');

  const handleDelete = async () => {
    await deleteRoom(room.id!);
    navigate('/rooms');
  };

  const handleTerminate = async (contractId: number) => {
    await terminateContract(contractId);
    setTerminateDialogOpen(null);
    // Reload data
    loadData();
  };

  const infoRow = (label: string, value: React.ReactNode) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.2 }}>
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
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/rooms')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Phòng {room.roomNumber}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {building?.name ?? '---'} • Tầng {room.floorNumber}
          </Typography>
        </Box>
        <StatusBadge status={room.status} type="room" size="medium" />
      </Box>

      <Grid container spacing={3}>
        {/* ─── Room Info ─── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                Thông tin phòng
              </Typography>
              {infoRow('Tòa nhà', building?.name ?? '---')}
              <Divider />
              {infoRow('Số phòng', room.roomNumber)}
              <Divider />
              {infoRow('Diện tích', `${room.areaM2} m²`)}
              <Divider />
              {infoRow('Giá thuê cơ bản', formatCurrency(room.baseRent))}
              <Divider />
              {infoRow('Tầng', room.floorNumber)}
              
              {roomDebt > 0 && (
                <>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, mt: 1, bgcolor: `${theme.palette.error.main}14`, px: 2, borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: theme.palette.error.main, fontWeight: 700 }}>
                      Đang nợ cước
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ color: theme.palette.error.main, fontWeight: 800 }}>
                        {formatCurrency(roomDebt)}
                      </Typography>
                      <Button size="small" variant="contained" color="error" sx={{ minWidth: 0, px: 2 }} onClick={() => navigate('/debts')}>
                        THU NGAY
                      </Button>
                    </Box>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Utility Rates + Actions ─── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                ⚡ Đơn giá điện nước
              </Typography>
              {infoRow('Điện', `${formatCurrency(room.electricityRate)}/kWh`)}
              <Divider />
              {infoRow('Nước', `${formatCurrency(room.waterRate)}/m³`)}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                Thao tác
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/rooms/create?edit=${room.id}`)}>
                  Sửa phòng
                </Button>
                {!activeContract && (
                  <Button variant="contained" color="secondary" startIcon={<DescriptionIcon />} onClick={() => navigate(`/contracts/create?roomId=${room.id}`)}>
                    Tạo hợp đồng
                  </Button>
                )}
                {activeContract && (
                  <Button variant="contained" color="success" startIcon={<ReceiptIcon />} onClick={() => navigate(`/bills/create?roomId=${room.id}`)}>
                    Tạo hóa đơn
                  </Button>
                )}
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteDialogOpen(true)}>
                  Xóa phòng
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Contracts Section ─── */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                📝 Hợp đồng ({contracts.length})
              </Typography>

              {contracts.length === 0 ? (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Chưa có hợp đồng nào. Nhấn "Tạo hợp đồng" để gắn khách thuê.
                </Typography>
              ) : (
                contracts.map((contract) => {
                  const tenant = tenantMap[contract.tenantId];
                  const services = parseContractServices(contract.servicesJson);
                  const fees = calculateServiceFees(services, contract.numberOfTenants, serviceTypes);
                  const enabledServices = services.filter((s) => s.enabled);

                  return (
                    <Box
                      key={contract.id}
                      sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        border: `1px solid ${contract.status === 'active' ? theme.palette.primary.main + '44' : theme.palette.divider}`,
                        bgcolor: contract.status === 'active' ? `${theme.palette.primary.main}06` : 'transparent',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {tenant?.fullName ?? '---'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            {tenant?.phone ?? ''} {tenant?.idCardNumber ? `• ${tenant.idCardNumber}` : ''}
                          </Typography>
                        </Box>
                        <StatusBadge status={contract.status} type="contract" />
                      </Box>

                      {infoRow('Thời hạn', `${formatDate(contract.startDate)} → ${contract.endDate ? formatDate(contract.endDate) : 'Không xác định'}`)}
                      {infoRow('Tiền thuê', formatCurrency(contract.monthlyRent))}
                      {infoRow('Tiền cọc', formatCurrency(contract.deposit))}
                      {infoRow('Số người', contract.numberOfTenants)}

                      {enabledServices.length > 0 && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Dịch vụ:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {enabledServices.map((s) => {
                              const sType = serviceTypes.find((st) => st.id === s.serviceId);
                              return (
                                <Chip
                                  key={s.serviceId}
                                  label={`${sType?.icon ?? ''} ${sType?.label ?? s.serviceId}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              );
                            })}
                          </Box>
                          {infoRow('Phí dịch vụ/tháng', formatCurrency(fees.total))}
                        </>
                      )}

                      {contract.status === 'active' && (
                        <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            color="info"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(`/contracts/create?edit=${contract.id}`)}
                          >
                            Sửa HĐ
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={() => setTerminateDialogOpen(contract.id!)}
                          >
                            Chấm dứt HĐ
                          </Button>
                        </Box>
                      )}
                    </Box>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete room dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Xóa phòng?"
        message={`Bạn có chắc muốn xóa Phòng ${room.roomNumber}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      {/* Terminate contract dialog */}
      <ConfirmDialog
        open={terminateDialogOpen !== null}
        title="Chấm dứt hợp đồng?"
        message="Phòng sẽ chuyển về trạng thái Trống. Bạn chắc chắn?"
        confirmText="Chấm dứt"
        onConfirm={() => terminateDialogOpen && handleTerminate(terminateDialogOpen)}
        onCancel={() => setTerminateDialogOpen(null)}
      />
    </Box>
  );
}
