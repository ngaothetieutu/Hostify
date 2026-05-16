/**
 * Script kiểm tra kết nối Supabase (hỗ trợ key format mới: sb_publishable_...)
 * Cách dùng: node scripts/test-connection.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = join(__dirname, '../.env');
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      vars[key.trim()] = rest.join('=').trim();
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://gdvsclzvdoenzvvdtxxl.supabase.co';
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!anonKey) {
  console.error('❌ Không tìm thấy VITE_SUPABASE_ANON_KEY trong .env');
  process.exit(1);
}

console.log(`🔍 URL     : ${SUPABASE_URL}`);
console.log(`🔑 Anon Key: ${anonKey.substring(0, 30)}... (${anonKey.length} ký tự)`);

// Chấp nhận cả format cũ (eyJ...) lẫn format mới (sb_publishable_...)
const isValidFormat = anonKey.startsWith('eyJ') || anonKey.startsWith('sb_publishable_');
if (!isValidFormat) {
  console.error('\n❌ Key không đúng format!');
  console.error('   Phải bắt đầu bằng "eyJ..." hoặc "sb_publishable_..."');
  process.exit(1);
}

console.log('\n✅ Format key hợp lệ. Đang test Auth API...\n');

// Test login với PIN sai → chỉ để kiểm tra API endpoint hoạt động
const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    'apikey': anonKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@hostify.local',
    password: '__WRONG_TEST__',
  })
});

const data = await res.json();
console.log(`📡 Auth API Status: ${res.status}`);
console.log(`   Response:`, JSON.stringify(data, null, 2));

if (res.status === 400) {
  if (data.error === 'invalid_grant' || data.error_code === 'invalid_credentials') {
    console.log('\n✅ Auth API hoạt động tốt!');
    console.log('   User admin@hostify.local TỒN TẠI nhưng cần nhập đúng PIN.');
    console.log('\n👉 Nếu quên PIN, chạy: node scripts/check-auth.mjs <SECRET_KEY>');
  } else if (data.error_code === 'user_not_found' || data.message?.includes('not found')) {
    console.log('\n⚠️  Auth API OK nhưng user "admin@hostify.local" CHƯA TỒN TẠI!');
    console.log('   Chạy ngay: node scripts/check-auth.mjs <SECRET_KEY>');
  } else {
    console.log('\nℹ️  Response không xác định, kiểm tra chi tiết ở trên.');
  }
} else if (res.status === 401 || res.status === 403) {
  console.error('\n❌ Anon key bị từ chối (401/403) → Key không hợp lệ hoặc project bị suspend!');
} else if (res.status === 422) {
  console.log('\n⚠️  Validation error — kiểm tra định dạng email hoặc Supabase config.');
} else {
  console.log('\nℹ️  Status không mong đợi, xem response ở trên để debug.');
}
