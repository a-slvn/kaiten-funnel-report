'use client';

import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import type { ViewMode } from '@/lib/types';

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_e, newValue) => {
        if (newValue) onChange(newValue as ViewMode);
      }}
      size="small"
      sx={{ height: 32 }}
    >
      <ToggleButton value="chart" sx={{ px: 1.5, gap: 0.5, fontSize: '0.8125rem' }}>
        <BarChartIcon sx={{ fontSize: 16 }} />
        График
      </ToggleButton>
      <ToggleButton value="table" sx={{ px: 1.5, gap: 0.5, fontSize: '0.8125rem' }}>
        <TableChartIcon sx={{ fontSize: 16 }} />
        Таблица
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
