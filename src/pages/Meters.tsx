import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  useTheme,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ElectricLogIcon from '@mui/icons-material/ElectricBolt';
import WaterLogIcon from '@mui/icons-material/WaterDrop';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { PageHeader, EmptyState } from '../components/common';
import { useMeterStore } from '../stores/meterStore';
import { useRoomStore } from '../stores/roomStore';
import { useBuildingStore } from '../stores/buildingStore';
import { useTenantStore } from '../stores/tenantStore';
import { formatMonthYear } from '../utils/formatters';
import dayjs from 'dayjs';

export default function Meters() {
  const theme = useTheme();
  const { readings, fetchReadings, getPreviousReading, saveReading } = useMeterStore();
  const { rooms, fetchRooms } = useRoomStore();
  const { buildings, fetchBuildings } = useBuildingStore();
  // Fetch contracts to check active rooms maybe
  const { fetchContracts } = useTenantStore();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState<number>(dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState<number>(dayjs().year());

  // Form State
  const [roomId, setRoomId] = useState<string>('');
  const [month, setMonth] = useState<number>(dayjs().month() + 1);
  const [year, setYear] = useState<number>(dayjs().year());
  const [elecOld, setElecOld] = useState<number | ''>('');
  const [elecNew, setElecNew] = useState<number | ''>('');
  const [waterOld, setWaterOld] = useState<number | ''>('');
  const [waterNew, setWaterNew] = useState<number | ''>('');
  const [photoData, setPhotoData] = useState<string>(''); // base64 string
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRooms();
    fetchBuildings();
    fetchContracts();
    fetchReadings(); // fetch all
  }, []);

  // Filter 
  const filteredReadings = readings.filter((r) => {
    // optional: filter by month/year if selected, else just search by room
    const room = rooms.find((rm) => rm.id === r.roomId);
    if (!room) return false;
    const searchMatch = room.roomNumber.toLowerCase().includes(search.toLowerCase());
    return searchMatch && (!filterMonth || r.month === filterMonth) && (!filterYear || r.year === filterYear);
  });

  // When room or month/year changes in Dialog, fetch old readings
  useEffect(() => {
    if (dialogOpen && roomId) {
      // Auto fetch previous reading
      getPreviousReading(parseInt(roomId), year, month).then((prev) => {
        if (prev) {
          setElecOld(prev.electricityNew);
          setWaterOld(prev.waterNew);
        } else {
          setElecOld('');
          setWaterOld('');
        }
        setPhotoData('');
      });
    }
  }, [dialogOpen, roomId, month, year, getPreviousReading]);

  const handleSave = async () => {
    if (!roomId || elecOld === '' || elecNew === '' || waterOld === '' || waterNew === '') return;
    setSaving(true);
    try {
      await saveReading({
        roomId: parseInt(roomId),
        year,
        month,
        electricityOld: Number(elecOld),
        electricityNew: Number(elecNew),
        waterOld: Number(waterOld),
        waterNew: Number(waterNew),
        photoPath: photoData,
      });
      setDialogOpen(false);
      
      // Auto open Create Bill? Usually they record all meters then generate all bills.
      // We'll keep it simple for now.
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoData(event.target.result as string);
      }
    };
    // Resize could be done here, for now direct base64
    reader.readAsDataURL(file);
  };

  const getBuildingName = (id: number) => buildings.find((b) => b.id === id)?.name ?? '';

  // Room options (only occupied or vacant if we want to allow recording anytime)
  const roomOptions = rooms.filter(r => r.status === 'occupied' || r.status === 'vacant');

  return (
    <Box>
      <PageHeader
        title="⚡ Điện nước"
        subtitle={`Chỉ số T${filterMonth}/${filterYear}`}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Ghi chỉ số
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
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
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            fullWidth
            size="small"
            sx={{ bgcolor: theme.palette.background.paper }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <MenuItem key={m} value={m}>Tháng {m}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            fullWidth
            size="small"
            sx={{ bgcolor: theme.palette.background.paper }}
          >
            {[dayjs().year() - 1, dayjs().year(), dayjs().year() + 1].map((y) => (
              <MenuItem key={y} value={y}>Năm {y}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* List */}
      {filteredReadings.length > 0 ? (
        <Grid container spacing={2}>
          {filteredReadings.map((r) => {
            const room = rooms.find((rm) => rm.id === r.roomId);
            if (!room) return null;
            const eDiff = r.electricityNew - r.electricityOld;
            const wDiff = r.waterNew - r.waterOld;

            return (
              <Grid size={{ xs: 12, md: 6 }} key={r.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          Phòng {room.roomNumber}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {getBuildingName(room.buildingId)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                        {formatMonthYear(r.month, r.year)}
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                          <ElectricLogIcon fontSize="small" color="warning" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Điện</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                          {r.electricityOld} → {r.electricityNew}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                          Tiêu thụ: {eDiff} kWh
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                         <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                          <WaterLogIcon fontSize="small" color="info" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Nước</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                          {r.waterOld} → {r.waterNew}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                          Tiêu thụ: {wDiff} m³
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <EmptyState icon="📊" title="Không có dữ liệu" subtitle="Chưa có chỉ số nào trong tháng này." />
      )}

      {/* Record Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Ghi chỉ số điện nước
          <IconButton onClick={() => setDialogOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                label="Chọn phòng *"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                fullWidth
              >
                {roomOptions.map((r) => (
                  <MenuItem key={r.id} value={String(r.id)}>
                    Phòng {r.roomNumber} ({getBuildingName(r.buildingId)})
                  </MenuItem>
                ))}
                {roomOptions.length === 0 && <MenuItem disabled>Không có phòng</MenuItem>}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
               <TextField
                select
                label="Kỳ ghi (Tháng)"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                fullWidth
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <MenuItem key={m} value={m}>Tháng {m}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
               <TextField
                select
                label="Năm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                fullWidth
              >
                {[dayjs().year() - 1, dayjs().year(), dayjs().year() + 1].map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {roomId && (
            <Card variant="outlined" sx={{ bgcolor: theme.palette.background.default }}>
              <CardContent>
                {/* Electricity */}
                <Typography variant="subtitle2" sx={{ color: theme.palette.warning.main, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ElectricLogIcon fontSize="small" /> Chỉ số điện (kWh)
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 6 }}>
                    <TextField label="Cũ" type="number" fullWidth value={elecOld} onChange={(e) => setElecOld(Number(e.target.value))} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField label="Mới *" type="number" fullWidth value={elecNew} onChange={(e) => setElecNew(Number(e.target.value))} autoFocus />
                  </Grid>
                </Grid>

                {/* Water */}
                 <Typography variant="subtitle2" sx={{ color: theme.palette.info.main, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WaterLogIcon fontSize="small" /> Chỉ số nước (m³)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField label="Cũ" type="number" fullWidth value={waterOld} onChange={(e) => setWaterOld(Number(e.target.value))} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField label="Mới *" type="number" fullWidth value={waterNew} onChange={(e) => setWaterNew(Number(e.target.value))} />
                  </Grid>
                </Grid>

                {/* Camera / Photo */}
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoCameraIcon />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Chụp hình đồng hồ
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      hidden
                      onChange={handleCapturePhoto}
                    />
                  </Button>
                  
                  {photoData && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <img src={photoData} alt="Meter" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                      <Button size="small" color="error" onClick={() => setPhotoData('')} sx={{ mt: 1 }}>
                        Xóa ảnh
                      </Button>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Hủy</Button>
          <Button onClick={handleSave} variant="contained" disabled={!roomId || elecNew === '' || waterNew === '' || saving}>
            Lưu chỉ số
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
