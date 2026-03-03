'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import type { FunnelStageData, MetricMode } from '@/lib/types';
import { formatCurrencyShort, formatNumber } from '@/lib/format';

interface FunnelChartProps {
  stages: FunnelStageData[];
  onStageClick: (stage: FunnelStageData) => void;
  metricMode: MetricMode;
  interactive?: boolean;
}

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 380;
const PLOT_LEFT = 60;
const PLOT_RIGHT = 18;
const PLOT_TOP = 60;
const PLOT_BOTTOM = 32;

const percentFormatters = new Map<number, Intl.NumberFormat>();

function getNiceTicks(maxValue: number): number[] {
  if (maxValue <= 7) {
    return Array.from({ length: maxValue + 1 }, (_value, index) => index);
  }

  const roughStep = maxValue / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  let step = magnitude;
  if (normalized > 5) {
    step = 10 * magnitude;
  } else if (normalized > 2) {
    step = 5 * magnitude;
  } else if (normalized > 1) {
    step = 2 * magnitude;
  }

  const upperBound = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= upperBound; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

function getStagePalette(stage: FunnelStageData) {
  if (stage.stage_role === 'won') {
    return {
      body: '#dfe9dc',
      connector: '#ebf3e8',
      badge: '#67b05b',
      badgeText: '#ffffff',
    };
  }

  if (stage.stage_role === 'lost') {
    return {
      body: '#ecdfe3',
      connector: '#f4eaed',
      badge: '#e55b45',
      badgeText: '#ffffff',
    };
  }

  return {
    body: '#d9d9d9',
    connector: '#e7e7e7',
    badge: '#b06ad7',
    badgeText: '#ffffff',
  };
}

function formatPercentValue(value: number | null | undefined, maximumFractionDigits: number): string {
  if (value == null) return '\u2014';

  let formatter = percentFormatters.get(maximumFractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat('ru-RU', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits,
    });
    percentFormatters.set(maximumFractionDigits, formatter);
  }

  return formatter.format(value);
}

function buildBadgeLabel(stage: FunnelStageData, metricMode: MetricMode): string | null {
  if (metricMode === 'amount') {
    return stage.total_amount != null ? formatCurrencyShort(stage.total_amount) : null;
  }

  return null;
}

function getStageMetricValue(stage: FunnelStageData, metricMode: MetricMode): number {
  if (metricMode === 'amount') {
    return Math.max(0, Math.round(stage.total_amount ?? 0));
  }

  return stage.deals_entered;
}

export function FunnelChart({
  stages,
  onStageClick,
  metricMode,
  interactive = true,
}: FunnelChartProps) {
  const { processStages, outcomeStages, displayStages } = useMemo(() => {
    const process = stages.filter((stage) => stage.stage_role !== 'won' && stage.stage_role !== 'lost');
    const outcomes = stages.filter((stage) => stage.stage_role === 'won' || stage.stage_role === 'lost');

    return {
      processStages: process,
      outcomeStages: outcomes,
      displayStages: process.length > 0 ? [...process, ...outcomes] : stages,
    };
  }, [stages]);

  const rawValues = useMemo(
    () => displayStages.map((stage) => getStageMetricValue(stage, metricMode)),
    [displayStages, metricMode],
  );
  const maxValue = Math.max(...rawValues, 1);
  const ticks = useMemo(() => getNiceTicks(maxValue), [maxValue]);
  const yMax = ticks[ticks.length - 1] ?? maxValue;
  const plotHeight = VIEWBOX_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const availableWidth = VIEWBOX_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const slotCount = Math.max(displayStages.length, 1);
  const slotWidth = availableWidth / slotCount;
  const processBodyWidth = slotWidth * 0.74;
  const connectorWidth = slotWidth - processBodyWidth;
  const baselineY = VIEWBOX_HEIGHT - PLOT_BOTTOM;
  const firstStageValue = processStages[0]
    ? getStageMetricValue(processStages[0], metricMode)
    : (displayStages[0] ? getStageMetricValue(displayStages[0], metricMode) : 0);
  const totalOutcomeValue = outcomeStages.reduce(
    (sum, stage) => sum + getStageMetricValue(stage, metricMode),
    0,
  );

  const getY = (value: number) => {
    const normalized = yMax === 0 ? 0 : value / yMax;
    return PLOT_TOP + plotHeight * (1 - normalized);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 360 }}>
      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} width="100%" height="100%" role="img">
        {ticks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={PLOT_LEFT}
                x2={VIEWBOX_WIDTH - PLOT_RIGHT}
                y1={y}
                y2={y}
                stroke="rgba(0,0,0,0.12)"
                strokeWidth="1"
              />
              <text
                x={PLOT_LEFT - 14}
                y={y + 4}
                textAnchor="end"
                fill="#7a7a7a"
                fontSize="11"
                fontWeight="500"
              >
                {metricMode === 'amount' ? formatCurrencyShort(tick) : formatNumber(tick)}
              </text>
            </g>
          );
        })}

        <text
          x="14"
          y={PLOT_TOP + plotHeight / 2}
          transform={`rotate(-90 14 ${PLOT_TOP + plotHeight / 2})`}
          fill="#6f6f6f"
          fontSize="12"
          fontWeight="500"
        >
          {metricMode === 'amount' ? 'Сумма' : 'Количество сделок'}
        </text>

        {processStages.map((stage, index) => {
          const value = getStageMetricValue(stage, metricMode);
          const topY = getY(value);
          const x = PLOT_LEFT + slotWidth * index;
          const palette = getStagePalette(stage);
          const badgeLabel = buildBadgeLabel(stage, metricMode);
          const bodyHeight = baselineY - topY;
          const nextStage = processStages[index + 1];
          const nextTopY = nextStage
            ? getY(getStageMetricValue(nextStage, metricMode))
            : outcomeStages[0]
              ? getY(getStageMetricValue(outcomeStages[0], metricMode))
              : topY;
          const connectorConversion = nextStage
            ? (value > 0 ? getStageMetricValue(nextStage, metricMode) / value : null)
            : outcomeStages.length > 0 && value > 0
              ? totalOutcomeValue / value
              : null;
          const cumulativeCr = firstStageValue > 0 ? value / firstStageValue : null;
          const showCr = cumulativeCr != null;
          const stageCenterX = x + processBodyWidth / 2;
          const connectorCenterX = x + processBodyWidth + connectorWidth / 2;
          const badgeWidth = Math.max(76, (badgeLabel?.length ?? 0) * 7 + 16);
          const contentY = topY + Math.min(44, bodyHeight * 0.44);
          const badgeY = topY + Math.min(58, bodyHeight * 0.54);

          return (
            <g
              key={stage.stage_column_id}
              onClick={interactive ? () => onStageClick(stage) : undefined}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
            >
              <rect
                x={x}
                y={topY}
                width={processBodyWidth}
                height={bodyHeight}
                fill={palette.body}
                rx={index === 0 ? 2 : 0}
              />

              {(nextStage || outcomeStages.length > 0) && (
                <polygon
                  points={[
                    `${x + processBodyWidth},${topY}`,
                    `${x + processBodyWidth + connectorWidth},${nextTopY}`,
                    `${x + processBodyWidth + connectorWidth},${baselineY}`,
                    `${x + processBodyWidth},${baselineY}`,
                  ].join(' ')}
                  fill={palette.connector}
                />
              )}

              <text
                x={stageCenterX}
                y={Math.max(topY - 18, 18)}
                textAnchor="middle"
                fill="#2f2f2f"
                fontSize="14"
                fontWeight="700"
              >
                {stage.stage_name}
              </text>

              {showCr && (
                <text
                  x={stageCenterX}
                  y={contentY}
                  textAnchor="middle"
                  fill="#2f2f2f"
                  fontSize="11"
                  fontWeight="700"
                >
                  {`CR ${formatPercentValue(cumulativeCr, 2)}`}
                </text>
              )}

              {badgeLabel && (
                <>
                  <rect
                    x={stageCenterX - badgeWidth / 2}
                    y={badgeY}
                    width={badgeWidth}
                    height="22"
                    rx="5"
                    fill={palette.badge}
                  />
                  <text
                    x={stageCenterX}
                    y={badgeY + 15}
                    textAnchor="middle"
                    fill={palette.badgeText}
                    fontSize="11"
                    fontWeight="700"
                  >
                    {badgeLabel}
                  </text>
                </>
              )}

              {connectorConversion != null && (nextStage || outcomeStages.length > 0) && (
                <text
                  x={connectorCenterX}
                  y={(topY + nextTopY) / 2 + 22}
                  textAnchor="middle"
                  fill="#7a7a7a"
                  fontSize="11"
                  fontWeight="600"
                >
                  {`${formatPercentValue(connectorConversion, 1)} ->`}
                </text>
              )}
            </g>
          );
        })}

        {outcomeStages.map((stage, index) => {
          const value = getStageMetricValue(stage, metricMode);
          const x = PLOT_LEFT + slotWidth * (processStages.length + index);
          const topY = getY(value);
          const bodyHeight = baselineY - topY;
          const palette = getStagePalette(stage);
          const stageCenterX = x + slotWidth / 2;
          const badgeLabel = buildBadgeLabel(stage, metricMode);
          const badgeWidth = Math.max(76, (badgeLabel?.length ?? 0) * 7 + 16);
          const cumulativeCr = firstStageValue > 0 ? value / firstStageValue : null;
          const showCr = stage.stage_role !== 'lost' && cumulativeCr != null;
          const contentY = topY + Math.min(44, bodyHeight * 0.44);
          const badgeY = topY + Math.min(58, bodyHeight * 0.54);

          return (
            <g
              key={stage.stage_column_id}
              onClick={interactive ? () => onStageClick(stage) : undefined}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
            >
              <rect
                x={x}
                y={topY}
                width={slotWidth}
                height={bodyHeight}
                fill={palette.body}
              />

              <text
                x={stageCenterX}
                y={Math.max(topY - 18, 18)}
                textAnchor="middle"
                fill="#2f2f2f"
                fontSize="14"
                fontWeight="700"
              >
                {stage.stage_name}
              </text>

              {showCr && (
                <text
                  x={stageCenterX}
                  y={contentY}
                  textAnchor="middle"
                  fill="#2f2f2f"
                  fontSize="11"
                  fontWeight="700"
                >
                  {`CR ${formatPercentValue(cumulativeCr, 2)}`}
                </text>
              )}

              {badgeLabel && (
                <>
                  <rect
                    x={stageCenterX - badgeWidth / 2}
                    y={badgeY}
                    width={badgeWidth}
                    height="22"
                    rx="5"
                    fill={palette.badge}
                  />
                  <text
                    x={stageCenterX}
                    y={badgeY + 15}
                    textAnchor="middle"
                    fill={palette.badgeText}
                    fontSize="11"
                    fontWeight="700"
                  >
                    {badgeLabel}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </Box>
  );
}
