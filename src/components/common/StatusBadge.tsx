import { Chip } from '@mui/material';
import { roomStatusLabel, roomStatusColor, billStatusLabel, billStatusColor, contractStatusLabel, contractStatusColor } from '../../utils/formatters';

interface StatusBadgeProps {
  status: string;
  type?: 'room' | 'bill' | 'contract';
  size?: 'small' | 'medium';
}

const colorMaps: Record<string, Record<string, string>> = {
  room: roomStatusColor,
  bill: billStatusColor,
  contract: contractStatusColor,
};

const labelMaps: Record<string, Record<string, string>> = {
  room: roomStatusLabel,
  bill: billStatusLabel,
  contract: contractStatusLabel,
};

export default function StatusBadge({ status, type = 'room', size = 'small' }: StatusBadgeProps) {
  const color = colorMaps[type]?.[status] ?? '#94A3B8';
  const label = labelMaps[type]?.[status] ?? status;

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        bgcolor: `${color}1A`,
        color: color,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.85rem',
        border: `1px solid ${color}33`,
        '& .MuiChip-label': { px: 1.5 },
      }}
    />
  );
}
