import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Chip,
  Alert,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ApartmentIcon from '@mui/icons-material/Apartment';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIcon from '@mui/icons-material/Phone';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import { PageHeader, EmptyState, StatusBadge } from '../components/common';
import { useBuildingStore } from '../stores/buildingStore';
import { useRoomStore } from '../stores/roomStore';
import { useTenantStore } from '../stores/tenantStore';
import { formatCurrency } from '../utils/formatters';
import { supabase } from '../db/supabaseClient';


export default function Rooms() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { buildings, fetchBuildings, addBuilding, updateBuilding, deleteBuilding } = useBuildingStore();
  const { rooms, fetchRooms } = useRoomStore();
  const { tenants, contracts, fetchTenants, fetchContracts } = useTenantStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [fabMenuAnchor, setFabMenuAnchor] = useState<null | HTMLElement>(null);

  // Building dialog
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<number | null>(null);
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');
  const [buildingFloors, setBuildingFloors] = useState('1');
  const [savingBuilding, setSavingBuilding] = useState(false);
  const [roomDebts, setRoomDebts] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchBuildings();
    fetchRooms();
    fetchTenants();
    fetchContracts();

    const loadDebts = async () => {
      const { data: bills } = await supabase.from('bills').select('id, roomId, totalAmount').in('status', ['unpaid', 'overdue']);
      if (bills && bills.length > 0) {
        const debts: Record<number, number> = {};
        for (const b of bills) {
          const { data: allocs } = await supabase.from('receiptAllocations').select('amount').eq('billId', b.id);
          const paid = allocs?.reduce((s, a) => s + a.amount, 0) || 0;
          const remaining = b.totalAmount - paid;
          if (remaining > 0) {
            debts[b.roomId] = (debts[b.roomId] || 0) + remaining;
          }
        }
        setRoomDebts(debts);
      }
    };
    loadDebts();
  }, [fetchBuildings, fetchRooms, fetchTenants, fetchContracts]);

  // Filter rooms
  const filteredRooms = rooms.filter((room) => {
    const building = buildings.find((b) => b.id === room.buildingId);
    const matchSearch =
      room.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      building?.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || room.status === filter;
    const matchBuilding = selectedBuildingId === 'all' || room.buildingId === selectedBuildingId;
    return matchSearch && matchFilter && matchBuilding;
  });

  const getBuildingName = (buildingId: number) =>
    buildings.find((b) => b.id === buildingId)?.name ?? '---';

  const getRoomTenant = (roomId: number) => {
    const activeContract = contracts.find(c => c.roomId === roomId && c.status === 'active');
    if (!activeContract) return null;
    return tenants.find(t => t.id === activeContract.tenantId);
  };

  // Save building
  const handleSaveBuilding = async () => {
    if (!buildingName.trim()) return;
    setSavingBuilding(true);
    try {
      if (editingBuildingId) {
        await updateBuilding(editingBuildingId, {
          name: buildingName.trim(),
          address: buildingAddress.trim(),
          totalFloors: parseInt(buildingFloors) || 1,
        });
      } else {
        await addBuilding({
          name: buildingName.trim(),
          address: buildingAddress.trim(),
          totalFloors: parseInt(buildingFloors) || 1,
          settingsJson: '{}',
        });
      }
      handleCloseBuildingDialog();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingBuilding(false);
    }
  };

  const handleCloseBuildingDialog = () => {
    setBuildingDialogOpen(false);
    setEditingBuildingId(null);
    setBuildingName('');
    setBuildingAddress('');
    setBuildingFloors('1');
  };

  const handleEditBuilding = (b: any) => {
    setEditingBuildingId(b.id!);
    setBuildingName(b.name);
    setBuildingAddress(b.address || '');
    setBuildingFloors(String(b.totalFloors || 1));
    setBuildingDialogOpen(true);
  };

  return (
    <Box>
      <PageHeader
        title="🚪 Quản lý Phòng"
        subtitle={`${rooms.length} phòng • ${buildings.length} tòa nhà`}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<ApartmentIcon />} onClick={() => setBuildingDialogOpen(true)}>
              Tòa nhà mới
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
              if (buildings.length === 0) {
                alert('Vui lòng tạo tòa nhà trước tiên!');
                setBuildingDialogOpen(true);
                return;
              }
              navigate('/rooms/create');
            }}>
              Thêm phòng
            </Button>
          </Box>
        }
      />

      {buildings.length === 0 && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" variant="outlined" onClick={() => setBuildingDialogOpen(true)}>
              TẠO TÒA NHÀ NGAY
            </Button>
          }
        >
          Hệ thống hiện chưa có tòa nhà nào! Vui lòng tạo tòa nhà trước khi thêm phòng.
        </Alert>
      )}

      {/* ─── Search + Filter ─── */}
      <TextField
        placeholder="Tìm phòng, tòa nhà..."
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
          mb: 2,
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
          },
        }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
          sx={{ display: 'flex', flexGrow: { xs: 1, md: 0 }, '& .MuiToggleButton-root': { px: { xs: 1, md: 2 }, textTransform: 'none', fontWeight: 600 } }}
        >
          <ToggleButton value="all">Tất cả</ToggleButton>
          <ToggleButton value="vacant">Trống</ToggleButton>
          <ToggleButton value="occupied">Đang thuê</ToggleButton>
          <ToggleButton value="maintenance">Đang sửa</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ─── Buildings chips ─── */}
      {buildings.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mr: 1, color: theme.palette.text.secondary }}>Khu vực:</Typography>
          <Chip
            label={`Tất cả (${rooms.length})`}
            variant={selectedBuildingId === 'all' ? 'filled' : 'outlined'}
            color={selectedBuildingId === 'all' ? 'primary' : 'default'}
            onClick={() => setSelectedBuildingId('all')}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          {buildings.map((b) => {
            const count = rooms.filter((r) => r.buildingId === b.id).length;
            const isSelected = selectedBuildingId === b.id;
            return (
              <Chip
                key={b.id}
                label={`${b.name} (${count})`}
                variant={isSelected ? 'filled' : 'outlined'}
                color={isSelected ? 'primary' : 'default'}
                size="small"
                onClick={() => setSelectedBuildingId(b.id!)}
                sx={{ fontWeight: isSelected ? 700 : 500 }}
              />
            );
          })}
        </Box>
      )}

      {/* Building Actions (Visible when a specific building is selected) */}
      {selectedBuildingId !== 'all' && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
           <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => {
             const b = buildings.find(b => b.id === selectedBuildingId);
             if (b) handleEditBuilding(b);
           }}>
             Cập nhật khu vực
           </Button>
           <Button size="small" variant="text" color="error" startIcon={<DeleteIcon />} onClick={() => {
             const b = buildings.find(b => b.id === selectedBuildingId);
             if (b && confirm(`Cảnh báo: Xóa tòa nhà "${b.name}" sẽ xóa tất cả phòng bên trong. Bạn chắc chắn chứ?`)) {
               deleteBuilding(b.id!);
               setSelectedBuildingId('all');
             }
           }}>
             Xóa
           </Button>
        </Box>
      )}

      {/* ─── Room List ─── */}
      {filteredRooms.length > 0 ? (
        viewMode === 'grid' ? (
          <Grid container spacing={2}>
            {filteredRooms.map((room) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={room.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { transform: 'translateY(-2px)' },
                    transition: 'transform 0.2s',
                  }}
                >
                  <CardActionArea onClick={() => navigate(`/rooms/${room.id}`)}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Phòng {room.roomNumber}
                          </Typography>
                          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            {getBuildingName(room.buildingId)} • Tầng {room.floorNumber}
                          </Typography>
                        </Box>
                        <StatusBadge status={room.status} type="room" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                          {room.areaM2}m²
                        </Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                            {formatCurrency(room.baseRent)}/th
                          </Typography>
                          {roomDebts[room.id!] > 0 && (
                            <Typography variant="caption" sx={{ color: theme.palette.error.main, fontWeight: 'bold' }}>
                              Nợ: {formatCurrency(roomDebts[room.id!])}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Tenant Info */}
                      {(() => {
                        const tenant = getRoomTenant(room.id!);
                        if (tenant) {
                          return (
                            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 1, borderTop: `1px dashed ${theme.palette.divider}` }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 15, color: theme.palette.text.secondary }} />
                                <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{tenant.fullName}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PhoneIcon sx={{ fontSize: 15, color: theme.palette.text.secondary }} />
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{tenant.phone}</Typography>
                              </Box>
                            </Box>
                          );
                        }
                        return null;
                      })()}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filteredRooms.map((room) => {
              const tenant = getRoomTenant(room.id!);
              return (
                <Card
                  key={room.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { transform: 'translateY(-2px)' },
                    transition: 'transform 0.2s',
                  }}
                >
                  <CardActionArea onClick={() => navigate(`/rooms/${room.id}`)}>
                    <CardContent sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      p: 1.5, 
                      '&:last-child': { pb: 1.5 },
                      flexDirection: { xs: 'column', md: 'row' },
                      gap: 1
                    }}>
                      <Box sx={{ width: { xs: '100%', md: '25%' }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Phòng {room.roomNumber}
                          </Typography>
                          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            {getBuildingName(room.buildingId)} • Tầng {room.floorNumber}
                          </Typography>
                        </Box>
                        {/* Status hidden on desktop, visible on mobile to save space on mobile wrap */}
                        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                          <StatusBadge status={room.status} type="room" />
                        </Box>
                      </Box>
                      
                      <Box sx={{ width: { xs: '100%', md: '30%' } }}>
                        {tenant ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{tenant.fullName}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PhoneIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{tenant.phone}</Typography>
                            </Box>
                          </Box>
                        ) : (
                           <Typography variant="body2" sx={{ color: theme.palette.text.disabled, fontStyle: 'italic' }}>
                            Chưa có khách thuê
                          </Typography>
                        )}
                      </Box>
                      
                      <Box sx={{ width: { xs: '100%', md: '20%' }, display: 'flex', justifyContent: { xs: 'space-between', md: 'center' }, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mr: 1 }}>{room.areaM2}m²</Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                            {formatCurrency(room.baseRent)}/th
                          </Typography>
                          {roomDebts[room.id!] > 0 && (
                            <Typography variant="caption" sx={{ color: theme.palette.error.main, fontWeight: 'bold' }}>
                              Nợ: {formatCurrency(roomDebts[room.id!])}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      
                      <Box sx={{ width: { xs: '100%', md: '15%' }, display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end' }}>
                        <StatusBadge status={room.status} type="room" />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        )
      ) : (
        <EmptyState
          icon="🚪"
          title="Chưa có phòng nào"
          subtitle="Thêm tòa nhà rồi thêm phòng để bắt đầu"
        />
      )}

      {/* ─── FAB ─── */}
      <Fab
        color="primary"
        onClick={(e) => setFabMenuAnchor(e.currentTarget)}
        sx={{ position: 'fixed', bottom: { xs: 80, md: 24 }, right: 24 }}
      >
        <AddIcon />
      </Fab>

      <Menu
        anchorEl={fabMenuAnchor}
        open={Boolean(fabMenuAnchor)}
        onClose={() => setFabMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setFabMenuAnchor(null);
            setBuildingDialogOpen(true);
          }}
        >
          <ListItemIcon><ApartmentIcon /></ListItemIcon>
          <ListItemText>Thêm tòa nhà</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setFabMenuAnchor(null);
            if (buildings.length === 0) {
              alert('Vui lòng tạo tòa nhà trước!');
              setBuildingDialogOpen(true);
              return;
            }
            navigate('/rooms/create');
          }}
        >
          <ListItemIcon><MeetingRoomIcon /></ListItemIcon>
          <ListItemText>Thêm phòng</ListItemText>
        </MenuItem>
      </Menu>

      {/* ─── Building Dialog ─── */}
      <Dialog open={buildingDialogOpen} onClose={handleCloseBuildingDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingBuildingId ? '✏️ Sửa tòa nhà' : '🏢 Thêm tòa nhà'}
          <IconButton onClick={handleCloseBuildingDialog} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            label="Tên tòa nhà *"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            label="Địa chỉ"
            value={buildingAddress}
            onChange={(e) => setBuildingAddress(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Số tầng"
            value={buildingFloors}
            onChange={(e) => setBuildingFloors(e.target.value)}
            type="number"
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseBuildingDialog} color="inherit">Hủy</Button>
          <Button
            onClick={handleSaveBuilding}
            variant="contained"
            disabled={!buildingName.trim() || savingBuilding}
          >
            {savingBuilding ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
