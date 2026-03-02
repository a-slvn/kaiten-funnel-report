'use client';

import Box from '@mui/material/Box';
import { formatPercent } from '@/lib/format';
import { CONVERSION_THRESHOLDS } from '@/lib/constants';

interface ConversionBadgeProps {
  value: number | null;
}

export function ConversionBadge({ value }: ConversionBadgeProps) {
  if (value == null) return null;

  const isGood = value >= CONVERSION_THRESHOLDS.good;
  const isWarning = value >= CONVERSION_THRESHOLDS.warning;

  const bgColor = isGood ? '#e8f5e9' : isWarning ? '#fff8e1' : '#fce4ec';
  const textColor = isGood ? '#2e7d32' : isWarning ? '#e65100' : '#c62828';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 0.75,
        py: 0.25,
        borderRadius: '12px',
        fontSize: '0.6875rem',
        fontWeight: 600,
        bgcolor: bgColor,
        color: textColor,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}
    >
      {formatPercent(value)}
    </Box>
  );
}
