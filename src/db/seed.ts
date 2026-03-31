import { supabase } from './supabaseClient';
import { DEFAULT_ELECTRICITY_RATE, DEFAULT_WATER_RATE } from '../utils/constants';

/**
 * Seed dữ liệu mẫu: 1 tòa nhà 6 tầng
 * - Tầng 1: 102, 103 (2 phòng)
 * - Tầng 2: 201, 202, 203 (3 phòng)
 * - Tầng 3: 301, 302, 303 (3 phòng)
 * - Tầng 4: 401, 402, 403 (3 phòng)
 * - Tầng 5: 501, 502, 503 (3 phòng)
 * - Tầng 6: 601 (1 phòng)
 * Tổng: 15 phòng
 */
export async function seedSampleData(): Promise<{ buildingCount: number; roomCount: number; tenantCount: number }> {
  // Clear existing data (cascade order: child → parent)
  await supabase.from('payments').delete().neq('id', 0);
  await supabase.from('billItems').delete().neq('id', 0);
  await supabase.from('bills').delete().neq('id', 0);
  await supabase.from('meterReadings').delete().neq('id', 0);
  await supabase.from('contracts').delete().neq('id', 0);
  await supabase.from('rooms').delete().neq('id', 0);
  await supabase.from('tenants').delete().neq('id', 0);
  await supabase.from('buildings').delete().neq('id', 0);

  // Create building
  const { data: building, error: bErr } = await supabase
    .from('buildings')
    .insert([{
      name: 'Nhà trọ Cô Hợi',
      address: 'Số nhà 2, Ngõ 94, đường Di Ái, thôn Dền, xã Hoài Đức, Tp Hà Nội',
      totalFloors: 6,
      settingsJson: '{}',
    }])
    .select()
    .single();
  if (bErr || !building) throw bErr;

  const buildingId = building.id;

  // Room definitions per floor
  const floorRooms: Record<number, string[]> = {
    1: ['102', '103'],
    2: ['201', '202', '203'],
    3: ['301', '302', '303'],
    4: ['401', '402', '403'],
    5: ['501', '502', '503'],
    6: ['601'],
  };

  // Base rents by floor
  const floorRents: Record<number, number> = {
    1: 2500000,
    2: 2800000,
    3: 2800000,
    4: 3000000,
    5: 3000000,
    6: 3200000,
  };

  // Area per room
  const getRoomArea = (roomNumber: string): number => {
    if (roomNumber === '103') return 20;
    if (['201', '301', '401', '501'].includes(roomNumber)) return 25;
    return 30;
  };

  const roomsPayload = [];
  for (const [floor, roomNumbers] of Object.entries(floorRooms)) {
    const floorNum = parseInt(floor);
    for (const roomNumber of roomNumbers) {
      roomsPayload.push({
        buildingId,
        floorNumber: floorNum,
        roomNumber,
        areaM2: getRoomArea(roomNumber),
        baseRent: floorRents[floorNum] ?? 2800000,
        electricityRate: DEFAULT_ELECTRICITY_RATE,
        waterRate: DEFAULT_WATER_RATE,
        status: 'vacant',
        amenitiesJson: '[]',
      });
    }
  }

  const { data: rooms, error: rErr } = await supabase.from('rooms').insert(roomsPayload).select();
  if (rErr) throw rErr;

  // Sample Tenants
  const { data: tenants, error: tErr } = await supabase.from('tenants').insert([
    { fullName: 'Nguyen Van An', phone: '0901234567', idCardNumber: '079201001234', status: 'active' },
    { fullName: 'Tran Thi Bao', phone: '0912345678', idCardNumber: '079202005678', status: 'active' },
    { fullName: 'Le Van Cuong', phone: '0923456789', idCardNumber: '079203009012', status: 'active' },
  ]).select();
  if (tErr) throw tErr;

  return { buildingCount: 1, roomCount: rooms?.length ?? 0, tenantCount: tenants?.length ?? 0 };
}
