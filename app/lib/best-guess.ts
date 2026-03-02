import type {
  SpaceBoard,
  SpaceColumn,
  AutoStage,
  AutoFunnelConfig,
  BestGuessAlert,
  BestGuessResult,
  BestGuessConfidence,
  MetricMode,
} from './types';
import { ALERT_CODES } from './constants';

// ── Alert catalog ──────────────────────────────────────────────

const ALERT_CATALOG: Record<string, Omit<BestGuessAlert, 'code'>> = {
  [ALERT_CODES.NO_BOARDS]: {
    type: 'warning',
    message:
      'На этом пространстве нет досок. Создайте доску, чтобы построить воронку.',
    action_label: '',
    action_target: 'settings',
  },
  [ALERT_CODES.ALL_COLUMNS_DONE]: {
    type: 'warning',
    message:
      'Все колонки на досках имеют тип «Готово». Добавьте колонки с другими типами для построения этапов воронки.',
    action_label: '',
    action_target: 'settings',
  },
  [ALERT_CODES.NO_DONE_COLUMNS]: {
    type: 'warning',
    message:
      'На досках нет колонок с типом «Готово». Последняя колонка используется как «Выигран». Настройте типы колонок для более точного результата.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
  [ALERT_CODES.SINGLE_DONE_COLUMN]: {
    type: 'info',
    message:
      'Найдена одна завершающая колонка. Она используется как «Выигран». Если у вас есть отдельная колонка для проигранных сделок, укажите её в настройках.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
  [ALERT_CODES.MULTIPLE_DONE_COLUMNS]: {
    type: 'warning',
    message:
      'Найдено несколько завершающих колонок. Последняя определена как «Выигран», остальные — как «Проигран». Проверьте, правильно ли это для вашего процесса.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
  [ALERT_CODES.NO_AMOUNT_FIELD]: {
    type: 'info',
    message:
      'На досках нет числового поля для суммы сделки. Воронка построена по количеству карточек. Добавьте числовое поле, чтобы видеть суммы.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
  [ALERT_CODES.MULTIPLE_AMOUNT_FIELDS]: {
    type: 'info',
    message:
      'Найдено несколько общих числовых полей. Используется первое по алфавиту. Вы можете выбрать другое поле в настройках.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
  [ALERT_CODES.DIFFERENT_AMOUNT_FIELDS]: {
    type: 'warning',
    message:
      'На разных досках используются разные числовые поля. Воронка построена по количеству карточек, так как суммы несопоставимы. Выберите общее поле в настройках.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
  [ALERT_CODES.PARTIAL_AMOUNT_FIELDS]: {
    type: 'warning',
    message:
      'Не на всех досках есть числовое поле. Воронка построена по количеству карточек. Добавьте одинаковое числовое поле на все доски или выберите поле в настройках.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
};

function createAlert(code: string): BestGuessAlert {
  const template = ALERT_CATALOG[code];
  if (!template) {
    return {
      code,
      type: 'info',
      message: code,
      action_label: '',
      action_target: 'settings',
    };
  }
  return { code, ...template };
}

// ── Helpers ────────────────────────────────────────────────────

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function minConfidence(
  a: BestGuessConfidence,
  b: BestGuessConfidence,
): BestGuessConfidence {
  const order: BestGuessConfidence[] = ['low', 'medium', 'high'];
  return order[Math.min(order.indexOf(a), order.indexOf(b))];
}

interface DoneColumn {
  id: number;
  board_id: number;
  name: string;
  sort_order_in_board: number;
}

/**
 * Sort done-columns by global position:
 * board order first (as given), then column position within board.
 */
function sortDoneByGlobalPosition(
  done: DoneColumn[],
  boards: SpaceBoard[],
): DoneColumn[] {
  const boardOrder = new Map(boards.map((b, i) => [b.id, i]));
  return [...done].sort((a, b) => {
    const boa = boardOrder.get(a.board_id) ?? 999;
    const bob = boardOrder.get(b.board_id) ?? 999;
    if (boa !== bob) return boa - bob;
    return a.sort_order_in_board - b.sort_order_in_board;
  });
}

// ── Amount field logic ─────────────────────────────────────────

interface AmountResult {
  field_id: number | null;
  metric_mode: MetricMode;
  reason: string;
  confidence: BestGuessConfidence;
  alerts: BestGuessAlert[];
}

function determineAmountField(
  boards: SpaceBoard[],
): AmountResult {
  const fieldsByBoard = new Map<number, { id: number; name: string }[]>();
  for (const board of boards) {
    const numberFields = (board.custom_fields ?? [])
      .filter((f) => f.field_type === 'number');
    fieldsByBoard.set(
      board.id,
      numberFields.map((f) => ({ id: f.id, name: f.name })),
    );
  }

  // Single board
  if (boards.length === 1) {
    const fields = fieldsByBoard.get(boards[0].id) ?? [];
    if (fields.length === 0) {
      return {
        field_id: null,
        metric_mode: 'count',
        reason: 'no_number_fields',
        confidence: 'high',
        alerts: [createAlert(ALERT_CODES.NO_AMOUNT_FIELD)],
      };
    }
    return {
      field_id: fields[0].id,
      metric_mode: 'amount',
      reason: fields.length === 1 ? 'single_board_first_field' : 'single_board_first_field',
      confidence: 'high',
      alerts: fields.length > 1
        ? [createAlert(ALERT_CODES.MULTIPLE_AMOUNT_FIELDS)]
        : [],
    };
  }

  // Multiple boards
  const boardsWithFields = boards.filter(
    (b) => (fieldsByBoard.get(b.id) ?? []).length > 0,
  );
  const boardsWithoutFields = boards.filter(
    (b) => (fieldsByBoard.get(b.id) ?? []).length === 0,
  );

  if (boardsWithFields.length === 0) {
    return {
      field_id: null,
      metric_mode: 'count',
      reason: 'no_number_fields',
      confidence: 'high',
      alerts: [createAlert(ALERT_CODES.NO_AMOUNT_FIELD)],
    };
  }

  if (boardsWithoutFields.length > 0) {
    return {
      field_id: null,
      metric_mode: 'count',
      reason: 'partial_fields',
      confidence: 'medium',
      alerts: [createAlert(ALERT_CODES.PARTIAL_AMOUNT_FIELDS)],
    };
  }

  // All boards have number fields — find common names
  const nameSets = boardsWithFields.map((b) => {
    const fields = fieldsByBoard.get(b.id) ?? [];
    return new Set(fields.map((f) => normalize(f.name)));
  });

  let commonNames = nameSets[0];
  for (let i = 1; i < nameSets.length; i++) {
    commonNames = new Set([...commonNames].filter((n) => nameSets[i].has(n)));
  }

  if (commonNames.size === 0) {
    return {
      field_id: null,
      metric_mode: 'count',
      reason: 'incompatible_fields_across_boards',
      confidence: 'medium',
      alerts: [createAlert(ALERT_CODES.DIFFERENT_AMOUNT_FIELDS)],
    };
  }

  if (commonNames.size === 1) {
    const commonName = [...commonNames][0];
    const firstBoardFields = fieldsByBoard.get(boardsWithFields[0].id) ?? [];
    const field = firstBoardFields.find(
      (f) => normalize(f.name) === commonName,
    );
    return {
      field_id: field?.id ?? null,
      metric_mode: 'amount',
      reason: 'single_common_field',
      confidence: 'high',
      alerts: [],
    };
  }

  // Multiple common names — pick first alphabetically
  const sortedCommon = [...commonNames].sort();
  const firstName = sortedCommon[0];
  const firstBoardFields = fieldsByBoard.get(boardsWithFields[0].id) ?? [];
  const field = firstBoardFields.find(
    (f) => normalize(f.name) === firstName,
  );
  return {
    field_id: field?.id ?? null,
    metric_mode: 'amount',
    reason: 'first_common_field',
    confidence: 'medium',
    alerts: [createAlert(ALERT_CODES.MULTIPLE_AMOUNT_FIELDS)],
  };
}

// ── Main algorithm ─────────────────────────────────────────────

export function runBestGuess(boards: SpaceBoard[]): BestGuessResult {
  const alerts: BestGuessAlert[] = [];

  // Step 1: Check boards
  if (boards.length === 0) {
    return {
      config: {
        space_id: 0,
        board_ids: [],
        stages: [],
        win_column_ids: [],
        loss_column_ids: [],
        deal_amount_field_id: null,
        auto_generated: true,
      },
      alerts: [createAlert(ALERT_CODES.NO_BOARDS)],
      confidence: 'low',
      metric_mode: 'count',
      metric_mode_reason: 'no_boards',
    };
  }

  const spaceId = boards[0].space_id;
  const boardIds = boards.map((b) => b.id);

  // Step 2 + 3: Collect columns, split into stages and done
  const stages: AutoStage[] = [];
  const doneColumns: DoneColumn[] = [];
  let globalSort = 0;

  for (const board of boards) {
    for (let colIdx = 0; colIdx < board.columns.length; colIdx++) {
      const col: SpaceColumn = board.columns[colIdx];
      if (col.column_type === 'done') {
        doneColumns.push({
          id: col.id,
          board_id: board.id,
          name: col.name,
          sort_order_in_board: colIdx,
        });
      } else {
        globalSort += 1;
        stages.push({
          column_id: col.id,
          board_id: board.id,
          board_name: board.name,
          label: col.name,
          sort_order: globalSort,
        });
      }
    }
  }

  // Edge case: all columns done
  if (stages.length === 0) {
    return {
      config: {
        space_id: spaceId,
        board_ids: boardIds,
        stages: [],
        win_column_ids: [],
        loss_column_ids: [],
        deal_amount_field_id: null,
        auto_generated: true,
      },
      alerts: [createAlert(ALERT_CODES.ALL_COLUMNS_DONE)],
      confidence: 'low',
      metric_mode: 'count',
      metric_mode_reason: 'no_stages',
    };
  }

  // Step 4: Determine won/lost
  let winColumnIds: number[] = [];
  let lossColumnIds: number[] = [];
  let confidence: BestGuessConfidence = 'high';

  if (doneColumns.length === 0) {
    // No done columns — last stage becomes won
    const lastStage = stages.pop()!;
    winColumnIds = [lastStage.column_id];
    lossColumnIds = [];
    confidence = 'low';
    alerts.push(createAlert(ALERT_CODES.NO_DONE_COLUMNS));
  } else if (doneColumns.length === 1) {
    winColumnIds = [doneColumns[0].id];
    lossColumnIds = [];
    confidence = 'medium';
    alerts.push(createAlert(ALERT_CODES.SINGLE_DONE_COLUMN));
  } else if (doneColumns.length === 2) {
    const sorted = sortDoneByGlobalPosition(doneColumns, boards);
    winColumnIds = [sorted[sorted.length - 1].id];
    lossColumnIds = [sorted[0].id];
    confidence = 'high';
  } else {
    // 3+ done columns
    const sorted = sortDoneByGlobalPosition(doneColumns, boards);
    winColumnIds = [sorted[sorted.length - 1].id];
    lossColumnIds = sorted.slice(0, -1).map((d) => d.id);
    confidence = 'medium';
    alerts.push(createAlert(ALERT_CODES.MULTIPLE_DONE_COLUMNS));
  }

  // Step 5: Determine amount field
  const amountResult = determineAmountField(boards);
  alerts.push(...amountResult.alerts);
  confidence = minConfidence(confidence, amountResult.confidence);

  // Step 6: Assemble result
  return {
    config: {
      space_id: spaceId,
      board_ids: boardIds,
      stages,
      win_column_ids: winColumnIds,
      loss_column_ids: lossColumnIds,
      deal_amount_field_id: amountResult.field_id,
      auto_generated: true,
    },
    alerts,
    confidence,
    metric_mode: amountResult.metric_mode,
    metric_mode_reason: amountResult.reason,
  };
}
