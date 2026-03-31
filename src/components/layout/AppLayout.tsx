import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Avatar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import InstallPrompt from '../pwa/InstallPrompt';
import { DRAWER_WIDTH } from '../../utils/constants';

const navItems = [
  { path: '/', label: 'Tổng quan', icon: <DashboardIcon /> },
  { path: '/rooms', label: 'Phòng', icon: <MeetingRoomIcon /> },
  { path: '/tenants', label: 'Khách thuê', icon: <PeopleIcon /> },
  { path: '/bills', label: 'Hóa đơn', icon: <ReceiptLongIcon /> },
  { path: '/meters', label: 'Điện nước', icon: <SpeedIcon /> },
  { path: '/settings', label: 'Cài đặt', icon: <SettingsIcon /> },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentNavIndex = navItems.findIndex(
    (item) =>
      item.path === location.pathname ||
      (item.path !== '/' && location.pathname.startsWith(item.path)),
  );

  const handleNavigate = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const drawerContent = (
    <Box sx={{ pt: 2 }}>
      {/* Logo area */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          pb: 3,
          mb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Avatar
          sx={{
            bgcolor: theme.palette.primary.main,
            width: 40,
            height: 40,
            fontSize: '1.2rem',
          }}
        >
          🏠
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800, color: theme.palette.text.primary, letterSpacing: '-0.5px' }}>
            Hostify
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            v2.0 — PWA
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 1.5 }}>
        {navItems.map((item) => {
          const isActive =
            item.path === location.pathname ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItemButton
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              selected={isActive}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: `${theme.palette.primary.main}14`,
                  color: theme.palette.primary.main,
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                  '&:hover': {
                    bgcolor: `${theme.palette.primary.main}1F`,
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: isActive ? 600 : 400, fontSize: '0.9rem' }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      {/* ─── Desktop Sidebar ─── */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: theme.palette.background.paper,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* ─── Mobile Drawer ─── */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* ─── Main Content ─── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          width: isMobile ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
        }}
      >
        {/* AppBar (Mobile only) */}
        {isMobile && (
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Toolbar>
              <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
                Hostify
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            pb: isMobile ? 10 : 3,
            bgcolor: theme.palette.background.default,
            overflow: 'auto',
          }}
        >
          {children}
        </Box>

        {/* ─── Mobile Bottom Nav ─── */}
        {isMobile && (
          <Paper
            elevation={8}
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: theme.zIndex.appBar,
              borderTop: `1px solid ${theme.palette.divider}`,
            }}
          >
            <BottomNavigation
              value={currentNavIndex >= 0 ? currentNavIndex : 0}
              onChange={(_, newValue) => handleNavigate(navItems[newValue].path)}
              showLabels
              sx={{
                height: 64,
                '& .MuiBottomNavigationAction-root': {
                  minWidth: 'auto',
                  py: 1,
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                },
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.65rem',
                  '&.Mui-selected': {
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  },
                },
              }}
            >
              {navItems.slice(0, 5).map((item) => (
                <BottomNavigationAction
                  key={item.path}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </BottomNavigation>
          </Paper>
        )}
        {/* Install Prompt Snackbar */}
        <InstallPrompt />
      </Box>
    </Box>
  );
}
