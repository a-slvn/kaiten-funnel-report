'use client';

import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import type { FunnelDealItem, SortOrder, MetricMode } from '@/lib/types';
import { formatCurrency, formatDate, formatDays } from '@/lib/format';

interface DrilldownDealListProps {
  deals: FunnelDealItem[];
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (field: string) => void;
  metricMode: MetricMode;
}

interface SortableHeaderProps {
  field: string;
  label: string;
  currentSort: string;
  currentOrder: SortOrder;
  onSort: (field: string) => void;
  align?: 'left' | 'right' | 'center';
}

function SortableHeader({ field, label, currentSort, currentOrder, onSort, align = 'left' }: SortableHeaderProps) {
  const isActive = currentSort === field;
  return (
    <TableCell
      align={align}
      onClick={() => onSort(field)}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { color: 'text.primary' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {label}
        <SwapVertIcon
          sx={{
            fontSize: 14,
            opacity: isActive ? 1 : 0.35,
            color: isActive ? 'primary.main' : 'inherit',
          }}
        />
        {isActive && (
          <Typography component="span" sx={{ fontSize: '0.625rem', fontWeight: 700 }}>
            {currentOrder === 'asc' ? '↑' : '↓'}
          </Typography>
        )}
      </Box>
    </TableCell>
  );
}

const outcomeConfig: Record<string, { label: string; bgcolor: string; color: string }> = {
  in_progress: { label: 'В работе', bgcolor: '#e3f2fd', color: '#1565c0' },
  won: { label: 'Выигран', bgcolor: '#e8f5e9', color: '#2e7d32' },
  lost: { label: 'Проигран', bgcolor: '#fce4ec', color: '#c62828' },
};

export function DrilldownDealList({ deals, sortBy, sortOrder, onSort, metricMode }: DrilldownDealListProps) {
  const showAmount = metricMode === 'amount';
  const colSpan = showAmount ? 6 : 5;

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 1.5 }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <SortableHeader field="title" label="Сделка" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
            <SortableHeader field="responsible_name" label="Ответственный" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
            {showAmount && (
              <SortableHeader field="deal_amount" label="Сумма" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} align="right" />
            )}
            <SortableHeader field="entered_at" label="Дата входа" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
            <SortableHeader field="duration_days" label="Время" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} align="right" />
            <TableCell>Статус</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {deals.map((deal) => {
            const outcome = outcomeConfig[deal.outcome] ?? outcomeConfig.in_progress;
            return (
              <TableRow key={`${deal.card_id}-${deal.entered_at}`} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {deal.card_title}
                  </Typography>
                  {deal.source && (
                    <Typography variant="caption" color="text.secondary">
                      {deal.source}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {deal.responsible?.full_name ?? '—'}
                  </Typography>
                </TableCell>
                {showAmount && (
                  <TableCell align="right">
                    <Typography variant="body2">{formatCurrency(deal.deal_amount)}</Typography>
                  </TableCell>
                )}
                <TableCell>
                  <Typography variant="body2">{formatDate(deal.entered_at)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatDays(deal.duration_days)}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={outcome.label}
                      size="small"
                      sx={{
                        bgcolor: outcome.bgcolor,
                        color: outcome.color,
                        fontWeight: 600,
                        fontSize: '0.6875rem',
                        height: 20,
                        borderRadius: '10px',
                      }}
                    />
                    {deal.is_stale && (
                      <Chip
                        label="Зависла"
                        size="small"
                        sx={{
                          bgcolor: '#fff8e1',
                          color: '#e65100',
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          height: 20,
                          borderRadius: '10px',
                        }}
                      />
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
          {deals.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                Нет сделок
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
