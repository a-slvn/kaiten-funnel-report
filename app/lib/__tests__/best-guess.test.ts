import { describe, it, expect } from 'vitest';
import { runBestGuess } from '../best-guess';
import type { SpaceBoard } from '../types';
import { ALERT_CODES } from '../constants';

// ── Helpers ────────────────────────────────────────────────────

function makeBoard(overrides: Partial<SpaceBoard> & Pick<SpaceBoard, 'id' | 'columns'>): SpaceBoard {
  return {
    name: `Board ${overrides.id}`,
    space_id: 100,
    sort_order: 1,
    row_sort_order: 1,
    ...overrides,
  };
}

function hasAlert(codes: string[], target: string): boolean {
  return codes.includes(target);
}

function getAlert(result: ReturnType<typeof runBestGuess>, code: string) {
  return result.alerts.find((alert) => alert.code === code);
}

// ── Tests ──────────────────────────────────────────────────────

describe('runBestGuess', () => {
  // Case 1: 0 boards → NO_BOARDS
  it('returns NO_BOARDS alert when no boards provided', () => {
    const result = runBestGuess([]);

    expect(result.confidence).toBe('low');
    expect(result.metric_mode).toBe('count');
    expect(result.config.stages).toHaveLength(0);
    expect(result.alerts.map((a) => a.code)).toContain(ALERT_CODES.NO_BOARDS);
  });

  // Case 2: All columns done → ALL_COLUMNS_DONE
  it('returns ALL_COLUMNS_DONE when every column is done', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Завершён', column_type: 'done' },
          { id: 11, name: 'Архив', column_type: 'done' },
        ],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.config.stages).toHaveLength(0);
    expect(result.confidence).toBe('low');
    expect(result.alerts.map((a) => a.code)).toContain(ALERT_CODES.ALL_COLUMNS_DONE);
  });

  // Case 3: 1 board, 2 done, 1 number field → ideal case
  it('handles ideal single-board case (2 done, 1 amount field)', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Лид', column_type: 'queue' },
          { id: 11, name: 'Встреча', column_type: 'in_progress' },
          { id: 12, name: 'Выигран', column_type: 'done' },
          { id: 13, name: 'Проигран', column_type: 'done' },
        ],
        custom_fields: [
          { id: 901, name: 'Сумма сделки', field_type: 'number' },
        ],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.confidence).toBe('high');
    expect(result.metric_mode).toBe('amount');
    expect(result.config.stages).toHaveLength(2);
    expect(result.config.stages.map((s) => s.label)).toEqual(['Лид', 'Встреча']);
    expect(result.config.win_column_ids).toEqual([12]); // first done = won
    expect(result.config.loss_column_ids).toEqual([13]); // after won = lost
    expect(result.config.deal_amount_field_id).toBe(901);
    expect(result.alerts).toHaveLength(0);
  });

  it('falls back to count for a single board with multiple amount fields', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Лид', column_type: 'queue' },
          { id: 11, name: 'Выигран', column_type: 'done' },
        ],
        custom_fields: [
          { id: 901, name: 'Сумма сделки', field_type: 'number' },
          { id: 902, name: 'Бюджет', field_type: 'number' },
        ],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.metric_mode).toBe('count');
    expect(result.metric_mode_reason).toBe('ambiguous_amount_fields');
    expect(result.config.deal_amount_field_id).toBeNull();
    expect(result.alerts.map((a) => a.code)).toContain(ALERT_CODES.MULTIPLE_AMOUNT_FIELDS);
  });

  // Case 4: 1 board, 0 done → last stage becomes won
  it('uses last stage as won when no done columns exist', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Новый', column_type: 'queue' },
          { id: 11, name: 'В работе', column_type: 'in_progress' },
          { id: 12, name: 'Завершён', column_type: 'in_progress' },
        ],
        custom_fields: [
          { id: 901, name: 'Бюджет', field_type: 'number' },
        ],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.confidence).toBe('low');
    expect(result.config.stages).toHaveLength(2); // Новый, В работе
    expect(result.config.win_column_ids).toEqual([12]); // Завершён popped
    expect(result.config.loss_column_ids).toEqual([]);
    expect(result.alerts.map((a) => a.code)).toContain(ALERT_CODES.NO_DONE_COLUMNS);
  });

  // Case 5: 1 board, 1 done → SINGLE_DONE_COLUMN
  it('reports SINGLE_DONE_COLUMN with 1 done column', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Лид', column_type: 'queue' },
          { id: 11, name: 'Выигран', column_type: 'done' },
        ],
        custom_fields: [],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.config.win_column_ids).toEqual([11]);
    expect(result.config.loss_column_ids).toEqual([]);
    expect(result.confidence).toBe('medium');
    const codes = result.alerts.map((a) => a.code);
    expect(hasAlert(codes, ALERT_CODES.SINGLE_DONE_COLUMN)).toBe(true);
    // Also no amount field
    expect(hasAlert(codes, ALERT_CODES.NO_AMOUNT_FIELD)).toBe(true);
  });

  // Case 6: 1 board, 3+ trailing done → only last two stay terminal
  it('keeps only the two rightmost trailing done columns as outcomes', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Лид', column_type: 'queue' },
          { id: 11, name: 'Отложен', column_type: 'done' },
          { id: 12, name: 'Отказ', column_type: 'done' },
          { id: 13, name: 'Оплачено', column_type: 'done' },
        ],
        custom_fields: [
          { id: 901, name: 'Сумма', field_type: 'number' },
        ],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.confidence).toBe('medium');
    expect(result.config.stages.map((stage) => stage.label)).toEqual(['Лид', 'Отложен']);
    expect(result.config.win_column_ids).toEqual([12]);
    expect(result.config.loss_column_ids).toEqual([13]);
    expect(result.alerts.map((a) => a.code)).toContain(ALERT_CODES.MULTIPLE_DONE_COLUMNS);
  });

  // Case 7: N boards, common amount field → amount mode
  it('detects common amount field across multiple boards', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        sort_order: 1,
        row_sort_order: 1,
        columns: [
          { id: 10, name: 'Лид', column_type: 'queue' },
          { id: 11, name: 'Готов', column_type: 'done' },
        ],
        custom_fields: [
          { id: 901, name: 'Бюджет', field_type: 'number' },
        ],
      }),
      makeBoard({
        id: 2,
        sort_order: 1,
        row_sort_order: 2,
        columns: [
          { id: 20, name: 'Встреча', column_type: 'in_progress' },
          { id: 21, name: 'Выигран', column_type: 'done' },
        ],
        custom_fields: [
          { id: 902, name: 'Бюджет', field_type: 'number' },
        ],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.metric_mode).toBe('amount');
    expect(result.metric_mode_reason).toBe('single_common_field');
    expect(result.config.deal_amount_field_id).toBe(901); // from first board
  });

  // Case 8: N boards, different amount fields → count fallback
  it('falls back to count when boards have different amount fields', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Лид', column_type: 'queue' },
          { id: 11, name: 'Готов', column_type: 'done' },
        ],
        custom_fields: [
          { id: 901, name: 'Оценка бюджета', field_type: 'number' },
        ],
      }),
      makeBoard({
        id: 2,
        columns: [
          { id: 20, name: 'Сделка', column_type: 'in_progress' },
          { id: 21, name: 'Выигран', column_type: 'done' },
        ],
        custom_fields: [
          { id: 902, name: 'Сумма контракта', field_type: 'number' },
        ],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.metric_mode).toBe('count');
    expect(result.config.deal_amount_field_id).toBeNull();
    const alert = getAlert(result, ALERT_CODES.DIFFERENT_AMOUNT_FIELDS);
    expect(alert).toBeDefined();
    expect(alert?.action_target).toBe('link');
    expect(alert?.action_label).toBe('Как настроить сумму');
  });

  // Case 9: N boards, partial amount fields → count fallback
  it('falls back to count when some boards lack number fields', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Лид', column_type: 'queue' },
          { id: 11, name: 'Готов', column_type: 'done' },
        ],
        custom_fields: [
          { id: 901, name: 'Сумма', field_type: 'number' },
        ],
      }),
      makeBoard({
        id: 2,
        columns: [
          { id: 20, name: 'Сделка', column_type: 'in_progress' },
          { id: 21, name: 'Выигран', column_type: 'done' },
        ],
        custom_fields: [], // no number fields
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.metric_mode).toBe('count');
    const alert = getAlert(result, ALERT_CODES.PARTIAL_AMOUNT_FIELDS);
    expect(alert).toBeDefined();
    expect(alert?.action_target).toBe('link');
    expect(alert?.action_label).toBe('Как настроить сумму');
  });

  // Case 10: Full mock data scenario (3 boards from mock-boards)
  it('correctly processes the full CRM mock scenario', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        name: 'Лиды',
        sort_order: 1,
        row_sort_order: 1,
        columns: [
          { id: 101, name: 'Новые', column_type: 'queue' },
          { id: 102, name: 'Квалификация', column_type: 'in_progress' },
          { id: 103, name: 'Квалифицирован', column_type: 'done' },
        ],
        custom_fields: [
          { id: 901, name: 'Бюджет', field_type: 'number' },
        ],
      }),
      makeBoard({
        id: 2,
        name: 'Сделки',
        sort_order: 1,
        row_sort_order: 2,
        columns: [
          { id: 201, name: 'Встреча', column_type: 'queue' },
          { id: 202, name: 'Предложение', column_type: 'in_progress' },
          { id: 203, name: 'Переговоры', column_type: 'in_progress' },
          { id: 204, name: 'Оплачено', column_type: 'done' },
          { id: 205, name: 'Отказ', column_type: 'done' },
        ],
        custom_fields: [
          { id: 902, name: 'Сумма сделки', field_type: 'number' },
          { id: 903, name: 'Дата следующего контакта', field_type: 'date' },
        ],
      }),
      makeBoard({
        id: 3,
        name: 'Аккаунтинг',
        sort_order: 2,
        row_sort_order: 2,
        columns: [
          { id: 301, name: 'Onboarding', column_type: 'in_progress' },
          { id: 302, name: 'Активный клиент', column_type: 'done' },
        ],
        custom_fields: [
          { id: 904, name: 'LTV', field_type: 'number' },
        ],
      }),
    ];

    const result = runBestGuess(boards);

    // 6 stages (non-done columns)
    expect(result.config.stages).toHaveLength(6);
    expect(result.config.stages.map((s) => s.label)).toEqual([
      'Новые', 'Квалификация', 'Встреча', 'Предложение', 'Переговоры', 'Onboarding',
    ]);

    // Done columns: 103, 204, 205, 302 → paid should be detected as successful result
    expect(result.config.win_column_ids).toEqual([204]);
    expect(result.config.loss_column_ids).toEqual([205, 103, 302]);

    // Confidence: medium (3+ done columns)
    expect(result.confidence).toBe('medium');
    expect(result.alerts.map((a) => a.code)).toContain(ALERT_CODES.MULTIPLE_DONE_COLUMNS);

    // Amount fields: different names (Бюджет, Сумма сделки, LTV) → count
    expect(result.metric_mode).toBe('count');
    expect(result.config.deal_amount_field_id).toBeNull();
    expect(result.alerts.map((a) => a.code)).toContain(ALERT_CODES.DIFFERENT_AMOUNT_FIELDS);

    // Board IDs
    expect(result.config.board_ids).toEqual([1, 2, 3]);
    expect(result.config.space_id).toBe(100);
    expect(result.config.auto_generated).toBe(true);
  });

  // Case 11: No number fields at all → NO_AMOUNT_FIELD
  it('reports NO_AMOUNT_FIELD when no boards have number fields', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Лид', column_type: 'queue' },
          { id: 11, name: 'Проигран', column_type: 'done' },
          { id: 12, name: 'Выигран', column_type: 'done' },
        ],
        custom_fields: [],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.metric_mode).toBe('count');
    expect(result.config.deal_amount_field_id).toBeNull();
    const alert = getAlert(result, ALERT_CODES.NO_AMOUNT_FIELD);
    expect(alert).toBeDefined();
    expect(alert?.action_target).toBe('link');
    expect(alert?.action_label).toBe('Как настроить сумму');
  });

  // Case 12: Multiple common fields → MULTIPLE_AMOUNT_FIELDS
  it('falls back to count with MULTIPLE_AMOUNT_FIELDS alert when several common fields exist', () => {
    const boards: SpaceBoard[] = [
      makeBoard({
        id: 1,
        columns: [
          { id: 10, name: 'Лид', column_type: 'queue' },
          { id: 11, name: 'Готов', column_type: 'done' },
          { id: 12, name: 'Отказ', column_type: 'done' },
        ],
        custom_fields: [
          { id: 901, name: 'Сумма', field_type: 'number' },
          { id: 902, name: 'Бюджет', field_type: 'number' },
        ],
      }),
      makeBoard({
        id: 2,
        columns: [
          { id: 20, name: 'Сделка', column_type: 'in_progress' },
          { id: 21, name: 'Выигран', column_type: 'done' },
        ],
        custom_fields: [
          { id: 903, name: 'Бюджет', field_type: 'number' },
          { id: 904, name: 'Сумма', field_type: 'number' },
        ],
      }),
    ];

    const result = runBestGuess(boards);

    expect(result.metric_mode).toBe('count');
    expect(result.metric_mode_reason).toBe('ambiguous_amount_fields');
    expect(result.config.deal_amount_field_id).toBeNull();
    const alert = getAlert(result, ALERT_CODES.MULTIPLE_AMOUNT_FIELDS);
    expect(alert).toBeDefined();
    expect(alert?.action_target).toBe('link');
    expect(alert?.action_label).toBe('Как настроить сумму');
  });
});
