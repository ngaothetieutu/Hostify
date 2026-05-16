import { create } from 'zustand';
import { supabase } from '../db/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  initializeAuth: () => void;
  signOut: () => Promise<void>;
}

/**
 * Xóa sạch token/session cũ khỏi localStorage khi không còn hợp lệ.
 * Tránh trường hợp app giữ token chết → kẹt ở trạng thái "đang kết nối".
 */
function clearStaleAuthData() {
  // Supabase lưu auth dưới key có pattern: sb-<ref>-auth-token
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('supabase') && key.includes('auth')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true, // Initially true until we verify session

  initializeAuth: () => {
    // 1. Lấy session hiện tại từ localStorage
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn('Lỗi lấy session:', error.message);
        // Session cũ hỏng → xóa sạch, redirect về login
        clearStaleAuthData();
        set({ session: null, user: null, isLoading: false });
        return;
      }

      if (session) {
        // Có session trong localStorage → kiểm tra còn sống không
        // bằng cách thử lấy user mới nhất từ server
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          // Token hết hạn hoặc bị revoke → xóa session cũ
          console.warn('Session hết hạn, cần đăng nhập lại:', userError?.message);
          clearStaleAuthData();
          await supabase.auth.signOut({ scope: 'local' }); // chỉ xóa local, không gọi server
          set({ session: null, user: null, isLoading: false });
          return;
        }

        // Session hợp lệ
        set({ session, user, isLoading: false });
      } else {
        // Không có session → chưa login
        set({ session: null, user: null, isLoading: false });
      }
    });

    // 2. Lắng nghe mọi thay đổi auth (Login, Logout, Token Refresh, v.v.)
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        // Bị sign out hoặc refresh token fail
        clearStaleAuthData();
        set({ session: null, user: null });
        return;
      }

      set({ session, user: session?.user || null });
    });
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    clearStaleAuthData();
    set({ user: null, session: null, isLoading: false });
  }
}));
