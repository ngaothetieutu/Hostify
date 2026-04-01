import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function ProtectedRoute() {
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">Đang kết nối...</Typography>
      </Box>
    );
  }

  if (!session) {
    // Redirect to login if unauthenticated
    return <Navigate to="/login" replace />;
  }

  // Render the protected component layout
  return <Outlet />;
}
