'use client';

import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Tooltip from '@mui/material/Tooltip';
import TagIcon from '@mui/icons-material/Tag';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import type { MetricMode } from '@/lib/types';

interface MetricModeToggleProps {
  value: MetricMode;
  onChange: (mode: MetricMode) => void;
  amountAvailable: boolean;
}

export function MetricModeToggle({ value, onChange, amountAvailable }: MetricModeToggleProps) {
  const amountButton = (
    <ToggleButton
      value="amount"
      disabled={!amountAvailable}
      sx={{ px: 1.5, gap: 0.5, fontSize: '0.8125rem' }}
    >
      <AttachMoneyIcon sx={{ fontSize: 16 }} />
      Сумма
    </ToggleButton>
  );

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
        Кол-во
      </ToggleButton>
      {amountAvailable ? (
        amountButton
      ) : (
        <Tooltip title="Нет числового поля для суммы. Настройте в параметрах." arrow>
          <span>{amountButton}</span>
        </Tooltip>
      )}
    </ToggleButtonGroup>
  );
}
