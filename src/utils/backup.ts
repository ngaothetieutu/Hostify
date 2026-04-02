import { supabase } from '../db/supabaseClient';
import dayjs from 'dayjs';

export interface BackupData {
  version: string;
  exportedAt: string;
  appName: string;
  data: {
    buildings: any[];
    rooms: any[];
    tenants: any[];
    contracts: any[];
    meterReadings: any[];
    bills: any[];
    billItems: any[];
    payments: any[];
  };
}

export async function exportAllData(): Promise<BackupData> {
  const [b, r, t, c, m, bi, bIt, p] = await Promise.all([
    supabase.from('buildings').select('*'),
    supabase.from('rooms').select('*'),
    supabase.from('tenants').select('*'),
    supabase.from('contracts').select('*'),
    supabase.from('meterReadings').select('*'),
    supabase.from('billItems').select('*'),
    supabase.from('receipts').select('*'),
    supabase.from('receiptAllocations').select('*')
  ]);

  return {
    version: '3.0.0', // Supabase version
    exportedAt: dayjs().toISOString(),
    appName: 'Hostify',
    data: {
      buildings: b.data || [],
      rooms: r.data || [],
      tenants: t.data || [],
      contracts: c.data || [],
      meterReadings: m.data || [],
      bills: bi.data || [],
      billItems: bIt.data || [],
      payments: p.data || [],
    },
  };
}

export async function downloadBackup(): Promise<{ filename: string; size: number; recordsCount: number; dataStr: string }> {
  const backup = await exportAllData();
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const filename = `hostify_backup_${dayjs().format('YYYY-MM-DD_HHmmss')}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const recordsCount = Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0);

  return { filename, size: blob.size, recordsCount, dataStr: jsonStr };
}

export async function importBackup(file: File): Promise<{ recordsCount: number }> {
  const text = await file.text();
  let backup: BackupData;

  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('File không hợp lệ. Vui lòng chọn file JSON backup từ Hostify.');
  }

  if (!backup.version || !backup.data || !backup.appName) {
    throw new Error('Định dạng backup không hợp lệ. Vui lòng chọn file backup đúng.');
  }

  // Khôi phục: Cascade xóa ngược từ con lên cha
  await supabase.from('payments').delete().neq('id', 0);
  await supabase.from('billItems').delete().neq('id', 0);
  await supabase.from('bills').delete().neq('id', 0);
  await supabase.from('meterReadings').delete().neq('id', 0);
  await supabase.from('contracts').delete().neq('id', 0);
  await supabase.from('rooms').delete().neq('id', 0);
  await supabase.from('tenants').delete().neq('id', 0);
  await supabase.from('buildings').delete().neq('id', 0);

  const d = backup.data;

  // Insert theo đúng thứ tự (cha -> con)
  if (d.buildings?.length) await supabase.from('buildings').insert(d.buildings);
  if (d.rooms?.length) await supabase.from('rooms').insert(d.rooms);
  if (d.tenants?.length) await supabase.from('tenants').insert(d.tenants);
  if (d.contracts?.length) await supabase.from('contracts').insert(d.contracts);
  if (d.meterReadings?.length) await supabase.from('meterReadings').insert(d.meterReadings);
  if (d.bills?.length) await supabase.from('bills').insert(d.bills);
  if (d.billItems?.length) await supabase.from('billItems').insert(d.billItems);
  if (d.payments?.length) await supabase.from('payments').insert(d.payments);

  const recordsCount = Object.values(d).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  return { recordsCount };
}

export async function exportToCSV(): Promise<{ filename: string }> {
  const data = await exportAllData();
  const sheets: Record<string, any[]> = data.data;
  let csvContent = '';

  for (const [tableName, rows] of Object.entries(sheets)) {
    if (!rows.length) continue;

    csvContent += `\n=== ${tableName.toUpperCase()} ===\n`;
    const headers = Object.keys(rows[0]);
    csvContent += headers.join(',') + '\n';
    for (const row of rows) {
      const values = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvContent += values.join(',') + '\n';
    }
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const filename = `hostify_export_${dayjs().format('YYYY-MM-DD_HHmmss')}.csv`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filename };
}

export async function getDbStats(): Promise<Record<string, number>> {
  const getCount = async (table: string) => {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    return count || 0;
  };

  const [buildings, rooms, tenants, contracts, meterReadings, bills, billItems, payments] =
    await Promise.all([
      getCount('buildings'),
      getCount('rooms'),
      getCount('tenants'),
      getCount('contracts'),
      getCount('meterReadings'),
      getCount('bills'),
      getCount('billItems'),
      getCount('payments'),
    ]);

  return { buildings, rooms, tenants, contracts, meterReadings, bills, billItems, payments };
}
