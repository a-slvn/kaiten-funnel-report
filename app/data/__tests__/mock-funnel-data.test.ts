import { describe, expect, it } from 'vitest';
import { getFunnelData } from '../mock-funnel-data';
import { buildActiveFunnelColumns } from '@/lib/funnel-columns';
import type { ColumnOverride, FunnelFilters, SpaceBoard } from '@/lib/types';
import type { MockDeal } from '../mock-deals';

const baseFilters: FunnelFilters = {
  period: 'this_month',
  date_from: '2026-03-01',
  date_to: '2026-03-31',
  card_type: '',
};

const boards: SpaceBoard[] = [
  {
    id: 1,
    name: 'Сделки',
    space_id: 100,
    sort_order: 1,
    row_sort_order: 1,
    columns: [
      { id: 10, name: 'Лид', column_type: 'queue' },
      { id: 11, name: 'Переговоры', column_type: 'in_progress' },
      { id: 12, name: 'Оплачено', column_type: 'done' },
      { id: 13, name: 'Отказ', column_type: 'done' },
    ],
    custom_fields: [],
  },
];

const deals: MockDeal[] = [
  {
    card_id: 1,
    card_title: 'Сделка 1',
    card_url: '/1',
    responsible: null,
    deal_amount: 1000,
    source: 'Сайт',
    tags: [],
    entered_at: '2026-03-01T10:00:00Z',
    exited_at: null,
    duration_days: 3,
    next_stage_name: null,
    outcome: 'in_progress',
    visit_number: 1,
    is_stale: false,
    stage_column_id: 10,
    board_id: 1,
  },
  {
    card_id: 2,
    card_title: 'Сделка 2',
    card_url: '/2',
    responsible: null,
    deal_amount: 2000,
    source: 'Сайт',
    tags: [],
    entered_at: '2026-03-02T10:00:00Z',
    exited_at: null,
    duration_days: 5,
    next_stage_name: null,
    outcome: 'in_progress',
    visit_number: 1,
    is_stale: false,
    stage_column_id: 11,
    board_id: 1,
  },
  {
    card_id: 3,
    card_title: 'Сделка 3',
    card_url: '/3',
    responsible: null,
    deal_amount: 3000,
    source: 'Сайт',
    tags: [],
    entered_at: '2026-03-03T10:00:00Z',
    exited_at: '2026-03-08T10:00:00Z',
    duration_days: 5,
    next_stage_name: null,
    outcome: 'won',
    visit_number: 1,
    is_stale: false,
    stage_column_id: 11,
    board_id: 1,
  },
  {
    card_id: 4,
    card_title: 'Сделка 4',
    card_url: '/4',
    responsible: null,
    deal_amount: 1500,
    source: 'Сайт',
    tags: [],
    entered_at: '2026-03-04T10:00:00Z',
    exited_at: '2026-03-06T10:00:00Z',
    duration_days: 2,
    next_stage_name: null,
    outcome: 'lost',
    visit_number: 1,
    is_stale: false,
    stage_column_id: 10,
    board_id: 1,
  },
];

describe('getFunnelData with manual overrides', () => {
  it('builds the same number of chart columns as enabled columns in setup', () => {
    const overrides: ColumnOverride[] = [
      { column_id: 10, board_id: 1, enabled: true, role: 'stage' },
      { column_id: 11, board_id: 1, enabled: true, role: 'stage' },
      { column_id: 12, board_id: 1, enabled: true, role: 'won' },
      { column_id: 13, board_id: 1, enabled: true, role: 'lost' },
    ];

    const data = getFunnelData(
      baseFilters,
      'count',
      undefined,
      undefined,
      deals,
      buildActiveFunnelColumns(boards, overrides),
    );

    expect(data.stages.map((stage) => stage.stage_column_id)).toEqual([10, 11, 12, 13]);
    expect(data.deals.filter((deal) => deal.stage_column_id === 12)).toHaveLength(1);
    expect(data.deals.filter((deal) => deal.stage_column_id === 13)).toHaveLength(1);
  });

  it('removes disabled columns from the chart and recalculates assigned deals', () => {
    const overrides: ColumnOverride[] = [
      { column_id: 10, board_id: 1, enabled: true, role: 'stage' },
      { column_id: 11, board_id: 1, enabled: true, role: 'stage' },
      { column_id: 12, board_id: 1, enabled: false, role: 'won' },
      { column_id: 13, board_id: 1, enabled: true, role: 'lost' },
    ];

    const data = getFunnelData(
      baseFilters,
      'count',
      undefined,
      undefined,
      deals,
      buildActiveFunnelColumns(boards, overrides),
    );

    expect(data.stages.map((stage) => stage.stage_column_id)).toEqual([10, 11, 13]);
    expect(data.summary.total_won).toBe(0);
    expect(data.deals.some((deal) => deal.card_id === 3)).toBe(false);
    expect(data.deals.filter((deal) => deal.stage_column_id === 13)).toHaveLength(1);
  });
});
