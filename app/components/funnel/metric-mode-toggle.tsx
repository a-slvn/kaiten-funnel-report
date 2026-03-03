'use client';

import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import TagIcon from '@mui/icons-material/Tag';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import type { MetricMode } from '@/lib/types';

interface MetricModeToggleProps {
  value: MetricMode;
  onChange: (mode: MetricMode) => void;
  amountAvailable: boolean;
}

export function MetricModeToggle({ value, onChange, amountAvailable }: MetricModeToggleProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_e, newValue) => {
        if (newValue) onChange(newValue as MetricMode);
      }}
      size="small"
      sx={{ height: 32 }}
    >
      <ToggleButton value="count" sx={{ px: 1.5, gap: 0.5, fontSize: '0.8125rem' }}>
        <TagIcon sx={{ fontSize: 16 }} />
        Количество
      </ToggleButton>
      {amountAvailable && (
        <ToggleButton value="amount" sx={{ px: 1.5, gap: 0.5, fontSize: '0.8125rem' }}>
          <AttachMoneyIcon sx={{ fontSize: 16 }} />
          Сумма
        </ToggleButton>
      )}
    </ToggleButtonGroup>
  );
}
