import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Card,
  CardContent,
  Typography,
  Grid,
  useTheme,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader, NumericFormatCustom } from '../components/common';
import { useBuildingStore } from '../stores/buildingStore';
import { useRoomStore } from '../stores/roomStore';
import { DEFAULT_ELECTRICITY_RATE, DEFAULT_WATER_RATE, ROOM_STATUSES } from '../utils/constants';

export default function RoomForm() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { buildings, fetchBuildings } = useBuildingStore();
  const { addRoom, updateRoom, getRoomById } = useRoomStore();

  const [buildingId, setBuildingId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [floorNumber, setFloorNumber] = useState('1');
  const [areaM2, setAreaM2] = useState('');
  const [baseRent, setBaseRent] = useState('');
  const [electricityRate, setElectricityRate] = useState(String(DEFAULT_ELECTRICITY_RATE));
  const [waterRate, setWaterRate] = useState(String(DEFAULT_WATER_RATE));
  const [status, setStatus] = useState<'vacant' | 'occupied' | 'maintenance'>('vacant');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  // Load existing room if editing
  useEffect(() => {
    if (editId) {
      getRoomById(parseInt(editId)).then((room) => {
        if (room) {
          setBuildingId(String(room.buildingId));
          setRoomNumber(room.roomNumber);
          setFloorNumber(String(room.floorNumber));
          setAreaM2(String(room.areaM2));
          setBaseRent(String(room.baseRent));
          setElectricityRate(String(room.electricityRate));
          setWaterRate(String(room.waterRate));
          setStatus(room.status);
        }
      });
    }
  }, [editId, getRoomById]);

  const handleSave = async () => {
    if (!buildingId || !roomNumber.trim() || !baseRent) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setSaving(true);
    try {
      const data = {
        buildingId: parseInt(buildingId),
        roomNumber: roomNumber.trim(),
        floorNumber: parseInt(floorNumber) || 1,
        areaM2: parseFloat(areaM2) || 0,
        baseRent: parseFloat(baseRent) || 0,
        electricityRate: parseFloat(electricityRate) || DEFAULT_ELECTRICITY_RATE,
        waterRate: parseFloat(waterRate) || DEFAULT_WATER_RATE,
        status,
        amenitiesJson: '[]',
      };

      if (editId) {
        await updateRoom(parseInt(editId), data);
      } else {
        await addRoom(data);
      }
      navigate('/rooms');
    } catch (e) {
      console.error(e);
      alert('Lỗi khi lưu phòng');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={editId ? '✏️ Sửa phòng' : '➕ Thêm phòng mới'}
        subtitle="Nhập thông tin phòng trọ"
      />

      <Card sx={{ maxWidth: 600 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Building */}
          <TextField
            select
            label="Tòa nhà *"
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            fullWidth
            sx={{ mb: 2.5 }}
          >
            {buildings.map((b) => (
              <MenuItem key={b.id} value={String(b.id)}>
                {b.name} — {b.address || 'Không có địa chỉ'}
              </MenuItem>
            ))}
          </TextField>

          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Số phòng *"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                fullWidth
                placeholder="VD: 101, A2..."
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Tầng"
                value={floorNumber}
                onChange={(e) => setFloorNumber(e.target.value)}
                type="number"
                fullWidth
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Diện tích (m²)"
                value={areaM2}
                onChange={(e) => setAreaM2(e.target.value)}
                type="number"
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Giá thuê/tháng (VNĐ) *"
                value={baseRent}
                name="baseRent"
                onChange={(e) => setBaseRent(e.target.value)}
                InputProps={{ inputComponent: NumericFormatCustom as any }}
                fullWidth
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 1.5, mt: 1 }}>
            ⚡ Đơn giá điện nước
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Điện (VNĐ/kWh)"
                value={electricityRate}
                name="electricityRate"
                onChange={(e) => setElectricityRate(e.target.value)}
                InputProps={{ inputComponent: NumericFormatCustom as any }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Nước (VNĐ/m³)"
                value={waterRate}
                name="waterRate"
                onChange={(e) => setWaterRate(e.target.value)}
                InputProps={{ inputComponent: NumericFormatCustom as any }}
                fullWidth
              />
            </Grid>
          </Grid>

          {editId && (
            <TextField
              select
              label="Trạng thái"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              fullWidth
              sx={{ mb: 2.5 }}
            >
              {ROOM_STATUSES.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </TextField>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/rooms')} sx={{ flex: 1 }}>
              Hủy
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={<SaveIcon />}
              sx={{ flex: 1 }}
            >
              {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Tạo phòng'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
