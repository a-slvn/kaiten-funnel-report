'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { FunnelSummaryData, MetricMode } from '@/lib/types';
import { formatCurrencyShort } from '@/lib/format';

interface KpiCardsProps {
  summary: FunnelSummaryData;
  metricMode: MetricMode;
}

interface KpiCardProps {
  label: string;
  count: number | string;
  amount?: string | null;
  accent?: 'default' | 'green' | 'red';
}

function KpiCard({ label, count, amount, accent = 'default' }: KpiCardProps) {
  const accentColor =
    accent === 'green' ? '#2e7d32' :
    accent === 'red' ? '#c62828' :
    'text.primary';

  const accentBg =
    accent === 'green' ? '#f1f8f1' :
    accent === 'red' ? '#fdf1f1' :
    'background.paper';

  return (
    <Card
      sx={{
        flex: 1,
        minWidth: 0,
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 2,
        bgcolor: accentBg,
      }}
      elevation={0}
    >
      <CardContent sx={{ p: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap', mb: 0.5 }}>
          <Typography
            sx={{
              fontSize: '1.75rem',
              fontWeight: 700,
              lineHeight: 1,
              color: accentColor,
            }}
          >
            {count}
          </Typography>
          {amount && (
            <Typography
              sx={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: accentColor,
                lineHeight: 1,
              }}
            >
              {amount}
            </Typography>
          )}
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: '0.75rem', mt: 0.25 }}
        >
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ summary, metricMode }: KpiCardsProps) {
  const isAmount = metricMode === 'amount';
  const totalAmount = isAmount && summary.pipeline_value != null
    ? formatCurrencyShort(summary.pipeline_value)
    : null;
  const wonDeals = summary.total_won;
  const lostDeals = summary.total_lost;

  const wonAmount = isAmount && summary.avg_won_deal_size != null
    ? formatCurrencyShort(summary.avg_won_deal_size * wonDeals)
    : null;

  return (
    <Box>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.9375rem' }}
      >
        Итоги
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <KpiCard
          label="Всего сделок"
          count={summary.total_entered}
          amount={totalAmount}
        />
        <KpiCard
          label="Средний цикл сделки"
          count={summary.avg_sales_cycle_days != null ? `${summary.avg_sales_cycle_days.toFixed(1)} дн.` : '—'}
        />
        <KpiCard
          label="Выиграно"
          count={wonDeals}
          amount={wonAmount}
          accent="green"
        />
        <KpiCard
          label="Проиграно"
          count={lostDeals}
          accent="red"
        />
      </Box>
    </Box>
  );
}
