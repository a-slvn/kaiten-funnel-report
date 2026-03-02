'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FilterListIcon from '@mui/icons-material/FilterList';
import type { FunnelFilters, PeriodPreset, Manager } from '@/lib/types';
import { PERIOD_PRESETS } from '@/lib/constants';

interface FiltersSidebarProps {
  filters: FunnelFilters;
  managers: Manager[];
  onPeriodChange: (period: PeriodPreset) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onOwnerIdsChange: (ids: number[]) => void;
  onApply: () => void;
}

export function FiltersSidebar({
  filters,
  managers,
  onPeriodChange,
  onDateFromChange,
  onDateToChange,
  onOwnerIdsChange,
  onApply,
}: FiltersSidebarProps) {
  const selectedManagers = managers.filter((m) => filters.owner_ids.includes(m.id));

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
          Фильтр
        </Typography>
      </Box>

      {/* Filters body */}
      <Box sx={{ flex: 1, px: 2, py: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
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

        {/* Date from */}
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
            Дата начала
          </Typography>
          <TextField
            id="filter-date-from"
            name="date_from"
            type="date"
            value={filters.date_from}
            onChange={(e) => onDateFromChange(e.target.value)}
            fullWidth
            size="small"
            InputProps={{
              sx: { fontSize: '0.8125rem' },
            }}
          />
        </Box>

        {/* Date to */}
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
            Дата окончания
          </Typography>
          <TextField
            id="filter-date-to"
            name="date_to"
            type="date"
            value={filters.date_to}
            onChange={(e) => onDateToChange(e.target.value)}
            fullWidth
            size="small"
            InputProps={{
              sx: { fontSize: '0.8125rem' },
            }}
          />
        </Box>

        <Divider sx={{ opacity: 0.4, my: 0.5 }} />

        {/* Responsible (Owner) filter */}
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
            Ответственный
          </Typography>
          <Autocomplete
            multiple
            size="small"
            options={managers}
            value={selectedManagers}
            getOptionLabel={(option) => option.full_name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_e, newValue) => {
              onOwnerIdsChange(newValue.map((m) => m.id));
            }}
            disableCloseOnSelect
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox size="small" checked={selected} sx={{ mr: 0.5, p: 0.25 }} />
                <Typography variant="body2">{option.full_name}</Typography>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={selectedManagers.length === 0 ? 'Все' : undefined}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.8125rem' } }}
              />
            )}
            noOptionsText="Не найдено"
          />
        </Box>
      </Box>

      {/* Apply button */}
      <Box sx={{ px: 2, pb: 2.5, pt: 1 }}>
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
          Показать
        </Button>
      </Box>
    </Box>
  );
}
