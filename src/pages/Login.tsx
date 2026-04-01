import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, TextField, Button, CircularProgress, useTheme } from '@mui/material';
import { supabase } from '../db/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LockIcon from '@mui/icons-material/Lock';

export default function Login() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { session } = useAuthStore();

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 6) {
      setErrorMsg('Vui lòng nhập đủ mã PIN 6 số');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    
    // Sử dụng email cố định nội bộ, map với mật khẩu là mã PIN
    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@hostify.local',
      password: pin, // Mật khẩu người dùng tạo trên Supabase chỉ gồm 6 số
    });
    
    setLoading(false);
    
    if (error) {
      setErrorMsg('Mã PIN không chính xác!');
    } else {
      navigate('/');
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: theme.palette.background.default,
      px: 2
    }}>
      <Card sx={{ 
        maxWidth: 360, 
        width: '100%', 
        p: { xs: 4, md: 5 },
        borderRadius: 4,
        boxShadow: '0 12px 40px rgba(0,0,0,0.12)'
      }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Box sx={{ 
            width: 64, height: 64, bgcolor: `${theme.palette.primary.main}14`, 
            color: theme.palette.primary.main, borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            mx: 'auto', mb: 2 
          }}>
            <LockIcon fontSize="large" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: theme.palette.text.primary, mb: 1 }}>
            Mở khóa Hostify
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            Nhập mã PIN của bạn để tiếp tục
          </Typography>
        </Box>

        <form onSubmit={handleLogin}>
          {errorMsg && (
            <Box sx={{ p: 1.5, mb: 3, bgcolor: '#fef2f2', color: '#ef4444', borderRadius: 1.5, fontSize: '0.875rem', fontWeight: 600, textAlign: 'center' }}>
              {errorMsg}
            </Box>
          )}

          <TextField
            fullWidth
            placeholder="••••••"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPin(val);
              setErrorMsg('');
            }}
            sx={{ 
              mb: 4, 
              '& input': { 
                textAlign: 'center', 
                fontSize: '2rem', 
                letterSpacing: pin.length > 0 ? '0.5em' : 'normal', 
                fontWeight: 900,
                py: 2
              }
            }}
            required
            autoFocus
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || pin.length < 6}
            sx={{ py: 1.8, fontSize: '1rem', fontWeight: 800, borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'VÀO TRANG QUẢN TRỊ'}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
