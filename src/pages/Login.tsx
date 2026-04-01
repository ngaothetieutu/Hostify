import React, { useState } from 'react';
import { Box, Card, Typography, TextField, Button, CircularProgress, useTheme } from '@mui/material';
import { supabase } from '../db/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập Email và Mật khẩu');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    setLoading(false);
    
    if (error) {
      setErrorMsg(error.message.includes('Invalid login credentials') ? 'Tài khoản hoặc mật khẩu không chính xác' : error.message);
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
        maxWidth: 400, 
        width: '100%', 
        p: { xs: 3, md: 4 },
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, color: theme.palette.primary.main, mb: 1 }}>
            HOSTIFY
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            Phần mềm Quản lý Dãy Trọ
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
            label="Email/Tài khoản"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2.5 }}
            required
            autoCapitalize="none"
            autoCorrect="off"
          />

          <TextField
            fullWidth
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 4 }}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ py: 1.5, fontSize: '1rem', fontWeight: 700, borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'ĐĂNG NHẬP'}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
