import type {
  AutoFunnelConfig,
  ColumnOverride,
  ColumnRole,
  FunnelStageData,
  SpaceBoard,
} from './types';

export interface ActiveFunnelColumn {
  column_id: number;
  board_id: number;
  board_name: string;
  stage_name: string;
  stage_sort_order: number;
  role: ColumnRole;
}

export function buildColumnOverridesFromBestGuess(
  boards: SpaceBoard[],
  config: AutoFunnelConfig,
): ColumnOverride[] {
  const stageColumnIds = new Set(config.stages.map((stage) => stage.column_id));
  const winColumnIds = new Set(config.win_column_ids);
  const lossColumnIds = new Set(config.loss_column_ids);

  const overrides: ColumnOverride[] = [];

  for (const board of boards) {
    for (const column of board.columns) {
      let enabled = false;
      let role: ColumnRole = 'stage';

      if (stageColumnIds.has(column.id)) {
        enabled = true;
        role = 'stage';
      } else if (winColumnIds.has(column.id)) {
        enabled = true;
        role = 'won';
      } else if (lossColumnIds.has(column.id)) {
        enabled = true;
        role = 'lost';
      }

      overrides.push({
        column_id: column.id,
        board_id: board.id,
        enabled,
        role,
      });
    }
  }

  return overrides;
}

export function buildActiveFunnelColumns(
  boards: SpaceBoard[],
  columns: ColumnOverride[],
): ActiveFunnelColumn[] {
  const overridesByColumnId = new Map(
    columns.map((column) => [column.column_id, column]),
  );
  const activeColumns: ActiveFunnelColumn[] = [];
  let sortOrder = 0;

  for (const board of boards) {
    for (const column of board.columns) {
      const override = overridesByColumnId.get(column.id);
      if (!override?.enabled) continue;

      sortOrder += 1;
      activeColumns.push({
        column_id: column.id,
        board_id: board.id,
        board_name: board.name,
        stage_name: column.name,
        stage_sort_order: sortOrder,
        role: override.role,
      });
    }
  }

  return activeColumns;
}

export function buildStageTemplatesFromColumns(
  activeColumns: ActiveFunnelColumn[],
): FunnelStageData[] {
  return activeColumns.map((column) => ({
    stage_column_id: column.column_id,
    stage_name: column.stage_name,
    stage_sort_order: column.stage_sort_order,
    board_id: column.board_id,
    board_name: column.board_name,
    stage_role: column.role,
    deals_entered: 0,
    total_amount: null,
    deals_with_amount: 0,
    deals_without_amount: 0,
    avg_amount: null,
    conversion_to_next: null,
    conversion_to_win: null,
    drop_off_rate: null,
    avg_duration_days: null,
    median_duration_days: null,
    deals_currently_on_stage: 0,
    stale_deals_count: 0,
    stale_threshold_days: 7,
  }));
}
