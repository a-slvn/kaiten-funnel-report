'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { FunnelStageData, MetricMode } from '@/lib/types';
import { formatCurrencyShort, formatPercent, formatNumber } from '@/lib/format';

interface FunnelChartProps {
  stages: FunnelStageData[];
  onStageClick: (stage: FunnelStageData) => void;
  metricMode: MetricMode;
}

const BAR_COLOR = '#bdbdbd';
const BAR_HOVER_COLOR = '#9e9e9e';
const GREEN_BADGE_BG = '#e8f5e9';
const GREEN_BADGE_TEXT = '#2e7d32';

interface TooltipPayloadItem {
  payload: FunnelStageData & { name: string };
}

function CustomTooltipContent({
  active,
  payload,
  metricMode,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  metricMode?: MetricMode;
}) {
  if (!active || !payload?.length) return null;
  const stage = payload[0].payload;
  const isAmount = metricMode === 'amount';

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 1.5,
        px: 2,
        py: 1.5,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        minWidth: 180,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 600 }}>
        {stage.stage_name}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography variant="body2" color={isAmount ? 'text.secondary' : 'text.primary'}>
          Сделок:{' '}
          <Box component="span" sx={{ fontWeight: isAmount ? 400 : 600 }}>
            {stage.deals_entered}
          </Box>
        </Typography>
        <Typography variant="body2" color={isAmount ? 'text.primary' : 'text.secondary'}>
          Сумма:{' '}
          <Box component="span" sx={{ fontWeight: isAmount ? 600 : 400 }}>
            {formatCurrencyShort(stage.total_amount)}
          </Box>
        </Typography>
        {stage.avg_duration_days != null && (
          <Typography variant="body2" color="text.secondary">
            Ср. время:{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>
              {stage.avg_duration_days.toFixed(1)} дн.
            </Box>
          </Typography>
        )}
        {stage.conversion_to_next != null && (
          <Typography variant="body2" color="text.secondary">
            Конверсия:{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>
              {formatPercent(stage.conversion_to_next)}
            </Box>
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// Custom label rendered inside/above the bar showing primary metric, CR% and secondary badge
function CustomBarLabel(props: Record<string, unknown>) {
  const { x, y, width, height, value, index, stages, metricMode } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
    index: number;
    stages: FunnelStageData[];
    metricMode: MetricMode;
  };

  const stage = stages[index];
  if (!stage) return null;

  const isAmount = metricMode === 'amount';
  const cx = x + width / 2;
  const crText = stage.conversion_to_win != null
    ? `CR ${Math.round(stage.conversion_to_win * 100)}%`
    : null;

  // Primary label above bar
  const primaryLabel = isAmount
    ? formatCurrencyShort(stage.total_amount)
    : String(value);
  const primaryY = y - 7;

  // CR inside bar if height allows
  const showCrInside = height >= 32;
  const crY = y + 16;

  // Secondary badge inside bar (count badge in amount mode, amount badge in count mode)
  const badgeText = isAmount
    ? `${stage.deals_entered} сд.`
    : (stage.total_amount != null ? formatCurrencyShort(stage.total_amount) : null);
  const badgeWidth = badgeText ? Math.max(badgeText.length * 7 + 12, 64) : 0;
  const showBadge = height >= 54 && badgeText;
  const badgeY = showCrInside ? crY + 12 : y + 16;
  const badgeRectY = badgeY - 1;

  return (
    <g>
      {/* Primary metric above bar */}
      <text
        x={cx}
        y={primaryY}
        textAnchor="middle"
        fill="#424242"
        fontSize={12}
        fontWeight={700}
      >
        {primaryLabel}
      </text>

      {/* CR% text inside bar */}
      {showCrInside && crText && (
        <text
          x={cx}
          y={crY}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={10}
          fontWeight={600}
        >
          {crText}
        </text>
      )}

      {/* Secondary badge inside bar */}
      {showBadge && badgeText && (
        <>
          <rect
            x={cx - badgeWidth / 2}
            y={badgeRectY}
            width={badgeWidth}
            height={18}
            rx={9}
            ry={9}
            fill={GREEN_BADGE_BG}
          />
          <text
            x={cx}
            y={badgeRectY + 12}
            textAnchor="middle"
            fill={GREEN_BADGE_TEXT}
            fontSize={10}
            fontWeight={600}
          >
            {badgeText}
          </text>
        </>
      )}
    </g>
  );
}

// Conversion arrow between bars
function ConversionArrow({ value }: { value: number | null }) {
  if (value == null) return null;
  const pct = (value * 100).toFixed(1);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 0.5,
        minWidth: 52,
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: '0.6875rem', color: '#757575', lineHeight: 1.4, fontWeight: 500 }}>
        {pct}%
      </Typography>
      <Typography sx={{ fontSize: '1rem', color: '#bdbdbd', lineHeight: 1 }}>
        →
      </Typography>
    </Box>
  );
}

export function FunnelChart({ stages, onStageClick, metricMode }: FunnelChartProps) {
  const isAmount = metricMode === 'amount';
  const dataKey = isAmount ? 'total_amount' : 'deals_entered';

  const data = useMemo(
    () => stages.map((s) => ({ ...s, name: s.stage_name })),
    [stages]
  );

  const maxValue = Math.max(
    ...stages.map((s) => (isAmount ? (s.total_amount ?? 0) : s.deals_entered)),
    1,
  );

  return (
    <Box>
      {/* Stage name header row above chart */}
      <Box
        sx={{
          display: 'flex',
          pl: '60px',
          pr: '20px',
          mb: 0.5,
        }}
      >
        {stages.map((stage) => (
          <Box key={stage.stage_column_id} sx={{ flex: 1, textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#424242',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                px: 0.5,
              }}
            >
              {stage.stage_name}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Recharts BarChart */}
      <Box sx={{ height: 320, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 28, right: 20, bottom: 8, left: 40 }}
            barCategoryGap="25%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.07)" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#9e9e9e' }}
              domain={[0, Math.ceil(maxValue * 1.2)]}
              label={{
                value: isAmount ? 'Сумма, руб.' : 'Кол-во сделок',
                angle: -90,
                position: 'insideLeft',
                offset: -28,
                style: { fontSize: 11, fill: '#9e9e9e' },
              }}
            />
            <Tooltip
              content={<CustomTooltipContent metricMode={metricMode} />}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Bar
              dataKey={dataKey}
              radius={[4, 4, 0, 0]}
              maxBarSize={100}
              cursor="pointer"
              onClick={(_data, index) => {
                const stage = stages[index];
                if (stage) onStageClick(stage);
              }}
              label={(props) => <CustomBarLabel {...props} stages={stages} metricMode={metricMode} />}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={BAR_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Conversion arrows row below chart */}
      <Box
        sx={{
          display: 'flex',
          pl: '60px',
          pr: '20px',
          mt: 0.5,
          alignItems: 'center',
        }}
      >
        {stages.map((stage, i) => (
          <Box
            key={stage.stage_column_id}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isAmount && (
              <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e', whiteSpace: 'nowrap' }}>
                {`${formatNumber(stage.deals_entered)} сд.`}
              </Typography>
            )}
            {i < stages.length - 1 && (
              <ConversionArrow value={stage.conversion_to_next} />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
