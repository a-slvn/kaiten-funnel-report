// TypeScript interfaces for Funnel Report (based on API spec)

export type TrendDirection = 'up' | 'down' | 'stable';
export type DeltaSentiment = 'positive' | 'negative' | 'neutral';
export type DealOutcome = 'in_progress' | 'won' | 'lost';
export type ViewMode = 'chart' | 'table';
export type SortOrder = 'asc' | 'desc';

// === Metric mode ===
export type MetricMode = 'amount' | 'count';

// === Best Guess ===
export type BestGuessConfidence = 'high' | 'medium' | 'low';

export interface BestGuessAlert {
  type: 'info' | 'warning';
  code: string;
  message: string;
  action_label: string;
  action_target: 'settings' | 'link';
  action_href?: string;
}

export interface BestGuessResult {
  config: AutoFunnelConfig;
  alerts: BestGuessAlert[];
  confidence: BestGuessConfidence;
  metric_mode: MetricMode;
  metric_mode_reason: string;
}

export interface AutoFunnelConfig {
  space_id: number;
  board_ids: number[];
  stages: AutoStage[];
  win_column_ids: number[];
  loss_column_ids: number[];
  deal_amount_field_id: number | null;
  auto_generated: boolean;
}

export interface AutoStage {
  column_id: number;
  board_id: number;
  board_name: string;
  label: string;
  sort_order: number;
}

export interface CustomFieldDef {
  id: number;
  name: string;
  field_type: 'number' | 'string' | 'date';
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

export interface FunnelStageData {
  stage_column_id: number;
  stage_name: string;
  stage_sort_order: number;
  board_id: number;
  board_name: string;
  stage_role?: ColumnRole;
  deals_entered: number;
  total_amount: number | null;
  deals_with_amount: number;
  deals_without_amount: number;
  avg_amount: number | null;
  conversion_to_next: number | null;
  conversion_to_win: number | null;
  drop_off_rate: number | null;
  avg_duration_days: number | null;
  median_duration_days: number | null;
  deals_currently_on_stage: number;
  stale_deals_count: number;
  stale_threshold_days: number;
}

export interface FunnelSummaryData {
  overall_conversion: number | null;
  total_entered: number;
  total_won: number;
  total_lost: number;
  total_in_progress: number;
  avg_sales_cycle_days: number | null;
  median_sales_cycle_days: number | null;
  pipeline_value: number | null;
  pipeline_deals_count: number;
  pipeline_deals_without_amount: number;
  weighted_pipeline_value: number | null;
  velocity_per_day: number | null;
  avg_won_deal_size: number | null;
  lost_by_stage: LostByStageItem[];
}

export interface LostByStageItem {
  stage_column_id: number;
  stage_name: string;
  count: number;
  amount: number | null;
}

export interface FunnelDealItem {
  card_id: number;
  card_title: string;
  card_url: string;
  responsible: { id: number; full_name: string } | null;
  deal_amount: number | null;
  source: string | null;
  tags: string[];
  entered_at: string;
  exited_at: string | null;
  duration_days: number;
  next_stage_name: string | null;
  outcome: DealOutcome;
  visit_number: number;
  is_stale: boolean;
  stage_column_id: number;
  board_id: number;
}

export interface FunnelReportData {
  stages: FunnelStageData[];
  summary: FunnelSummaryData;
  deals: FunnelDealItem[];
}

export interface FunnelFilters {
  period: PeriodPreset;
  date_from: string;
  date_to: string;
  card_type: string;
}

export type PeriodPreset =
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year';

export interface Manager {
  id: number;
  full_name: string;
  avatar_url?: string;
}

export interface DrilldownState {
  isOpen: boolean;
  stage: FunnelStageData | null;
  deals: FunnelDealItem[];
  sortBy: string;
  sortOrder: SortOrder;
  page: number;
}

export interface FunnelConfig {
  id: number;
  name: string;
  space_id: number;
  space_name: string;
  board_ids: number[];
  stages: { column_id: number; board_id: number; label: string; sort_order: number }[];
  win_column_ids: number[];
  loss_column_ids: number[];
  metric_mode: MetricMode;
  deal_amount_field_id: number | null;
  auto_generated: boolean;
}

// === Configuration / Setup types ===

export type ColumnRole = 'stage' | 'won' | 'lost';

export interface SpaceBoard {
  id: number;
  name: string;
  space_id: number;
  sort_order: number;
  row_sort_order: number;
  columns: SpaceColumn[];
  custom_fields?: CustomFieldDef[];
}

export interface SpaceColumn {
  id: number;
  name: string;
  column_type: 'queue' | 'in_progress' | 'done';
}

export interface BoardSetup {
  board_id: number;
  enabled: boolean;
  columns: ColumnSetup[];
}

export interface ColumnSetup {
  column_id: number;
  column_name: string;
  role: ColumnRole | null;
  enabled: boolean;
}

export interface FunnelSetupConfig {
  boards: BoardSetup[];
  metric_mode: MetricMode;
  deal_amount_field_id: number | null;
}

// === Overrides (user corrections on top of Best Guess) ===

export interface ColumnOverride {
  column_id: number;
  board_id: number;
  enabled: boolean;
  role: ColumnRole;
}

export interface FunnelOverrides {
  columns: ColumnOverride[];
  deal_amount_field_id: number | null;
  metric_mode: MetricMode;
}
