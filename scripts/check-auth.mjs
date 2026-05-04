/**
 * Script kiểm tra và reset mật khẩu user admin@hostify.local trên Supabase
 * 
 * Cách dùng:
 *   1. Lấy service_role key từ: https://supabase.com/dashboard/project/gdvsclzvdoenzvvdtxxl/settings/api
 *   2. Chạy: node scripts/check-auth.mjs <SERVICE_ROLE_KEY>
 *      Hoặc set biến: $env:SUPABASE_SERVICE_KEY="<key>" rồi chạy
 */

const SUPABASE_URL = 'https://gdvsclzvdoenzvvdtxxl.supabase.co';
const ADMIN_EMAIL = 'admin@hostify.local';
const NEW_PASSWORD = '111071';

// Lấy service key từ argument hoặc env
const serviceKey = process.argv[2] || process.env.SUPABASE_SERVICE_KEY;

if (!serviceKey) {
  console.error('❌ Thiếu service_role key!');
  console.error('');
  console.error('Cách lấy key:');
  console.error('  1. Mở: https://supabase.com/dashboard/project/gdvsclzvdoenzvvdtxxl/settings/api');
  console.error('  2. Tìm mục "service_role" (Secret) → Copy');
  console.error('  3. Chạy lại: node scripts/check-auth.mjs <SERVICE_ROLE_KEY>');
  process.exit(1);
}

async function main() {
  console.log(`🔍 Kết nối đến: ${SUPABASE_URL}`);

  // 1. Liệt kê users để tìm admin@hostify.local
  console.log('\n📋 Đang tìm user...');
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    },
  });

  if (!listRes.ok) {
    const err = await listRes.text();
    console.error('❌ Không thể lấy danh sách users:', err);
    process.exit(1);
  }

  const listData = await listRes.json();
  const users = listData.users || [];
  const adminUser = users.find(u => u.email === ADMIN_EMAIL);

  if (!adminUser) {
    console.log(`⚠️  User "${ADMIN_EMAIL}" không tồn tại! Đang tạo mới...`);
    
    // Tạo user mới
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: NEW_PASSWORD,
        email_confirm: true,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('❌ Không thể tạo user:', err);
      process.exit(1);
    }

    const newUser = await createRes.json();
    console.log(`✅ Đã tạo user mới: ${newUser.email} (id: ${newUser.id})`);
    console.log(`   - Confirmed: ${newUser.email_confirmed_at ? '✅' : '❌'}`);
    console.log(`\n🎉 Mật khẩu đã được đặt thành: ${NEW_PASSWORD}`);
    return;
  }

  // User tồn tại, hiển thị thông tin
  console.log(`✅ Tìm thấy user: ${adminUser.email}`);
  console.log(`   - ID: ${adminUser.id}`);
  console.log(`   - Confirmed: ${adminUser.email_confirmed_at ? '✅ ' + adminUser.email_confirmed_at : '❌ Chưa confirm!'}`);
  console.log(`   - Tạo lúc: ${adminUser.created_at}`);
  console.log(`   - Đăng nhập cuối: ${adminUser.last_sign_in_at || 'Chưa từng'}`);

  // 2. Reset mật khẩu
  console.log(`\n🔑 Đang reset mật khẩu về "${NEW_PASSWORD}"...`);
  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${adminUser.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password: NEW_PASSWORD,
      email_confirm: true,  // Đảm bảo email đã được confirm
    }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    console.error('❌ Không thể reset mật khẩu:', err);
    process.exit(1);
  }

  const updated = await updateRes.json();
  console.log(`✅ Đã reset mật khẩu thành công!`);
  console.log(`   - Email: ${updated.email}`);
  console.log(`   - Confirmed: ${updated.email_confirmed_at ? '✅' : '❌'}`);
  console.log(`\n🎉 Bạn có thể đăng nhập với PIN: ${NEW_PASSWORD}`);
}

main().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
