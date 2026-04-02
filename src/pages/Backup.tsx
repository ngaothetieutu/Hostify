import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TableChartIcon from '@mui/icons-material/TableChart';
import StorageIcon from '@mui/icons-material/Storage';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useGoogleLogin } from '@react-oauth/google';
import { PageHeader } from '../components/common';
import {
  downloadBackup,
  importBackup,
  exportToCSV,
  getDbStats,
} from '../utils/backup';

const TABLE_LABELS: Record<string, string> = {
  buildings: '🏢 Tòa nhà',
  rooms: '🚪 Phòng',
  tenants: '👤 Khách thuê',
  contracts: '📝 Hợp đồng',
  meterReadings: '⚡ Chỉ số điện nước',
  bills: '💰 Hóa đơn',
  billItems: '📋 Chi tiết hóa đơn',
  payments: '💳 Thanh toán',
  receipts: '🧾 Phiếu thu',
  receiptAllocations: '🔗 Phân bổ phiếu thu',
};

export default function Backup() {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const s = await getDbStats();
    setStats(s);
  };

  const totalRecords = Object.values(stats).reduce((sum, v) => sum + v, 0);

  // ─── Export JSON ───
  const handleExportJSON = async () => {
    setLoading(true);
    try {
      const result = await downloadBackup();
      setSnackbar({
        open: true,
        message: `✅ Đã tải backup "${result.filename}" (${(result.size / 1024).toFixed(1)} KB, ${result.recordsCount} bản ghi)`,
        severity: 'success',
      });
    } catch (e: any) {
      setSnackbar({ open: true, message: `❌ Lỗi: ${e.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Export GDrive ───
  const handleGDriveBackup = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const { dataStr, filename } = await downloadBackup();
        const metadata = {
          name: filename,
          mimeType: 'application/json',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([dataStr], { type: 'application/json' }));

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`
          },
          body: form
        });

        if (!res.ok) throw new Error('Không thể upload lên Google Drive. Vui lòng thử lại.');
        
        setSnackbar({
          open: true,
          message: `✅ Lên mây thành công! Đã lưu file "${filename}" thẳng vào Google Drive của bạn.`,
          severity: 'success',
        });
        
        // Cập nhật ngày sao lưu cuối để Dashboard không nhắc nữa
        const today = new Date();
        localStorage.setItem('last_gdrive_auto_backup_date', `${today.getFullYear()}-${today.getMonth() + 1}`);

      } catch (err: any) {
        setSnackbar({ open: true, message: `❌ Lỗi GDrive: ${err.message}`, severity: 'error' });
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      setSnackbar({ open: true, message: `❌ Quyền bị từ chối hoặc lỗi đăng nhập.`, severity: 'error' });
    }
  });

  // ─── Khôi phục từ GDrive ───
  const handleRestoreGDrive = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const query = encodeURIComponent("name contains 'hostify_backup' and trashed=false");
        const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&pageSize=1`, {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const listData = await listRes.json();
        
        if (!listRes.ok) throw new Error(listData.error?.message || 'Không thể lấy danh sách file');
        if (!listData.files || listData.files.length === 0) {
          throw new Error('Chưa có file backup nào trên Google Drive của bạn!');
        }
        
        const fileId = listData.files[0].id;
        const fileName = listData.files[0].name;

        // Báo cho người dùng biết đang tải
        setSnackbar({ open: true, message: `🚀 Đang kéo file mới nhất "${fileName}" từ GDrive về...`, severity: 'info' });

        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        
        if (!fileRes.ok) throw new Error('Không có quyền tải nội dung file');

        const dataText = await fileRes.text();
        const fakeFile = new File([dataText], fileName, { type: 'application/json' });
        
        const result = await importBackup(fakeFile);
        await loadStats();
        
        setSnackbar({
          open: true,
          message: `✅ Phục hồi từ GDrive thành công! ${result.recordsCount} bản ghi đã được phục hồi.`,
          severity: 'success',
        });
      } catch (err: any) {
        setSnackbar({ open: true, message: `❌ Lỗi tải từ Google Drive: ${err.message}`, severity: 'error' });
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      setSnackbar({ open: true, message: `❌ Quyền bị từ chối hoặc lỗi đăng nhập.`, severity: 'error' });
    }
  });


  // ─── Export CSV ───
  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const result = await exportToCSV();
      setSnackbar({
        open: true,
        message: `✅ Đã tải file "${result.filename}"`,
        severity: 'success',
      });
    } catch (e: any) {
      setSnackbar({ open: true, message: `❌ Lỗi: ${e.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Import/Restore ───
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setConfirmRestoreOpen(true);
    }
    // Reset input so re-selecting the same file still triggers
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!selectedFile) return;
    setConfirmRestoreOpen(false);
    setLoading(true);

    try {
      const result = await importBackup(selectedFile);
      await loadStats();
      setSnackbar({
        open: true,
        message: `✅ Khôi phục thành công! ${result.recordsCount} bản ghi đã được import.`,
        severity: 'success',
      });
    } catch (e: any) {
      setSnackbar({ open: true, message: `❌ Lỗi: ${e.message}`, severity: 'error' });
    } finally {
      setLoading(false);
      setSelectedFile(null);
    }
  };

  return (
    <Box>
      <PageHeader
        title="☁️ Sao lưu & Khôi phục"
        subtitle="Quản lý dữ liệu backup của ứng dụng"
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* ─── Database Overview ─── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StorageIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Dữ liệu hiện tại
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center', py: 2, mb: 2, bgcolor: theme.palette.background.default, borderRadius: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                  {totalRecords}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  tổng bản ghi
                </Typography>
              </Box>

              <List dense>
                {Object.entries(stats).map(([key, count]) => (
                  <ListItem key={key} sx={{ px: 0 }}>
                    <ListItemText
                      primary={TABLE_LABELS[key] || key}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                    <Chip label={count} size="small" variant="outlined" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Backup Actions ─── */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Export Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CloudDownloadIcon color="success" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Sao lưu (Export)
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                Tải xuống toàn bộ dữ liệu của ứng dụng. File backup có thể dùng để khôi phục trên thiết bị khác.
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: theme.palette.primary.main, bgcolor: `${theme.palette.primary.main}08` }, transition: 'all 0.2s' }} onClick={handleExportJSON}>
                    <DescriptionIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Backup JSON
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      File đầy đủ, dùng để khôi phục
                    </Typography>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: theme.palette.success.main, bgcolor: `${theme.palette.success.main}08` }, transition: 'all 0.2s' }} onClick={handleExportCSV}>
                    <TableChartIcon sx={{ fontSize: 40, color: theme.palette.success.main, mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Export CSV
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      Mở được bằng Excel / Google Sheets
                    </Typography>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 12 }}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: theme.palette.info.main, bgcolor: `${theme.palette.info.main}08` }, transition: 'all 0.2s' }} onClick={() => handleGDriveBackup()}>
                    <CloudSyncIcon sx={{ fontSize: 40, color: theme.palette.info.main, mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Đẩy lên Google Drive
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      Lưu file JSON trực tiếp lên đám mây (An toàn nhất)
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CloudUploadIcon color="warning" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Khôi phục (Import)
                </Typography>
              </Box>

              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  ⚠️ Khôi phục sẽ <strong>xóa toàn bộ dữ liệu hiện tại</strong> và thay thế bằng dữ liệu từ file backup.
                  Hãy chắc chắn bạn đã sao lưu dữ liệu hiện tại trước khi khôi phục.
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 12 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<CloudSyncIcon />}
                    onClick={() => handleRestoreGDrive()}
                    disabled={loading}
                    fullWidth
                    sx={{ py: 1.5, mb: 2, bgcolor: theme.palette.info.main, '&:hover': { bgcolor: theme.palette.info.dark } }}
                  >
                    Lấy bản cứng mới nhất từ Google Drive
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 12 }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    fullWidth
                    sx={{ py: 1.5 }}
                  >
                    Chọn file backup (.json) ở máy để khôi phục
                  </Button>
                </Grid>
              </Grid>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                hidden
                onChange={handleFileSelect}
              />
            </CardContent>
          </Card>

          {/* Info */}
          <Card variant="outlined" sx={{ bgcolor: theme.palette.background.default }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <InfoIcon color="info" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Lưu ý quan trọng
                </Typography>
              </Box>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Backup JSON chứa toàn bộ dữ liệu, sử dụng để khôi phục hoàn chỉnh"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Export CSV để mở bằng Excel, Google Sheets hoặc gửi báo cáo"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningAmberIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Nên sao lưu định kỳ mỗi tháng để tránh mất dữ liệu"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningAmberIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Lưu file backup lên Google Drive hoặc email để bảo vệ dữ liệu"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirm Restore Dialog */}
      <Dialog open={confirmRestoreOpen} onClose={() => setConfirmRestoreOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Xác nhận khôi phục
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Bạn đang chọn file: <strong>{selectedFile?.name}</strong>
          </Typography>
          <Alert severity="error">
            Hành động này sẽ <strong>XÓA TOÀN BỘ</strong> dữ liệu hiện tại và thay thế bằng dữ liệu từ file backup.
            Không thể hoàn tác!
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmRestoreOpen(false)} color="inherit">Hủy</Button>
          <Button onClick={handleConfirmRestore} variant="contained" color="warning">
            Xác nhận khôi phục
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
}
