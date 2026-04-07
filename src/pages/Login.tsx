import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, useTheme } from '@mui/material';
import BackspaceIcon from '@mui/icons-material/BackspaceOutlined';
import { supabase } from '../db/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const PIN_LENGTH = 6;

const PAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export default function Login() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [succeeded, setSucceeded] = useState(false);

  const { session } = useAuthStore();

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => { setShake(false); setPin(''); }, 600);
  };

  const handleLogin = useCallback(async (currentPin: string) => {
    if (currentPin.length < PIN_LENGTH) return;
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@hostify.local',
      password: currentPin,
    });
    setLoading(false);
    if (error) {
      setErrorMsg('Mã PIN không đúng');
      triggerShake();
    } else {
      setSucceeded(true);
      setTimeout(() => navigate('/'), 300);
    }
  }, [navigate]);

  const pressKey = (key: string) => {
    if (loading) return;
    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      setErrorMsg('');
      return;
    }
    if (!key) return;
    const next = (pin + key).slice(0, PIN_LENGTH);
    setPin(next);
    setErrorMsg('');
    if (next.length === PIN_LENGTH) {
      handleLogin(next);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') pressKey(e.key);
      if (e.key === 'Backspace') pressKey('del');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, loading]);

  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #fafafa 100%)',
      px: 2,
    }}>
      <Box sx={{
        width: '100%',
        maxWidth: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 1.5,
            boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
            fontSize: '1.6rem',
          }}>
            🏠
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: theme.palette.text.primary }}>
            Hostify
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Nhập mã PIN để đăng nhập
          </Typography>
        </Box>

        {/* PIN Dots */}
        <Box sx={{
          display: 'flex',
          gap: 1.5,
          alignItems: 'center',
          animation: shake ? 'shake 0.5s ease' : 'none',
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '20%': { transform: 'translateX(-8px)' },
            '40%': { transform: 'translateX(8px)' },
            '60%': { transform: 'translateX(-6px)' },
            '80%': { transform: 'translateX(6px)' },
          },
        }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < pin.length;
            const isError = !!errorMsg;
            return (
              <Box key={i} sx={{
                width: 14, height: 14,
                borderRadius: '50%',
                transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: filled ? 'scale(1.15)' : 'scale(1)',
                bgcolor: isError
                  ? '#ef4444'
                  : filled
                    ? succeeded ? '#10b981' : '#3b82f6'
                    : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                boxShadow: filled && !isError ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              }} />
            );
          })}
        </Box>

        {/* Error msg */}
        <Box sx={{ height: 18, textAlign: 'center' }}>
          {errorMsg && (
            <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600 }}>
              {errorMsg}
            </Typography>
          )}
        </Box>

        {/* Numpad */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1.2,
          width: '100%',
        }}>
          {PAD_KEYS.flat().map((key, idx) => {
            if (!key) return <Box key={idx} />;

            const isDel = key === 'del';

            return (
              <Box
                key={idx}
                component="button"
                onClick={() => pressKey(key)}
                disabled={loading || (!isDel && pin.length >= PIN_LENGTH)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 58,
                  borderRadius: '14px',
                  border: 'none',
                  cursor: loading ? 'default' : 'pointer',
                  bgcolor: isDark
                    ? isDel ? 'transparent' : 'rgba(255,255,255,0.06)'
                    : isDel ? 'transparent' : '#ffffff',
                  boxShadow: isDel ? 'none' : isDark
                    ? '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
                    : '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'all 0.12s ease',
                  outline: 'none',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  '&:hover:not(:disabled)': {
                    bgcolor: isDel
                      ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                      : isDark ? 'rgba(255,255,255,0.1)' : '#f8fafc',
                    transform: 'translateY(-1px)',
                    boxShadow: isDel ? 'none' : '0 4px 12px rgba(0,0,0,0.1)',
                  },
                  '&:active:not(:disabled)': {
                    transform: 'scale(0.94)',
                    boxShadow: 'none',
                  },
                  '&:disabled': { opacity: 0.4 },
                }}
              >
                {isDel ? (
                  <BackspaceIcon sx={{ fontSize: '1.3rem', color: theme.palette.text.secondary }} />
                ) : (
                  <Typography sx={{
                    fontSize: '1.35rem',
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    lineHeight: 1,
                  }}>
                    {key}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Loading indicator */}
        {loading && (
          <CircularProgress size={22} thickness={4} sx={{ color: '#3b82f6', mt: -1 }} />
        )}
      </Box>
    </Box>
  );
}
