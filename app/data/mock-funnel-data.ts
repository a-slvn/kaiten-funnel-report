import type {
  FunnelFilters,
  FunnelReportData,
  FunnelDealItem,
  FunnelStageData,
  LostByStageItem,
  MetricMode,
} from '@/lib/types';
import { mockStages } from './mock-stages';
import { mockDeals, type MockDeal } from './mock-deals';

const STAGE_SORT_ORDER = new Map(
  mockStages.map((stage) => [stage.stage_column_id, stage.stage_sort_order])
);

function getStageSortOrder(stageId: number): number | null {
  return STAGE_SORT_ORDER.get(stageId) ?? null;
}

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

function buildStageMetrics(deals: MockDeal[], metricMode: MetricMode): FunnelStageData[] {
  const stagesSorted = [...mockStages].sort((a, b) => a.stage_sort_order - b.stage_sort_order);
  const lastStageSortOrder = stagesSorted[stagesSorted.length - 1]?.stage_sort_order ?? 0;

  return stagesSorted.map((stage) => {
    const currentStageDeals = deals.filter((deal) => deal.stage_column_id === stage.stage_column_id);
    const enteredDeals = deals.filter((deal) => {
      const sortOrder = getStageSortOrder(deal.stage_column_id);
      return sortOrder != null && sortOrder >= stage.stage_sort_order;
    });

    const movedForwardCount = deals.filter((deal) => {
      const sortOrder = getStageSortOrder(deal.stage_column_id);
      return sortOrder != null && sortOrder > stage.stage_sort_order;
    }).length;

    const dealsEntered = enteredDeals.length;
    const isLastStage = stage.stage_sort_order >= lastStageSortOrder;

    // Amount metrics: only compute when metricMode === 'amount'
    let totalAmount: number | null = null;
    let dealsWithAmount = 0;
    let dealsWithoutAmount = dealsEntered;
    let avgAmount: number | null = null;

    if (metricMode === 'amount') {
      const enteredWithAmount = enteredDeals.filter((deal) => deal.deal_amount != null);
      dealsWithAmount = enteredWithAmount.length;
      dealsWithoutAmount = dealsEntered - dealsWithAmount;
      const sum = enteredWithAmount.reduce((s, deal) => s + (deal.deal_amount ?? 0), 0);
      totalAmount = dealsWithAmount > 0 ? sum : null;
      avgAmount = dealsWithAmount > 0 ? sum / dealsWithAmount : null;
    }

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
      deals_currently_on_stage: currentStageDeals.filter((deal) => deal.outcome === 'in_progress').length,
      stale_deals_count: currentStageDeals.filter(
        (deal) => deal.outcome === 'in_progress' && deal.is_stale
      ).length,
    };
  });
}

function buildLostByStage(deals: MockDeal[], stages: FunnelStageData[], metricMode: MetricMode): LostByStageItem[] {
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

export function getFunnelData(
  filters: FunnelFilters,
  metricMode: MetricMode,
  boardIds?: number[],
): FunnelReportData {
  let deals: MockDeal[] = [...mockDeals];

  // Filter by board
  if (boardIds && boardIds.length > 0) {
    deals = deals.filter((d) => boardIds.includes(d.board_id));
  }

  // Filter by owner
  if (filters.owner_ids.length > 0) {
    deals = deals.filter(
      (d) => d.responsible && filters.owner_ids.includes(d.responsible.id)
    );
  }

  const stages = buildStageMetrics(deals, metricMode);

  const totalEntered = stages[0]?.deals_entered ?? 0;
  const totalWon = deals.filter((deal) => deal.outcome === 'won').length;
  const totalLost = deals.filter((deal) => deal.outcome === 'lost').length;
  const totalInProgress = deals.filter((deal) => deal.outcome === 'in_progress').length;

  const overallConversion = totalEntered > 0 ? totalWon / totalEntered : null;

  // Amount-dependent summary metrics
  let avgWonDealSize: number | null = null;
  let pipelineValue: number | null = null;
  let pipelineDealsWithoutAmount = 0;
  let weightedPipelineValue: number | null = null;
  let velocityPerDay: number | null = null;

  const activeDeals = deals.filter((deal) => deal.outcome === 'in_progress');

  if (metricMode === 'amount') {
    const wonWithAmount = deals.filter((deal) => deal.outcome === 'won' && deal.deal_amount != null);
    avgWonDealSize = wonWithAmount.length > 0
      ? wonWithAmount.reduce((sum, deal) => sum + (deal.deal_amount ?? 0), 0) / wonWithAmount.length
      : null;

    const activeDealsWithAmount = activeDeals.filter((deal) => deal.deal_amount != null);
    pipelineValue = activeDealsWithAmount.length > 0
      ? activeDealsWithAmount.reduce((sum, deal) => sum + (deal.deal_amount ?? 0), 0)
      : null;
    pipelineDealsWithoutAmount = activeDeals.filter((deal) => deal.deal_amount == null).length;

    const totalStages = stages.length;
    const wpv = activeDealsWithAmount.reduce((sum, deal) => {
      const sortOrder = getStageSortOrder(deal.stage_column_id);
      if (sortOrder == null) return sum;
      const probability = sortOrder / totalStages;
      return sum + (deal.deal_amount ?? 0) * probability;
    }, 0);
    weightedPipelineValue = activeDealsWithAmount.length > 0 ? Math.round(wpv) : null;
  }

  const wonCycleSamples = deals
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
      lost_by_stage: buildLostByStage(deals, stages, metricMode),
    },
    deals,
  };
}

export function getDealsByStage(
  stageColumnId: number,
  allDeals: FunnelDealItem[]
): FunnelDealItem[] {
  return allDeals.filter(
    (d) => (d as FunnelDealItem & { stage_column_id: number }).stage_column_id === stageColumnId
  );
}
