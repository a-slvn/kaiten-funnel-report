'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TuneIcon from '@mui/icons-material/Tune';

import { KpiCards } from './kpi-cards';
import { FunnelChart } from './funnel-chart';
import { FunnelTable } from './funnel-table';
import { FiltersSidebar } from './filters-sidebar';
import { ViewSwitcher } from './view-switcher';
import { StageDrilldown } from './stage-drilldown';
import { EmployeeSection } from './employee-section';
import { AlertBanner } from './alert-banner';
import { MetricModeToggle } from './metric-mode-toggle';
import { FunnelSetupDialog } from './funnel-setup-dialog';

import { useFilters } from '@/lib/hooks/use-filters';
import { useFunnelData } from '@/lib/hooks/use-funnel-data';
import { useBestGuess } from '@/lib/hooks/use-best-guess';
import { useDrilldown } from '@/lib/hooks/use-drilldown';
import { mockSpaceBoards } from '@/data/mock-boards';
import { mockManagers } from '@/data/mock-managers';
import type { ViewMode, PeriodPreset, MetricMode, FunnelOverrides } from '@/lib/types';

export function FunnelReport() {
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);

  const { filters, setPeriod } = useFilters();
  const [localDateFrom, setLocalDateFrom] = useState(filters.date_from);
  const [localDateTo, setLocalDateTo] = useState(filters.date_to);

  // Best Guess auto-configuration
  const bestGuess = useBestGuess(mockSpaceBoards);

  // Metric mode: initialized from Best Guess, overridable by user
  const [metricMode, setMetricMode] = useState<MetricMode>('count');
  const [userOverrodeMetric, setUserOverrodeMetric] = useState(false);

  useEffect(() => {
    if (bestGuess.result && !userOverrodeMetric) {
      setMetricMode(bestGuess.result.metric_mode);
    }
  }, [bestGuess.result, userOverrodeMetric]);

  const handleMetricModeChange = useCallback((mode: MetricMode) => {
    setMetricMode(mode);
    setUserOverrodeMetric(true);
  }, []);

  // Data fetching with metric mode
  const { data, isLoading } = useFunnelData(
    filters,
    metricMode,
    bestGuess.result?.config.board_ids,
  );

  const drilldown = useDrilldown(data?.deals ?? []);

  const handlePeriodChange = useCallback(
    (period: PeriodPreset) => {
      setPeriod(period);
    },
    [setPeriod]
  );

  // Owner filter
  const [ownerIds, setOwnerIds] = useState<number[]>([]);

  const handleOwnerIdsChange = useCallback((ids: number[]) => {
    setOwnerIds(ids);
  }, []);

  const handleFilterApply = useCallback(() => {
    // In real app: trigger data fetch with updated filters
  }, []);

  const handleOpenSetup = useCallback(() => {
    setSetupDialogOpen(true);
  }, []);

  // Overrides from setup dialog (persisted in session)
  const [overrides, setOverrides] = useState<FunnelOverrides | null>(null);

  const handleSetupApply = useCallback((newOverrides: FunnelOverrides) => {
    setOverrides(newOverrides);
    setMetricMode(newOverrides.metric_mode);
    setUserOverrodeMetric(true);
    setSetupDialogOpen(false);
  }, []);

  // Dismissed alerts (session-only)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const handleDismissAlert = useCallback((code: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(code));
  }, []);

  const visibleAlerts = useMemo(() => {
    const all = bestGuess.result?.alerts ?? [];
    return all.filter((a) => !dismissedAlerts.has(a.code));
  }, [bestGuess.result?.alerts, dismissedAlerts]);

  // "НАСТРОИТЬ" button
  const configureButton = (
    <Button
      variant="outlined"
      size="small"
      startIcon={<TuneIcon sx={{ fontSize: 16 }} />}
      onClick={handleOpenSetup}
      sx={{
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        borderColor: 'rgba(0,0,0,0.23)',
        color: 'text.primary',
        '&:hover': { borderColor: 'rgba(0,0,0,0.4)', bgcolor: 'rgba(0,0,0,0.02)' },
      }}
    >
      Настроить
    </Button>
  );

  // Loading: Best Guess or data
  if (bestGuess.isLoading || isLoading || !data) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  // Main report — no stop-screen, chart renders immediately
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Breadcrumb + "НАСТРОИТЬ" */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Breadcrumbs separator="/" sx={{ fontSize: '0.875rem' }}>
            <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              Отчёты
            </Typography>
            <Typography color="text.primary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Воронка продаж
            </Typography>
          </Breadcrumbs>
          {configureButton}
        </Box>

        {/* Alert banners from Best Guess */}
        {visibleAlerts.length > 0 && (
          <AlertBanner
            alerts={visibleAlerts}
            onOpenSettings={handleOpenSetup}
            onDismiss={handleDismissAlert}
          />
        )}

        {/* Chart section */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid rgba(0,0,0,0.1)',
            p: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
              Конверсия по этапам: Сделки
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MetricModeToggle
                value={metricMode}
                onChange={handleMetricModeChange}
                amountAvailable={bestGuess.result?.config.deal_amount_field_id != null}
              />
              <ViewSwitcher value={viewMode} onChange={setViewMode} />
            </Box>
          </Box>

          {viewMode === 'chart' ? (
            <FunnelChart stages={data.stages} onStageClick={drilldown.openDrilldown} metricMode={metricMode} />
          ) : (
            <FunnelTable stages={data.stages} onStageClick={drilldown.openDrilldown} metricMode={metricMode} />
          )}
        </Box>

        {/* KPI cards */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid rgba(0,0,0,0.1)',
            p: 3,
          }}
        >
          <KpiCards summary={data.summary} metricMode={metricMode} />
        </Box>

        {/* Employee section */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid rgba(0,0,0,0.1)',
            p: 3,
          }}
        >
          <EmployeeSection deals={data.deals} metricMode={metricMode} />
        </Box>
      </Box>

      {/* Right filter sidebar */}
      <FiltersSidebar
        filters={filters}
        managers={mockManagers}
        onPeriodChange={handlePeriodChange}
        onDateFromChange={setLocalDateFrom}
        onDateToChange={setLocalDateTo}
        onOwnerIdsChange={handleOwnerIdsChange}
        onApply={handleFilterApply}
      />

      {/* Setup dialog */}
      {bestGuess.result && (
        <FunnelSetupDialog
          open={setupDialogOpen}
          onClose={() => setSetupDialogOpen(false)}
          onApply={handleSetupApply}
          boards={mockSpaceBoards}
          bestGuessConfig={bestGuess.result.config}
          currentOverrides={overrides}
        />
      )}

      {/* Drilldown drawer */}
      <StageDrilldown
        isOpen={drilldown.isOpen}
        stage={drilldown.stage}
        deals={drilldown.paginatedDeals}
        totalDeals={drilldown.deals.length}
        sortBy={drilldown.sortBy}
        sortOrder={drilldown.sortOrder}
        page={drilldown.page}
        totalPages={drilldown.totalPages}
        metricMode={metricMode}
        onClose={drilldown.closeDrilldown}
        onSort={drilldown.setSort}
        onPageChange={drilldown.setPage}
      />
    </Box>
  );
}
