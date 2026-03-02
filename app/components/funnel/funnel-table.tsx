'use client';

import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { ConversionBadge } from './conversion-badge';
import type { FunnelStageData, MetricMode } from '@/lib/types';
import {
  formatNumber,
  formatCurrencyShort,
  formatDays,
} from '@/lib/format';

interface FunnelTableProps {
  stages: FunnelStageData[];
  onStageClick: (stage: FunnelStageData) => void;
  metricMode: MetricMode;
  interactive?: boolean;
}

export function FunnelTable({
  stages,
  onStageClick,
  metricMode,
  interactive = true,
}: FunnelTableProps) {
  const showAmount = metricMode === 'amount';

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2 }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Этап</TableCell>
            <TableCell align="right">Сделок</TableCell>
            {showAmount && <TableCell align="right">Сумма</TableCell>}
            {showAmount && <TableCell align="right">Ср. чек</TableCell>}
            <TableCell align="center">Конверсия</TableCell>
            <TableCell align="right">Ср. время</TableCell>
            <TableCell align="right">Зависшие</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stages.map((stage) => (
            <TableRow
              key={stage.stage_column_id}
              hover={interactive}
              onClick={interactive ? () => onStageClick(stage) : undefined}
              sx={{ cursor: interactive ? 'pointer' : 'default' }}
            >
              <TableCell sx={{ fontWeight: 500 }}>
                <Tooltip title={stage.board_name} placement="right" arrow>
                  <span>{stage.stage_name}</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right">{formatNumber(stage.deals_entered)}</TableCell>
              {showAmount && (
                <TableCell align="right">{formatCurrencyShort(stage.total_amount)}</TableCell>
              )}
              {showAmount && (
                <TableCell align="right">{formatCurrencyShort(stage.avg_amount)}</TableCell>
              )}
              <TableCell align="center">
                <ConversionBadge value={stage.conversion_to_next} />
              </TableCell>
              <TableCell align="right">{formatDays(stage.avg_duration_days)}</TableCell>
              <TableCell align="right">
                {stage.stale_deals_count > 0 ? (
                  <Chip
                    label={stage.stale_deals_count}
                    size="small"
                    sx={{
                      bgcolor: '#fff8e1',
                      color: '#e65100',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 20,
                    }}
                  />
                ) : (
                  <span style={{ color: '#9e9e9e' }}>0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
