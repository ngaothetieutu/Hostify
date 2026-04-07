import { supabase } from './supabaseClient';
import { DEFAULT_ELECTRICITY_RATE, DEFAULT_WATER_RATE } from '../utils/constants';
import { DEFAULT_SERVICE_TYPES } from '../stores/settingsStore';
import { getDefaultContractServices } from '../utils/serviceHelpers';

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

  // Cấu hình phòng (đã thêm phòng 101 theo dữ liệu người thuê lúc trước không có)
  const floorRooms: Record<number, string[]> = {
    1: ['101', '102', '103'],
    2: ['201', '202', '203'],
    3: ['301', '302', '303'],
    4: ['401', '402', '403'],
    5: ['501', '502', '503'],
    6: ['601'],
  };

  const floorRents: Record<number, number> = {
    1: 2500000,
    2: 2800000,
    3: 2800000,
    4: 3000000,
    5: 3000000,
    6: 3200000,
  };

  const getRoomArea = (roomNumber: string): number => {
    if (['101', '103'].includes(roomNumber)) return 20;
    if (['201', '301', '401', '501'].includes(roomNumber)) return 25;
    return 30;
  };

  // Khởi tạo phòng
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
  if (rErr || !rooms) throw rErr;

  // Dữ liệu người trọ thực tế từ file Excel
  const excelTenants = [
    { num: '503', fullName: 'Bùi Văn Duy', cccd: '1205055370', phone: '362941462', address: 'xóm 6, đoan nữ, an mỹ, mỹ đức, hà nội', parentName: 'Bùi Văn Phu', parentPhone: '948375430' },
    { num: '502', fullName: 'Trần Đình An', cccd: '40205004456', phone: '944148251', address: 'Diễn Hoàng, Diễn Châu, Nghệ An', parentName: 'Phạm Thị Luận', parentPhone: '865970140' },
    { num: '501', fullName: 'Đỗ Thị Huyền Trang', cccd: '24302004222', phone: '379402038', address: 'thị trấn kép, lạng giang bắc giang', parentName: 'Đỗ Thanh Hưởng', parentPhone: '332607965' },
    { num: '501', fullName: 'Nguyễn Đức Thưởng', cccd: '24099011091', phone: '326150799', address: 'chính ngoài, quang tiến, tân yên bắc giang', parentName: 'Ngô Thị Chung', parentPhone: '372421283' },
    { num: '403', fullName: 'Đỗ Thị Hằng', cccd: '98193005939', phone: '344274914', address: 'ngọc phụng, thường xuân, thanh hóa', parentName: 'Trịnh Thị Thủy', parentPhone: '397560048' },
    { num: '402', fullName: 'Vũ Xuân Quyết', cccd: '24205000150', phone: '325884535', address: 'Hùng Dũng - Hưng Hà - Thái Bình', parentName: 'Vũ Quang Chung', parentPhone: '984059034' },
    { num: '402', fullName: 'Nguyễn Minh Hằng', cccd: '34305006264', phone: '877708462', address: 'An Khoái- Thống Nhất -Hưng Hà- Thái Bình', parentName: 'Nguyễn Thị Nhàn', parentPhone: '984147081' },
    { num: '401', fullName: 'Dương Tuấn An', cccd: '14204001566', phone: '865242713', address: 'Tổ 3 Chiềng Sinh, Tp Sơn La, Sơn La', parentName: 'Dương Ngọc Sơn', parentPhone: '915325233' },
    { num: '401', fullName: 'Dương Thủy Tiên', cccd: '14197000634', phone: '942085217', address: 'Tổ 3 Chiềng Sinh, Tp Sơn La, Sơn La', parentName: 'Dương Ngọc Sơn', parentPhone: '915325233' },
    { num: '303', fullName: 'Nguyễn Hữu Sơn', cccd: '002204000363', phone: '0382872787', address: 'Tổ 4, TT Vinh Quang, Hoàng Su Phì, Hà Giang', parentName: 'Phạm Thi Oanh', parentPhone: '0353946463' },
    { num: '303', fullName: 'Hoàng Nhất Quân', cccd: '002204000373', phone: '0339375204', address: 'Bản Máy,Tuyên Quang', parentName: 'Hoàng Minh Long', parentPhone: '0976075600' },
    { num: '301', fullName: 'Phạm Ngọc Thảo Vy', cccd: '037199006267', phone: '0353543217', address: 'Yên Nhân, Yên Mô, Ninh Bình', parentName: 'Ninh Thị Thúy', parentPhone: '0353745654' },
    { num: '202', fullName: 'Nguyễn Thị Diệp', cccd: '36304004457', phone: '387558804', address: 'Tổ Dân Phố 5, Nam Trực, Ninh Bình', parentName: 'Nguyễn Văn Lâm', parentPhone: '378099051' },
    { num: '202', fullName: 'Nguyễn Đình Duy', cccd: '37204002410', phone: '828357586', address: 'Gia Hưng, Gia Viễn, Ninh Bỉnh', parentName: 'Trần Thị The', parentPhone: '345761500' },
    { num: '103', fullName: 'Trần Lê Khôi', cccd: '40205004479', phone: '888567437', address: 'Diễn Yên, Diễn Châu, Nghệ An', parentName: 'Lê Thị Hương Giang', parentPhone: '987578984' },
    { num: '103', fullName: 'Đậu Vũ Công', cccd: '40205008856', phone: '857661248', address: 'Diễn Mỹ, Diễn Châu, Nghệ An', parentName: 'Vũ Thị Thu Hương', parentPhone: '917101802' },
    { num: '102', fullName: 'Nguyễn huy hoàng', cccd: '34201008813', phone: '984882150', address: 'Quỳnh Ngọc , Quỳnh Phụ , Thái Bình', parentName: 'Nguyễn Văn Thăng', parentPhone: '038 5714614' },
    { num: '102', fullName: 'Nguyễn anh thư', cccd: '34301004924', phone: '987890799', address: 'Văn Cẩm , Hưng Hà , Thái Bình', parentName: 'Nguyễn Văn Thăng', parentPhone: '038 5714614' },
    { num: '101', fullName: 'Nguyễn Thị Hợi', cccd: '111111', phone: '11111', address: 'só nhà 2 ngõ 94' },
    { num: '101', fullName: 'Phạm Anh Tuấn', cccd: '25201003415', phone: '984937808', address: 'Nông Trang, Phú Thọ', parentName: 'Nguyễn Thị Loan', parentPhone: '366814597' },
    { num: '101', fullName: 'Nguyễn Hoài Thương', cccd: '17301004785', phone: '987254328', address: 'Thôn Lão Nội, An Nghĩa, Phú Thọ', parentName: 'Nguyễn Văn Nguyến', parentPhone: '382174790' },
    { num: '101', fullName: 'Phạm Quang Dũng', cccd: '25206012625', phone: '963645606', address: 'Nông Trang, Phú Thọ', parentName: 'Hoàng Thị Thu Hiền', parentPhone: '968352617' },
    { num: '502', fullName: 'Trần Hải Đăng', cccd: '17206000917', phone: '838464724', address: 'Khu An Phương, Xã Tân Lạc, Tỉnh Phú Thọ', parentName: 'Trần Thị Minh', parentPhone: '394173420' }
  ];

  const tenantsPayload = excelTenants.map(t => ({
    fullName: t.fullName,
    idCardNumber: t.cccd || '-',
    phone: t.phone || '-',
    permanentAddress: t.address || '',
    emergencyContactName: t.parentName || '',
    emergencyContactPhone: t.parentPhone || '',
    status: 'active'
  }));

  const { data: tenants, error: tErr } = await supabase.from('tenants').insert(tenantsPayload).select();
  if (tErr || !tenants) throw tErr;

  // Gom người trọ theo phòng
  const tenantsByRoom: Record<string, number[]> = {};
  excelTenants.forEach((t, i) => {
    const rNum = t.num;
    if (!tenantsByRoom[rNum]) tenantsByRoom[rNum] = [];
    tenantsByRoom[rNum].push(tenants[i].id);
  });

  const contractsPayload = [];
  const occupiedRoomIds = [];

  for (const [rNum, tenantIds] of Object.entries(tenantsByRoom)) {
    const room = rooms.find(r => r.roomNumber === rNum);
    if (!room || tenantIds.length === 0) continue;

    occupiedRoomIds.push(room.id);
    contractsPayload.push({
      roomId: room.id,
      tenantId: tenantIds[0],
      coTenantIds: tenantIds.slice(1),
      startDate: '2026-04-01',
      monthlyRent: room.baseRent,
      deposit: room.baseRent,
      numberOfTenants: tenantIds.length,
      servicesJson: JSON.stringify(getDefaultContractServices(DEFAULT_SERVICE_TYPES)),
      status: 'active'
    });
  }

  if (contractsPayload.length > 0) {
    const { error: cErr } = await supabase.from('contracts').insert(contractsPayload);
    if (cErr) throw cErr;

    // Cập nhật trạng thái phòng thành đã có khách
    await supabase.from('rooms').update({ status: 'occupied' }).in('id', occupiedRoomIds);
  }

  return { buildingCount: 1, roomCount: rooms.length, tenantCount: tenants.length };
}
