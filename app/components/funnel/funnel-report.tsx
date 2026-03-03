'use client';

import { useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TuneIcon from '@mui/icons-material/Tune';

import { KpiCards } from './kpi-cards';
import { FunnelChart } from './funnel-chart';
import { FiltersSidebar } from './filters-sidebar';
import { StageDrilldown } from './stage-drilldown';
import { EmployeeSection } from './employee-section';
import { AlertBanner } from './alert-banner';
import { FunnelSetupDialog } from './funnel-setup-dialog';

import { useFilters } from '@/lib/hooks/use-filters';
import { useFunnelData } from '@/lib/hooks/use-funnel-data';
import { useBestGuess } from '@/lib/hooks/use-best-guess';
import { useDrilldown } from '@/lib/hooks/use-drilldown';
import { useScenario } from '@/lib/scenario-context';
import { buildActiveFunnelColumns, buildColumnOverridesFromBestGuess } from '@/lib/funnel-columns';
import { ScenarioSwitcher } from './scenario-switcher';
import type { PeriodPreset, FunnelOverrides } from '@/lib/types';

const STAGE_DRILLDOWN_ENABLED = false;

export function FunnelReport() {
  const { scenario } = useScenario();

  return <ScenarioFunnelReport key={scenario.id} scenario={scenario} />;
}

function ScenarioFunnelReport({ scenario }: { scenario: ReturnType<typeof useScenario>['scenario'] }) {
  const bestGuess = useBestGuess(scenario.boards);

  const [setupDialogOpen, setSetupDialogOpen] = useState(false);

  const { filters, setPeriod, setCardType } = useFilters();

  // Overrides from setup dialog (persisted in session)
  const [overrides, setOverrides] = useState<FunnelOverrides | null>(null);

  // Dismissed alerts (session-only)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const metricMode = overrides?.metric_mode ?? bestGuess.result?.metric_mode ?? 'count';

  const effectiveColumns = useMemo(() => {
    if (!bestGuess.result) return [];
    return overrides?.columns ?? buildColumnOverridesFromBestGuess(scenario.boards, bestGuess.result.config);
  }, [bestGuess.result, overrides?.columns, scenario.boards]);

  const activeColumns = useMemo(
    () => buildActiveFunnelColumns(scenario.boards, effectiveColumns),
    [scenario.boards, effectiveColumns],
  );

  // Data fetching with metric mode — uses stages/deals from active scenario
  const { data, isLoading } = useFunnelData(
    filters,
    metricMode,
    bestGuess.result?.config.board_ids,
    scenario.stages,
    scenario.deals,
    activeColumns,
  );

  const drilldown = useDrilldown(data?.deals ?? []);

  const handlePeriodChange = useCallback(
    (period: PeriodPreset) => {
      setPeriod(period);
    },
    [setPeriod]
  );

  const handleCardTypeChange = useCallback((cardType: string) => {
    setCardType(cardType);
  }, [setCardType]);

  const handleFilterApply = useCallback(() => {
    // In real app: trigger data fetch with updated filters
  }, []);

  const cardTypes = useMemo(() => {
    return [...new Set(scenario.deals.map((deal) => deal.source).filter((source): source is string => Boolean(source)))];
  }, [scenario.deals]);

  const handleOpenSetup = useCallback(() => {
    setSetupDialogOpen(true);
  }, []);

  const handleSetupApply = useCallback((newOverrides: FunnelOverrides) => {
    setOverrides(newOverrides);
    setSetupDialogOpen(false);
  }, []);

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
              Конверсия по этапам
            </Typography>
          </Box>

          <FunnelChart
            stages={data.stages}
            onStageClick={drilldown.openDrilldown}
            metricMode={metricMode}
            interactive={STAGE_DRILLDOWN_ENABLED}
          />
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
        cardTypes={cardTypes}
        onPeriodChange={handlePeriodChange}
        onCardTypeChange={handleCardTypeChange}
        onApply={handleFilterApply}
      />

      {/* Setup dialog */}
      {bestGuess.result && (
        <FunnelSetupDialog
          open={setupDialogOpen}
          onClose={() => setSetupDialogOpen(false)}
          onApply={handleSetupApply}
          boards={scenario.boards}
          bestGuessConfig={bestGuess.result.config}
          currentOverrides={overrides}
        />
      )}

      {/* Scenario switcher (QA debug panel) */}
      <ScenarioSwitcher />

      {/* Drilldown drawer */}
      {STAGE_DRILLDOWN_ENABLED && (
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
      )}
    </Box>
  );
}
