/**
 * Script: Nhập chỉ số điện nước T3/2026 + giá thuê → Tạo hóa đơn
 * Chạy: node docs/reset_bills_march2026.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gdvsclzvdoenzvvdtxxl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5LeDazaDb8t-1OPr9UcaLQ_ASbLWB_y';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const YEAR = 2026;
const MONTH = 3;
const DUE_DATE = '2026-04-15';

// Dữ liệu do chủ nhà cung cấp (tien_nha đơn vị nghìn đồng → × 1000)
const INPUT_DATA = [
  { room: '102', tien_nha: 2300000, dien: { so_dau: 1552, so_cuoi: 1702 }, nuoc: { so_dau: 352, so_cuoi: 355 } },
  { room: '103', tien_nha: 2700000, dien: { so_dau: 1485, so_cuoi: 1588 }, nuoc: { so_dau: 734, so_cuoi: 744 } },
  { room: '201', tien_nha: 2500000, dien: { so_dau: 948,  so_cuoi: 1055 }, nuoc: { so_dau: 41,  so_cuoi: 46  } },
  { room: '202', tien_nha: 3000000, dien: { so_dau: 1795, so_cuoi: 1922 }, nuoc: { so_dau: 44,  so_cuoi: 48  } },
  { room: '203', tien_nha: 2500000, dien: { so_dau: 1142, so_cuoi: 1245 }, nuoc: { so_dau: 30,  so_cuoi: 33  } },
  { room: '301', tien_nha: 2500000, dien: { so_dau: 843,  so_cuoi: 912  }, nuoc: { so_dau: 41,  so_cuoi: 44  } },
  { room: '302', tien_nha: 2800000, dien: { so_dau: 1863, so_cuoi: 1947 }, nuoc: { so_dau: 90,  so_cuoi: 96  } },
  { room: '303', tien_nha: 3000000, dien: { so_dau: 3549, so_cuoi: 3771 }, nuoc: { so_dau: 73,  so_cuoi: 83  } },
  { room: '401', tien_nha: 2500000, dien: { so_dau: 1907, so_cuoi: 2044 }, nuoc: { so_dau: 34,  so_cuoi: 37  } },
  { room: '402', tien_nha: 2700000, dien: { so_dau: 1194, so_cuoi: 1311 }, nuoc: { so_dau: 27,  so_cuoi: 31  } },
  { room: '403', tien_nha: 2500000, dien: { so_dau: 738,  so_cuoi: 814  }, nuoc: { so_dau: 24,  so_cuoi: 26  } },
  { room: '501', tien_nha: 2500000, dien: { so_dau: 1594, so_cuoi: 1716 }, nuoc: { so_dau: 60,  so_cuoi: 65  } },
  { room: '502', tien_nha: 2800000, dien: { so_dau: 677,  so_cuoi: 808  }, nuoc: { so_dau: 21,  so_cuoi: 26  } },
  { room: '503', tien_nha: 2800000, dien: { so_dau: 1421, so_cuoi: 1529 }, nuoc: { so_dau: 37,  so_cuoi: 40  } },
  { room: '601', tien_nha: 2800000, dien: { so_dau: 4,    so_cuoi: 4    }, nuoc: { so_dau: 272, so_cuoi: 272 } },
];

const DEFAULT_SERVICE_TYPES = [
  { id: 'washing',  label: 'Máy giặt',  unit: 'person' },
  { id: 'elevator', label: 'Thang máy', unit: 'person' },
  { id: 'cleaning', label: 'Vệ sinh',   unit: 'person' },
  { id: 'wifi',     label: 'Wifi',       unit: 'room'   },
];
const SVC_TYPE_MAP = { washing: 'washing', elevator: 'elevator', cleaning: 'cleaning', wifi: 'wifi' };

// ─── Bước 1: Xóa hóa đơn cũ ─────────────────────────────────────────────────
async function clearBills() {
  console.log('🗑️  Xóa toàn bộ hóa đơn cũ...');
  await supabase.from('receiptAllocations').delete().neq('id', 0);
  await supabase.from('receipts').delete().neq('id', 0);
  const { error: e1 } = await supabase.from('billItems').delete().neq('id', 0);
  if (e1) throw new Error('billItems: ' + e1.message);
  const { error: e2 } = await supabase.from('bills').delete().neq('id', 0);
  if (e2) throw new Error('bills: ' + e2.message);
  console.log('  ✅ Xong\n');
}

// ─── Bước 2: Lấy phòng + hợp đồng ───────────────────────────────────────────
async function fetchData() {
  const { data: rooms, error: rErr } = await supabase.from('rooms').select('*');
  if (rErr) throw rErr;
  const { data: contracts, error: cErr } = await supabase.from('contracts').select('*').eq('status', 'active');
  if (cErr) throw cErr;
  console.log(`📦 ${rooms.length} phòng, ${contracts.length} hợp đồng active\n`);
  return { rooms, contracts };
}

// ─── Bước 3: Upsert meter readings T3/2026 ───────────────────────────────────
async function upsertMeters(rooms) {
  console.log(`⚡ Nhập chỉ số điện nước T${MONTH}/${YEAR}...`);

  // Xóa meter readings T3 cũ nếu có
  await supabase.from('meterReadings').delete().eq('year', YEAR).eq('month', MONTH);

  const meterPayload = [];
  for (const entry of INPUT_DATA) {
    const room = rooms.find(r => r.roomNumber === entry.room);
    if (!room) { console.warn(`  [warn] Phòng ${entry.room} không tìm thấy`); continue; }
    meterPayload.push({
      roomId: room.id,
      year: YEAR,
      month: MONTH,
      electricityOld: entry.dien.so_dau,
      electricityNew: entry.dien.so_cuoi,
      waterOld: entry.nuoc.so_dau,
      waterNew: entry.nuoc.so_cuoi,
    });
  }

  const { error: mErr } = await supabase.from('meterReadings').insert(meterPayload);
  if (mErr) throw new Error('meterReadings: ' + mErr.message);
  console.log(`  ✅ Đã nhập ${meterPayload.length} chỉ số điện nước\n`);
}

// ─── Bước 4: Tạo hóa đơn ─────────────────────────────────────────────────────
async function generateBills(rooms, contracts) {
  console.log(`💰 Tạo hóa đơn tháng ${MONTH}/${YEAR}:\n`);
  console.log(`  ${'Phòng'.padEnd(6)} ${'Tiền phòng'.padEnd(14)} ${'Điện'.padEnd(14)} ${'Nước'.padEnd(12)} ${'Dịch vụ'.padEnd(12)} ${'TỔNG'}`);
  console.log(`  ${'-'.repeat(72)}`);

  let created = 0, skipped = 0;

  for (const entry of INPUT_DATA) {
    const room = rooms.find(r => r.roomNumber === entry.room);
    if (!room) { console.warn(`  Phòng ${entry.room}: không tìm thấy trong DB`); skipped++; continue; }

    const contract = contracts.find(c => c.roomId === room.id);
    if (!contract) {
      console.warn(`  Phòng ${entry.room}: không có hợp đồng active → bỏ qua`);
      skipped++;
      continue;
    }

    const items = [];

    // Tiền phòng (dùng tien_nha từ input, không phải contract.monthlyRent cũ)
    const rent = entry.tien_nha;
    items.push({ itemType: 'rent', description: 'Tiền phòng', quantity: 1, unitPrice: rent, amount: rent });

    // Dịch vụ từ hợp đồng
    let svcTotal = 0;
    let services = [];
    try { services = JSON.parse(contract.servicesJson || '[]'); } catch {}
    for (const svc of services) {
      if (!svc.enabled) continue;
      const def = DEFAULT_SERVICE_TYPES.find(s => s.id === svc.serviceId);
      if (!def) continue;
      const qty = def.unit === 'person' ? (contract.numberOfTenants || 1) : 1;
      const amount = svc.price * qty;
      svcTotal += amount;
      items.push({ itemType: SVC_TYPE_MAP[svc.serviceId] || 'other', description: def.label, quantity: qty, unitPrice: svc.price, amount });
    }

    // Điện
    const eDiff = Math.max(0, entry.dien.so_cuoi - entry.dien.so_dau);
    const eAmount = eDiff * room.electricityRate;
    items.push({ itemType: 'electricity', description: `Tiền điện (${entry.dien.so_dau} → ${entry.dien.so_cuoi})`, quantity: eDiff, unitPrice: room.electricityRate, amount: eAmount });

    // Nước
    const wDiff = Math.max(0, entry.nuoc.so_cuoi - entry.nuoc.so_dau);
    const wAmount = wDiff * room.waterRate;
    items.push({ itemType: 'water', description: `Tiền nước (${entry.nuoc.so_dau} → ${entry.nuoc.so_cuoi})`, quantity: wDiff, unitPrice: room.waterRate, amount: wAmount });

    const totalAmount = items.reduce((s, i) => s + i.amount, 0);

    // Insert bill
    const { data: newBill, error: bErr } = await supabase.from('bills').insert([{
      roomId: room.id, contractId: contract.id, year: YEAR, month: MONTH,
      totalAmount, status: 'unpaid', dueDate: DUE_DATE,
    }]).select().single();
    if (bErr) { console.error(`  ❌ Phòng ${entry.room}: ${bErr.message}`); skipped++; continue; }

    const { error: iErr } = await supabase.from('billItems').insert(items.map(i => ({ ...i, billId: newBill.id })));
    if (iErr) { console.error(`  ❌ billItems ${entry.room}: ${iErr.message}`); skipped++; continue; }

    const fmt = n => String(Math.round(n/1000)) + 'k';
    console.log(`  ${entry.room.padEnd(6)} ${fmt(rent).padEnd(14)} ${fmt(eAmount).padEnd(14)} ${fmt(wAmount).padEnd(12)} ${fmt(svcTotal).padEnd(12)} ${fmt(totalAmount)}`);
    created++;
  }

  return { created, skipped };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  🏠 Hostify — Reset & Tạo hóa đơn tháng ${MONTH}/${YEAR}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  try {
    await clearBills();
    const { rooms, contracts } = await fetchData();
    await upsertMeters(rooms);
    const { created, skipped } = await generateBills(rooms, contracts);
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ✅ Hoàn thành: ${created} hóa đơn tháng ${MONTH}/${YEAR} đã tạo`);
    if (skipped > 0) console.log(`  ⚠️  ${skipped} phòng bỏ qua (không có HĐ active)`);
    console.log(`${'═'.repeat(60)}\n`);
  } catch (err) {
    console.error('\n❌ Lỗi:', err.message || err);
    process.exit(1);
  }
}

main();
