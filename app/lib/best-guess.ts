import type {
  SpaceBoard,
  SpaceColumn,
  AutoStage,
  BestGuessAlert,
  BestGuessResult,
  BestGuessConfidence,
  MetricMode,
} from './types';
import { ALERT_CODES } from './constants';

// ── Alert catalog ──────────────────────────────────────────────

const KAITEN_SUM_FIELD_ARTICLE_URL =
  'https://faq-ru.kaiten.site/99d5507a-4522-4641-927b-4d99954be51e';

const ALERT_CATALOG: Record<string, Omit<BestGuessAlert, 'code'>> = {
  [ALERT_CODES.NO_BOARDS]: {
    type: 'warning',
    message:
      'В пространстве пока нет досок. Создайте доску, чтобы построить воронку.',
    action_label: '',
    action_target: 'settings',
  },
  [ALERT_CODES.ALL_COLUMNS_DONE]: {
    type: 'warning',
    message:
      'На всех досках колонки помечены как «Готово». Проверьте типы колонок, чтобы построить этапы воронки.',
    action_label: '',
    action_target: 'settings',
  },
  [ALERT_CODES.NO_DONE_COLUMNS]: {
    type: 'warning',
    message:
      'На досках нет колонок с типом «Готово». Поэтому последнюю колонку мы считаем успешным результатом. Добавьте колонки «Готово», чтобы воронка считалась точнее.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
  [ALERT_CODES.SINGLE_DONE_COLUMN]: {
    type: 'info',
    message:
      'Нашли одну финальную колонку. Сейчас считаем её успешным результатом. Если для проигранных сделок есть отдельная колонка, укажите её в настройках.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
  [ALERT_CODES.MULTIPLE_DONE_COLUMNS]: {
    type: 'warning',
    message:
      'Нашли несколько финальных колонок. Мы оставили две крайние справа как итоговые, а остальные вернули в этапы воронки. Проверьте, подходит ли это вашему процессу.',
    action_label: 'Настроить',
    action_target: 'settings',
  },
  [ALERT_CODES.NO_AMOUNT_FIELD]: {
    type: 'info',
    message:
      'На досках нет числового поля с суммой. Поэтому воронку считаем по количеству сделок. Настройте поле суммы на досках, чтобы видеть суммы по этапам.',
    action_label: 'Как настроить сумму',
    action_target: 'link',
    action_href: KAITEN_SUM_FIELD_ARTICLE_URL,
  },
  [ALERT_CODES.MULTIPLE_AMOUNT_FIELDS]: {
    type: 'info',
    message:
      'Нашли несколько общих числовых полей. Поэтому воронку считаем по количеству сделок. Настройте на досках одно общее поле суммы, чтобы отчет мог считать деньги.',
    action_label: 'Как настроить сумму',
    action_target: 'link',
    action_href: KAITEN_SUM_FIELD_ARTICLE_URL,
  },
  [ALERT_CODES.DIFFERENT_AMOUNT_FIELDS]: {
    type: 'warning',
    message:
      'На досках используются разные поля с суммой. Их нельзя сравнить между собой, поэтому сейчас считаем воронку по количеству сделок. Настройте на досках одно общее поле суммы.',
    action_label: 'Как настроить сумму',
    action_target: 'link',
    action_href: KAITEN_SUM_FIELD_ARTICLE_URL,
  },
  [ALERT_CODES.PARTIAL_AMOUNT_FIELDS]: {
    type: 'warning',
    message:
      'Поле с суммой есть не на всех досках. Поэтому сейчас считаем воронку по количеству сделок. Настройте одинаковое поле суммы на всех досках.',
    action_label: 'Как настроить сумму',
    action_target: 'link',
    action_href: KAITEN_SUM_FIELD_ARTICLE_URL,
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

const WIN_DONE_KEYWORDS = [
  'оплач',
  'выигр',
  'успеш',
  'won',
  'paid',
  'активный клиент',
];

const LOSS_DONE_KEYWORDS = [
  'отказ',
  'проиг',
  'lost',
  'cancel',
  'отмен',
  'неусп',
];

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

interface ForcedTrailingOutcomeResolution {
  stageLikeDoneIds: number[];
  winColumnIds: number[];
  lossColumnIds: number[];
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

function hasKeywordMatch(name: string, keywords: string[]): boolean {
  const normalized = normalize(name);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function resolveTrailingDoneColumnsAsCrmTail(
  boards: SpaceBoard[],
  doneColumns: DoneColumn[],
): ForcedTrailingOutcomeResolution | null {
  if (doneColumns.length < 3) {
    return null;
  }

  for (let boardIndex = boards.length - 1; boardIndex >= 0; boardIndex -= 1) {
    const board = boards[boardIndex];
    const trailingDoneColumns: DoneColumn[] = [];

    for (let columnIndex = board.columns.length - 1; columnIndex >= 0; columnIndex -= 1) {
      const column = board.columns[columnIndex];
      if (column.column_type !== 'done') {
        break;
      }

      trailingDoneColumns.unshift({
        id: column.id,
        board_id: board.id,
        name: column.name,
        sort_order_in_board: columnIndex,
      });
    }

    if (trailingDoneColumns.length < 3 || trailingDoneColumns.length !== doneColumns.length) {
      continue;
    }

    const wonColumn = trailingDoneColumns[trailingDoneColumns.length - 2];
    const lostColumn = trailingDoneColumns[trailingDoneColumns.length - 1];

    return {
      stageLikeDoneIds: trailingDoneColumns
        .slice(0, -2)
        .map((column) => column.id),
      winColumnIds: [wonColumn.id],
      lossColumnIds: [lostColumn.id],
    };
  }

  return null;
}

function pickWonAndLostColumns(
  doneColumns: DoneColumn[],
  boards: SpaceBoard[],
): { winColumnIds: number[]; lossColumnIds: number[] } {
  const sorted = sortDoneByGlobalPosition(doneColumns, boards);
  const semanticWin = sorted.find((column) =>
    hasKeywordMatch(column.name, WIN_DONE_KEYWORDS),
  );
  const semanticLossIds = new Set(
    sorted
      .filter((column) => hasKeywordMatch(column.name, LOSS_DONE_KEYWORDS))
      .map((column) => column.id),
  );

  const wonColumn = semanticWin ?? sorted[0];
  const remainingColumns = sorted.filter((column) => column.id !== wonColumn.id);
  const prioritizedLosses = remainingColumns.filter((column) =>
    semanticLossIds.has(column.id),
  );
  const fallbackLosses = remainingColumns.filter(
    (column) => !semanticLossIds.has(column.id),
  );

  return {
    winColumnIds: [wonColumn.id],
    lossColumnIds: [...prioritizedLosses, ...fallbackLosses].map((column) => column.id),
  };
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
      field_id: fields.length === 1 ? fields[0].id : null,
      metric_mode: fields.length === 1 ? 'amount' : 'count',
      reason: fields.length === 1 ? 'single_board_first_field' : 'ambiguous_amount_fields',
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

  // Multiple common names — fallback to count until boards are normalized
  return {
    field_id: null,
    metric_mode: 'count',
    reason: 'ambiguous_amount_fields',
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
  const doneColumns: DoneColumn[] = [];

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
      }
    }
  }

  const forcedTrailingResolution = resolveTrailingDoneColumnsAsCrmTail(boards, doneColumns);
  const stageLikeDoneIds = new Set(forcedTrailingResolution?.stageLikeDoneIds ?? []);
  const stages: AutoStage[] = [];
  let globalSort = 0;

  for (const board of boards) {
    for (const col of board.columns) {
      const isStage = col.column_type !== 'done' || stageLikeDoneIds.has(col.id);
      if (!isStage) continue;

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
  } else if (forcedTrailingResolution) {
    winColumnIds = forcedTrailingResolution.winColumnIds;
    lossColumnIds = forcedTrailingResolution.lossColumnIds;
    confidence = 'medium';
    alerts.push(createAlert(ALERT_CODES.MULTIPLE_DONE_COLUMNS));
  } else if (doneColumns.length === 2) {
    const resolved = pickWonAndLostColumns(doneColumns, boards);
    winColumnIds = resolved.winColumnIds;
    lossColumnIds = resolved.lossColumnIds;
    confidence = 'high';
  } else {
    const resolved = pickWonAndLostColumns(doneColumns, boards);
    winColumnIds = resolved.winColumnIds;
    lossColumnIds = resolved.lossColumnIds;
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
