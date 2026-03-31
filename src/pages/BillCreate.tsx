import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Button,
  Divider,
  Alert,
  IconButton,
  useTheme,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CloseIcon from '@mui/icons-material/Close';
import { PageHeader, NumericFormatCustom } from '../components/common';
import { useRoomStore } from '../stores/roomStore';
import { useBuildingStore } from '../stores/buildingStore';
import { useMeterStore } from '../stores/meterStore';
import { useTenantStore } from '../stores/tenantStore';
import { useBillStore } from '../stores/billStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatCurrency } from '../utils/formatters';
import { calculateServiceFees, parseContractServices } from '../utils/serviceHelpers';
import type { BillItem } from '../db/database';
import dayjs from 'dayjs';

export interface BillCreateProps {
  roomIdProp?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export default function BillCreate({ roomIdProp, onClose, isModal }: BillCreateProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { rooms, fetchRooms } = useRoomStore();
  const { fetchBuildings } = useBuildingStore();
  const { getReading, getPreviousReading, saveReading } = useMeterStore();
  const { getActiveContractForRoom, fetchContracts } = useTenantStore();
  const { createBill } = useBillStore();
  const { serviceTypes } = useSettingsStore();

  const initRoomId = roomIdProp || searchParams.get('roomId') || '';
  const [roomId, setRoomId] = useState<string>(initRoomId);
  const [month, setMonth] = useState<number>(dayjs().month() + 1);
  const [year, setYear] = useState<number>(dayjs().year());
  const [dueDate, setDueDate] = useState<string>(dayjs().date(15).format('YYYY-MM-DD'));

  const [systemItems, setSystemItems] = useState<Omit<BillItem, 'id' | 'billId'>[]>([]);
  const [customItems, setCustomItems] = useState<Omit<BillItem, 'id' | 'billId'>[]>([]);
  const [contractId, setContractId] = useState<number | undefined>();
  
  const [elecOld, setElecOld] = useState<string>('0');
  const [elecNew, setElecNew] = useState<string>('0');
  const [waterOld, setWaterOld] = useState<string>('0');
  const [waterNew, setWaterNew] = useState<string>('0');
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRooms();
    fetchBuildings();
    fetchContracts();
  }, [fetchRooms, fetchBuildings, fetchContracts]);

  // Fetch contract and meter readings when room/month/year changes
  useEffect(() => {
    async function fetchBaseData() {
      if (!roomId) {
        setSystemItems([]);
        setError('');
         setElecOld('0'); setElecNew('0'); setWaterOld('0'); setWaterNew('0');
        return;
      }
      
      const rId = parseInt(roomId);
      let currentError = '';

      // 1. Get contract
      const contract = await getActiveContractForRoom(rId);
      if (!contract) {
        currentError = 'Phòng này hiện không có hợp đồng đang hiệu lực.';
        setContractId(undefined);
      } else {
        setContractId(contract.id);
      }

        // 2. Load Meter Reading
      const reading = await getReading(rId, year, month);
      if (reading) {
        setElecOld(String(reading.electricityOld));
        setElecNew(String(reading.electricityNew));
        setWaterOld(String(reading.waterOld));
        setWaterNew(String(reading.waterNew));
      } else {
        const prev = await getPreviousReading(rId, year, month);
        setElecOld(String(prev?.electricityNew || 0));
        setElecNew('');
        setWaterOld(String(prev?.waterNew || 0));
        setWaterNew('');
      }
      setError(currentError);
    }
    fetchBaseData();
  }, [roomId, month, year, getActiveContractForRoom, getReading, getPreviousReading]);

  // Recalculate system items whenever inputs change
  useEffect(() => {
    async function calculateSystemItems() {
      if (!roomId) return;
      const rId = parseInt(roomId);
      const room = rooms.find((r) => r.id === rId);
      if (!room || !contractId) {
        setSystemItems([]);
        return;
      }

      const newItems: Omit<BillItem, 'id' | 'billId'>[] = [];
      const contract = await getActiveContractForRoom(rId);
      if (!contract) return;

      // Rent
      newItems.push({
        itemType: 'rent', description: 'Tiền phòng', quantity: 1,
        unitPrice: contract.monthlyRent, amount: contract.monthlyRent,
      });

      // Services
      const services = parseContractServices(contract.servicesJson);
      const { items: svcItems } = calculateServiceFees(services, contract.numberOfTenants, serviceTypes);
      for (const svc of svcItems) {
        let t: BillItem['itemType'] = 'other';
        if (['washing', 'elevator', 'cleaning', 'wifi', 'internet', 'parking', 'garbage'].includes(svc.serviceId)) {
          t = svc.serviceId as any;
        }
        newItems.push({
          itemType: t, description: svc.label, quantity: svc.quantity,
          unitPrice: svc.unitPrice, amount: svc.amount,
        });
      }

      // Electricity
      const eNewNum = Number(elecNew) || 0;
      const eOldNum = Number(elecOld) || 0;
      const eDiff = Math.max(eNewNum - eOldNum, 0);
      newItems.push({
        itemType: 'electricity', description: `Tiền điện (${eOldNum} → ${eNewNum})`,
        quantity: eDiff, unitPrice: room.electricityRate, amount: eDiff * room.electricityRate,
      });

      // Water
      const wNewNum = Number(waterNew) || 0;
      const wOldNum = Number(waterOld) || 0;
      const wDiff = Math.max(wNewNum - wOldNum, 0);
      newItems.push({
        itemType: 'water', description: `Tiền nước (${wOldNum} → ${wNewNum})`,
        quantity: wDiff, unitPrice: room.waterRate, amount: wDiff * room.waterRate,
      });

      setSystemItems(newItems);
    }
    calculateSystemItems();
  }, [roomId, contractId, elecOld, elecNew, waterOld, waterNew, rooms, getActiveContractForRoom, serviceTypes]);

  const addCustomItem = () => {
    setCustomItems([...customItems, { itemType: 'other', description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const updateCustomItem = (index: number, field: keyof Omit<BillItem, 'id'|'billId'|'itemType'>, value: string | number) => {
    const newItems = [...customItems];
    const item = newItems[index];
    (item as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      item.amount = Number(item.quantity) * Number(item.unitPrice);
    }
    setCustomItems(newItems);
  };

  const removeCustomItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!roomId) return;
    setSaving(true);
    try {
      // Create or update meter reading directly
      await saveReading({
        roomId: parseInt(roomId),
        year,
        month,
        electricityOld: Number(elecOld),
        electricityNew: Number(elecNew),
        waterOld: Number(waterOld),
        waterNew: Number(waterNew),
      });

      // Then save the bill
      await createBill({
        roomId: parseInt(roomId),
        contractId,
        year,
        month,
        items: [...systemItems, ...customItems],
        dueDate,
      });
      if (isModal && onClose) onClose();
      else navigate('/bills');
    } catch (e: any) {
      setError(e.message || 'Lỗi khi tạo hóa đơn');
    } finally {
      setSaving(false);
    }
  };

  const allItems = [...systemItems, ...customItems];
  const totalAmount = allItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Box sx={{ position: 'relative', pb: { xs: 10, md: 4 } }}>
      {isModal && onClose && (
        <IconButton 
          onClick={onClose} 
          sx={{ position: 'absolute', top: -8, right: 0, zIndex: 10 }}
        >
          <CloseIcon />
        </IconButton>
      )}
      <PageHeader
        title="➕ Tạo hóa đơn"
        subtitle="Tính toán tiền phòng & điện nước tự động"
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Cài đặt hóa đơn</Typography>
              
              <TextField
                select
                label="Chọn phòng *"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              >
                {rooms.map((r) => (
                  <MenuItem key={r.id} value={String(r.id)}>Phòng {r.roomNumber}</MenuItem>
                ))}
              </TextField>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    select
                    label="Tháng"
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

              <TextField
                label="Ngày đến hạn"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                fullWidth
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>⚡ Ghi dòng điện nước</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField 
                    label="Số điện cũ" 
                    value={elecOld} 
                    onChange={(e) => setElecOld(e.target.value)} 
                    InputProps={{ inputComponent: NumericFormatCustom as any }}
                    size="small" 
                    fullWidth 
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField 
                    label="Số điện mới" 
                    value={elecNew} 
                    onChange={(e) => setElecNew(e.target.value)} 
                    InputProps={{ inputComponent: NumericFormatCustom as any }}
                    size="small" 
                    fullWidth 
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField 
                    label="Số nước cũ" 
                    value={waterOld} 
                    onChange={(e) => setWaterOld(e.target.value)} 
                    InputProps={{ inputComponent: NumericFormatCustom as any }}
                    size="small" 
                    fullWidth 
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField 
                    label="Số nước mới" 
                    value={waterNew} 
                    onChange={(e) => setWaterNew(e.target.value)} 
                    InputProps={{ inputComponent: NumericFormatCustom as any }}
                    size="small" 
                    fullWidth 
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">Chi tiết hóa đơn</Typography>
                <Button variant="outlined" size="small" startIcon={<AddCircleIcon />} onClick={addCustomItem}>
                  Thêm chi phí khác
                </Button>
              </Box>

              {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

              {allItems.length === 0 ? (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 4 }}>
                  Chọn phòng để xem chi tiết
                </Typography>
              ) : (
                <Box>
                  {allItems.map((item, index) => {
                    const isSystem = item.itemType !== 'other'; // Prevent editing standard items
                    const customIndex = index - systemItems.length;
                    return (
                      <Grid container spacing={2} sx={{ mb: 2, alignItems: 'center' }} key={index}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            label="Nội dung"
                            value={item.description}
                            onChange={(e) => updateCustomItem(customIndex, 'description', e.target.value)}
                            fullWidth
                            size="small"
                            disabled={isSystem}
                            sx={isSystem ? {
                              '& .MuiInputBase-input.Mui-disabled': {
                                WebkitTextFillColor: theme.palette.primary.main,
                                fontWeight: 700,
                              }
                            } : {}}
                          />
                        </Grid>
                        <Grid size={{ xs: 4, sm: 2 }}>
                          <TextField
                            label="Số lượng"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateCustomItem(customIndex, 'quantity', Number(e.target.value))}
                            fullWidth
                            size="small"
                            disabled={isSystem}
                            sx={isSystem ? {
                              '& .MuiInputBase-input.Mui-disabled': {
                                WebkitTextFillColor: theme.palette.primary.main,
                                fontWeight: 700,
                              }
                            } : {}}
                          />
                        </Grid>
                        <Grid size={{ xs: 4, sm: 3 }}>
                          <TextField
                            label="Đơn giá"
                            name={`unitPrice-${index}`}
                            value={item.unitPrice}
                            onChange={(e) => updateCustomItem(customIndex, 'unitPrice', Number(e.target.value))}
                            InputProps={{ inputComponent: NumericFormatCustom as any }}
                            fullWidth
                            size="small"
                            disabled={isSystem}
                            sx={isSystem ? {
                              '& .MuiInputBase-input.Mui-disabled': {
                                WebkitTextFillColor: theme.palette.primary.main,
                                fontWeight: 700,
                              }
                            } : {}}
                          />
                        </Grid>
                        <Grid size={{ xs: 4, sm: 2 }}>
                           <Typography variant="body1" sx={{ fontWeight: 800, textAlign: 'right', color: theme.palette.primary.main }}>
                            {formatCurrency(item.amount)}
                           </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {!isSystem && (
                            <IconButton color="error" size="small" onClick={() => removeCustomItem(customIndex)}>
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Grid>
                      </Grid>
                    );
                  })}

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Tổng cộng:</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                      {formatCurrency(totalAmount)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, mt: 4, pb: 2 }}>
                    <Button variant="outlined" sx={{ flex: 1, py: 1.5 }} onClick={() => {
                        if (isModal && onClose) onClose();
                        else navigate('/bills');
                    }}>Hủy</Button>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={saving || !roomId || allItems.length === 0}
                      startIcon={<SaveIcon />}
                      sx={{ flex: 1, py: 1.5 }}
                    >
                      {saving ? 'Đang lưu...' : 'Lưu hóa đơn'}
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
