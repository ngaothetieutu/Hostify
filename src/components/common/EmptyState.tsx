import { Box, Typography, useTheme } from '@mui/material';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
      }}
    >
      <Box
        sx={{
          fontSize: '3.5rem',
          mb: 2,
          opacity: 0.8,
          animation: 'float 3s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-8px)' },
          },
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="h6"
        sx={{ color: theme.palette.text.secondary, fontWeight: 600, mb: 0.5, textAlign: 'center' }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.secondary, opacity: 0.7, textAlign: 'center' }}
        >
          {subtitle}
        </Typography>
      )}
      {action && <Box sx={{ mt: 3 }}>{action}</Box>}
    </Box>
  );
}
