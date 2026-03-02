import type {
  FunnelFilters,
  FunnelReportData,
  FunnelDealItem,
  FunnelStageData,
  LostByStageItem,
  MetricMode,
  DealOutcome,
} from '@/lib/types';
import { mockStages } from './mock-stages';
import { mockDeals, type MockDeal } from './mock-deals';
import type { ActiveFunnelColumn } from '@/lib/funnel-columns';
import { buildStageTemplatesFromColumns } from '@/lib/funnel-columns';

type ReassignedDeal = MockDeal;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function buildStageMetrics(
  deals: ReassignedDeal[],
  metricMode: MetricMode,
  stageTemplates?: FunnelStageData[],
  activeColumns?: ActiveFunnelColumn[],
): FunnelStageData[] {
  const source = stageTemplates ?? mockStages;
  const stagesSorted = [...source].sort((a, b) => a.stage_sort_order - b.stage_sort_order);
  const lastStageSortOrder = stagesSorted[stagesSorted.length - 1]?.stage_sort_order ?? 0;

  // Build local sort order map from the active stages
  const localSortOrder = new Map(source.map((s) => [s.stage_column_id, s.stage_sort_order]));
  const getSort = (colId: number) => localSortOrder.get(colId) ?? null;
  const roleByColumnId = new Map(
    (activeColumns ?? []).map((column) => [column.column_id, column.role]),
  );

  return stagesSorted.map((stage) => {
    const currentStageDeals = deals.filter((deal) => deal.stage_column_id === stage.stage_column_id);
    const role = roleByColumnId.get(stage.stage_column_id) ?? 'stage';
    const enteredDeals = role === 'stage'
      ? deals.filter((deal) => {
          const sortOrder = getSort(deal.stage_column_id);
          return sortOrder != null && sortOrder >= stage.stage_sort_order;
        })
      : currentStageDeals;

    const movedForwardCount = role === 'stage'
      ? deals.filter((deal) => {
          const sortOrder = getSort(deal.stage_column_id);
          return sortOrder != null && sortOrder > stage.stage_sort_order;
        }).length
      : 0;

    const dealsEntered = enteredDeals.length;
    const isLastStage = role !== 'stage' || stage.stage_sort_order >= lastStageSortOrder;

    // Keep amount aggregates available in both modes so the chart can show count + amount together.
    const enteredWithAmount = enteredDeals.filter((deal) => deal.deal_amount != null);
    const dealsWithAmount = enteredWithAmount.length;
    const dealsWithoutAmount = dealsEntered - dealsWithAmount;
    const amountSum = enteredWithAmount.reduce((sum, deal) => sum + (deal.deal_amount ?? 0), 0);
    const totalAmount = dealsWithAmount > 0 ? amountSum : null;
    const avgAmount = dealsWithAmount > 0 ? amountSum / dealsWithAmount : null;

    const wonFromStage = enteredDeals.filter((deal) => deal.outcome === 'won').length;
    const lostOnStage = currentStageDeals.filter((deal) => deal.outcome === 'lost').length;

    const closedVisits = currentStageDeals
      .filter((deal) => deal.exited_at != null)
      .map((deal) => deal.duration_days);

    return {
      ...stage,
      deals_entered: dealsEntered,
      total_amount: totalAmount,
      deals_with_amount: dealsWithAmount,
      deals_without_amount: dealsWithoutAmount,
      avg_amount: avgAmount,
      conversion_to_next: isLastStage
        ? null
        : dealsEntered > 0
          ? movedForwardCount / dealsEntered
          : null,
      conversion_to_win: dealsEntered > 0 ? wonFromStage / dealsEntered : null,
      drop_off_rate: dealsEntered > 0 ? lostOnStage / dealsEntered : null,
      avg_duration_days: average(closedVisits),
      median_duration_days: median(closedVisits),
      deals_currently_on_stage: role === 'stage'
        ? currentStageDeals.filter((deal) => deal.outcome === 'in_progress').length
        : currentStageDeals.length,
      stale_deals_count: currentStageDeals.filter(
        (deal) => deal.outcome === 'in_progress' && deal.is_stale
      ).length,
    };
  });
}

function buildLostByStage(
  deals: ReassignedDeal[],
  stages: FunnelStageData[],
  metricMode: MetricMode,
): LostByStageItem[] {
  return stages.map((stage) => {
    const lostDeals = deals.filter(
      (deal) => deal.stage_column_id === stage.stage_column_id && deal.outcome === 'lost'
    );

    let amount: number | null = null;
    if (metricMode === 'amount') {
      const withAmount = lostDeals.filter((deal) => deal.deal_amount != null);
      if (withAmount.length > 0) {
        amount = withAmount.reduce((sum, deal) => sum + (deal.deal_amount ?? 0), 0);
      }
    }

    return {
      stage_column_id: stage.stage_column_id,
      stage_name: stage.stage_name,
      count: lostDeals.length,
      amount,
    };
  });
}

function findFirstOutcomeColumn(
  activeColumns: ActiveFunnelColumn[],
  boardId: number,
  role: DealOutcome,
): ActiveFunnelColumn | undefined {
  const targetRole = role === 'won' ? 'won' : 'lost';
  return activeColumns.find(
    (column) => column.board_id === boardId && column.role === targetRole,
  );
}

function reassignDealsToActiveColumns(
  deals: MockDeal[],
  activeColumns: ActiveFunnelColumn[],
): ReassignedDeal[] {
  if (activeColumns.length === 0) return [];

  const activeColumnIds = new Set(activeColumns.map((column) => column.column_id));

  return deals.flatMap((deal) => {
    let assignedColumnId: number | null = null;

    if (deal.outcome === 'in_progress') {
      assignedColumnId = activeColumnIds.has(deal.stage_column_id)
        ? deal.stage_column_id
        : null;
    } else {
      const outcomeColumn = findFirstOutcomeColumn(activeColumns, deal.board_id, deal.outcome);
      assignedColumnId = outcomeColumn?.column_id ?? null;
    }

    if (assignedColumnId == null) return [];

    return [{ ...deal, stage_column_id: assignedColumnId }];
  });
}

export function getFunnelData(
  filters: FunnelFilters,
  metricMode: MetricMode,
  boardIds?: number[],
  customStages?: FunnelStageData[],
  customDeals?: MockDeal[],
  activeColumns?: ActiveFunnelColumn[],
): FunnelReportData {
  const sourceDeals = customDeals ?? mockDeals;
  let deals: MockDeal[] = [...sourceDeals];

  // Filter by board
  if (boardIds && boardIds.length > 0) {
    deals = deals.filter((d) => boardIds.includes(d.board_id));
  }

  // Filter by card type/source
  if (filters.card_type) {
    deals = deals.filter((d) => d.source === filters.card_type);
  }

  const resolvedActiveColumns = activeColumns ?? [];
  const resolvedStages = resolvedActiveColumns.length > 0
    ? buildStageTemplatesFromColumns(resolvedActiveColumns)
    : (customStages ?? mockStages);
  const reassignedDeals = resolvedActiveColumns.length > 0
    ? reassignDealsToActiveColumns(deals, resolvedActiveColumns)
    : deals;
  const stages = buildStageMetrics(reassignedDeals, metricMode, resolvedStages, resolvedActiveColumns);

  const totalEntered = stages[0]?.deals_entered ?? 0;
  const totalWon = reassignedDeals.filter((deal) => deal.outcome === 'won').length;
  const totalLost = reassignedDeals.filter((deal) => deal.outcome === 'lost').length;
  const totalInProgress = reassignedDeals.filter((deal) => deal.outcome === 'in_progress').length;

  const overallConversion = totalEntered > 0 ? totalWon / totalEntered : null;

  // Amount-dependent summary metrics
  let avgWonDealSize: number | null = null;
  let pipelineValue: number | null = null;
  let pipelineDealsWithoutAmount = 0;
  let weightedPipelineValue: number | null = null;
  let velocityPerDay: number | null = null;

  const activeDeals = reassignedDeals.filter((deal) => deal.outcome === 'in_progress');

  if (metricMode === 'amount') {
    const wonWithAmount = reassignedDeals.filter((deal) => deal.outcome === 'won' && deal.deal_amount != null);
    avgWonDealSize = wonWithAmount.length > 0
      ? wonWithAmount.reduce((sum, deal) => sum + (deal.deal_amount ?? 0), 0) / wonWithAmount.length
      : null;

    const activeDealsWithAmount = activeDeals.filter((deal) => deal.deal_amount != null);
    pipelineValue = activeDealsWithAmount.length > 0
      ? activeDealsWithAmount.reduce((sum, deal) => sum + (deal.deal_amount ?? 0), 0)
      : null;
    pipelineDealsWithoutAmount = activeDeals.filter((deal) => deal.deal_amount == null).length;

    const totalStages = stages.length;
    const localSortOrder = new Map(resolvedStages.map((s) => [s.stage_column_id, s.stage_sort_order]));
    const wpv = activeDealsWithAmount.reduce((sum, deal) => {
      const sortOrder = localSortOrder.get(deal.stage_column_id) ?? null;
      if (sortOrder == null) return sum;
      const probability = sortOrder / totalStages;
      return sum + (deal.deal_amount ?? 0) * probability;
    }, 0);
    weightedPipelineValue = activeDealsWithAmount.length > 0 ? Math.round(wpv) : null;
  }

  const wonCycleSamples = reassignedDeals
    .filter((deal) => deal.outcome === 'won')
    .map((deal) => deal.duration_days);
  const avgSalesCycleDays = average(wonCycleSamples);
  const medianSalesCycleDays = median(wonCycleSamples);

  if (
    metricMode === 'amount' &&
    overallConversion != null &&
    avgWonDealSize != null &&
    avgSalesCycleDays != null &&
    avgSalesCycleDays > 0
  ) {
    velocityPerDay = (totalEntered * overallConversion * avgWonDealSize) / avgSalesCycleDays;
  }

  return {
    stages,
    summary: {
      overall_conversion: overallConversion,
      total_entered: totalEntered,
      total_won: totalWon,
      total_lost: totalLost,
      total_in_progress: totalInProgress,
      avg_sales_cycle_days: avgSalesCycleDays,
      median_sales_cycle_days: medianSalesCycleDays,
      pipeline_value: pipelineValue,
      pipeline_deals_count: activeDeals.length,
      pipeline_deals_without_amount: pipelineDealsWithoutAmount,
      weighted_pipeline_value: weightedPipelineValue,
      velocity_per_day: velocityPerDay,
      avg_won_deal_size: avgWonDealSize,
      lost_by_stage: buildLostByStage(reassignedDeals, stages, metricMode),
    },
    deals: reassignedDeals,
  };
}

export function getDealsByStage(
  stageColumnId: number,
  allDeals: FunnelDealItem[]
): FunnelDealItem[] {
  return allDeals.filter(
    (deal) => deal.stage_column_id === stageColumnId
  );
}
