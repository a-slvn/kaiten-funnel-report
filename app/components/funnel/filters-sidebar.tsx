'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import FilterListIcon from '@mui/icons-material/FilterList';
import type { FunnelFilters, PeriodPreset } from '@/lib/types';
import { PERIOD_PRESETS } from '@/lib/constants';

interface FiltersSidebarProps {
  filters: FunnelFilters;
  cardTypes: string[];
  onPeriodChange: (period: PeriodPreset) => void;
  onCardTypeChange: (cardType: string) => void;
  onApply: () => void;
}

export function FiltersSidebar({
  filters,
  cardTypes,
  onPeriodChange,
  onCardTypeChange,
  onApply,
}: FiltersSidebarProps) {
  return (
    <Box
      sx={{
        width: 280,
        flexShrink: 0,
        alignSelf: 'stretch',
        borderLeft: '1px solid rgba(0,0,0,0.1)',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.75,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <FilterListIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Фильтры
        </Typography>
      </Box>

      {/* Filters body */}
      <Box sx={{ px: 2, py: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Period */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.75,
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.6875rem',
            }}
          >
            Период
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={filters.period}
              onChange={(e) => onPeriodChange(e.target.value as PeriodPreset)}
              displayEmpty
              sx={{ fontSize: '0.8125rem' }}
            >
              {PERIOD_PRESETS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Card types */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.75,
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.6875rem',
            }}
          >
            Тип карточки
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={filters.card_type}
              onChange={(e) => onCardTypeChange(String(e.target.value))}
              displayEmpty
              sx={{ fontSize: '0.8125rem' }}
            >
              <MenuItem value="">Все типы</MenuItem>
              {cardTypes.map((cardType) => (
                <MenuItem key={cardType} value={cardType}>
                  {cardType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button
          variant="outlined"
          fullWidth
          onClick={onApply}
          sx={{
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            borderColor: 'rgba(0,0,0,0.23)',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'rgba(0,0,0,0.4)',
              bgcolor: 'rgba(0,0,0,0.02)',
            },
          }}
        >
          Применить
        </Button>
      </Box>
    </Box>
  );
}
