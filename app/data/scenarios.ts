import type { SpaceBoard, FunnelStageData } from '@/lib/types';
import type { MockDeal } from './mock-deals';
import { ALERT_CODES } from '@/lib/constants';

export type ScenarioGroup = 'smoke' | 'metric' | 'alerts' | 'edge';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  group: ScenarioGroup;
  testCaseRef: string;
  precondition: string;
  action: string;
  expectedResult: string[];
  expectedAlerts: string[];
  expectedStagesCount: number;
  boards: SpaceBoard[];
  stages: FunnelStageData[];
  deals: MockDeal[];
}

function stageTemplate(
  columnId: number,
  boardId: number,
  boardName: string,
  stageName: string,
  sortOrder: number,
  thresholdDays = 7,
): FunnelStageData {
  return {
    stage_column_id: columnId,
    board_id: boardId,
    board_name: boardName,
    stage_name: stageName,
    stage_sort_order: sortOrder,
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
    stale_threshold_days: thresholdDays,
  };
}

function cloneBoards(boards: SpaceBoard[]): SpaceBoard[] {
  return boards.map((board) => ({
    ...board,
    columns: board.columns.map((column) => ({ ...column })),
    custom_fields: (board.custom_fields ?? []).map((field) => ({ ...field })),
  }));
}

function cloneStages(stages: FunnelStageData[]): FunnelStageData[] {
  return stages.map((stage) => ({ ...stage }));
}

function cloneDeals(deals: MockDeal[]): MockDeal[] {
  return deals.map((deal) => ({
    ...deal,
    responsible: deal.responsible ? { ...deal.responsible } : null,
    tags: [...deal.tags],
  }));
}

function generateDeals(
  stageConfigs: Array<{
    stageId: number;
    stageName: string;
    boardId: number;
    count: number;
    wonCount?: number;
    lostCount?: number;
    hasAmount?: boolean;
    source?: string;
  }>,
): MockDeal[] {
  const deals: MockDeal[] = [];
  let idx = 0;

  for (const cfg of stageConfigs) {
    const total = cfg.count;
    const won = cfg.wonCount ?? 0;
    const lost = cfg.lostCount ?? 0;
    const inProgress = Math.max(0, total - won - lost);

    for (let i = 0; i < inProgress; i++) {
      deals.push(makeDeal(idx++, cfg.stageId, cfg.stageName, cfg.boardId, 'in_progress', cfg.hasAmount ?? true, cfg.source));
    }
    for (let i = 0; i < won; i++) {
      deals.push(makeDeal(idx++, cfg.stageId, cfg.stageName, cfg.boardId, 'won', cfg.hasAmount ?? true, cfg.source));
    }
    for (let i = 0; i < lost; i++) {
      deals.push(makeDeal(idx++, cfg.stageId, cfg.stageName, cfg.boardId, 'lost', cfg.hasAmount ?? true, cfg.source));
    }
  }

  return deals;
}

function makeDeal(
  index: number,
  stageId: number,
  stageName: string,
  boardId: number,
  outcome: 'in_progress' | 'won' | 'lost',
  hasAmount: boolean,
  forcedSource?: string,
): MockDeal {
  const cardId = 91001 + index;
  const seed = cardId;
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);

  const companies = ['Газпром', 'Яндекс', 'Сбербанк', 'МТС', 'Ozon', 'Wildberries', 'Тинькофф', 'ВТБ'];
  const managers = [
    { id: 301, full_name: 'Иванов Пётр' },
    { id: 302, full_name: 'Петрова Анна' },
    { id: 303, full_name: 'Сидоров Михаил' },
    { id: 304, full_name: 'Козлова Елена' },
  ];
  const sources = ['Сайт', 'Холодный звонок', 'Рекомендация', 'Выставка'];
  const amounts = [50000, 75000, 100000, 150000, 200000, 250000, 300000, 400000, 500000];

  const company = companies[Math.floor(rand * companies.length)];
  const manager = managers[Math.floor(Math.abs(Math.sin(seed * 2) * 10000) % managers.length)];
  const durationDays = Math.floor(rand * 14) + 1;
  const dealAmount = hasAmount ? amounts[index % amounts.length] : null;
  const enteredAt = `2024-06-${String(Math.floor(rand * 27) + 1).padStart(2, '0')}T10:00:00Z`;
  const exitedAt = outcome === 'in_progress'
    ? null
    : new Date(new Date(enteredAt).getTime() + durationDays * 86400000).toISOString();

  return {
    card_id: cardId,
    card_title: `Контракт с ${company}`,
    card_url: `/spaces/100/boards/${boardId}/cards/${cardId}`,
    responsible: manager,
    deal_amount: dealAmount,
    source: forcedSource ?? sources[index % sources.length],
    tags: ['enterprise'],
    entered_at: enteredAt,
    exited_at: exitedAt,
    duration_days: durationDays,
    next_stage_name: outcome === 'in_progress' ? stageName : null,
    outcome,
    visit_number: 1,
    is_stale: outcome === 'in_progress' && durationDays > 10,
    stage_column_id: stageId,
    board_id: boardId,
  };
}

const SPACE_ID = 100;

const CLEAN_BOARDS: SpaceBoard[] = [
  {
    id: 21,
    name: 'Лиды',
    space_id: SPACE_ID,
    sort_order: 1,
    row_sort_order: 1,
    columns: [
      { id: 2101, name: 'Новые', column_type: 'queue' },
      { id: 2102, name: 'Квалификация', column_type: 'in_progress' },
    ],
    custom_fields: [
      { id: 9101, name: 'Сумма сделки', field_type: 'number' },
    ],
  },
  {
    id: 22,
    name: 'Сделки',
    space_id: SPACE_ID,
    sort_order: 1,
    row_sort_order: 2,
    columns: [
      { id: 2201, name: 'Встреча', column_type: 'queue' },
      { id: 2202, name: 'Предложение', column_type: 'in_progress' },
      { id: 2203, name: 'Переговоры', column_type: 'in_progress' },
      { id: 2204, name: 'Оплачено', column_type: 'done' },
      { id: 2205, name: 'Отказ', column_type: 'done' },
    ],
    custom_fields: [
      { id: 9201, name: 'Сумма сделки', field_type: 'number' },
    ],
  },
];

const CLEAN_STAGES: FunnelStageData[] = [
  stageTemplate(2101, 21, 'Лиды', 'Новые', 1),
  stageTemplate(2102, 21, 'Лиды', 'Квалификация', 2),
  stageTemplate(2201, 22, 'Сделки', 'Встреча', 3),
  stageTemplate(2202, 22, 'Сделки', 'Предложение', 4),
  stageTemplate(2203, 22, 'Сделки', 'Переговоры', 5),
];

const CLEAN_DEALS = generateDeals([
  { stageId: 2101, stageName: 'Новые', boardId: 21, count: 18, wonCount: 0, lostCount: 0, hasAmount: true, source: 'Сайт' },
  { stageId: 2102, stageName: 'Квалификация', boardId: 21, count: 14, wonCount: 0, lostCount: 0, hasAmount: true, source: 'Рекомендация' },
  { stageId: 2201, stageName: 'Встреча', boardId: 22, count: 11, wonCount: 0, lostCount: 0, hasAmount: true, source: 'Выставка' },
  { stageId: 2202, stageName: 'Предложение', boardId: 22, count: 8, wonCount: 0, lostCount: 0, hasAmount: true, source: 'Сайт' },
  { stageId: 2203, stageName: 'Переговоры', boardId: 22, count: 10, wonCount: 4, lostCount: 2, hasAmount: true, source: 'Холодный звонок' },
]);

const MULTIPLE_DONE_BOARDS: SpaceBoard[] = [
  {
    id: 31,
    name: 'Сделки',
    space_id: SPACE_ID,
    sort_order: 1,
    row_sort_order: 1,
    columns: [
      { id: 3101, name: 'Новые', column_type: 'queue' },
      { id: 3102, name: 'Квалификация', column_type: 'in_progress' },
      { id: 3103, name: 'Переговоры', column_type: 'in_progress' },
      { id: 3104, name: 'Оплачено', column_type: 'done' },
      { id: 3105, name: 'Отказ', column_type: 'done' },
      { id: 3106, name: 'Заморожено', column_type: 'done' },
    ],
    custom_fields: [
      { id: 9301, name: 'Сумма сделки', field_type: 'number' },
    ],
  },
];

const MULTIPLE_DONE_STAGES: FunnelStageData[] = [
  stageTemplate(3101, 31, 'Сделки', 'Новые', 1),
  stageTemplate(3102, 31, 'Сделки', 'Квалификация', 2),
  stageTemplate(3103, 31, 'Сделки', 'Переговоры', 3),
  stageTemplate(3104, 31, 'Сделки', 'Оплачено', 4),
];

const MULTIPLE_DONE_DEALS = generateDeals([
  { stageId: 3101, stageName: 'Новые', boardId: 31, count: 14, hasAmount: true, source: 'Сайт' },
  { stageId: 3102, stageName: 'Квалификация', boardId: 31, count: 11, hasAmount: true, source: 'Рекомендация' },
  { stageId: 3103, stageName: 'Переговоры', boardId: 31, count: 9, wonCount: 3, lostCount: 2, hasAmount: true, source: 'Выставка' },
]);

export const scenarios: Scenario[] = [
  {
    id: 'smoke-open-report',
    name: 'TC-01: график строится сразу',
    description: 'Чистый happy path без предупреждений. Проверяет только сам факт, что отчёт строится и заполнен данными.',
    group: 'smoke',
    testCaseRef: 'TC-01',
    precondition: 'Выбран сценарий с полной воронкой, двумя итоговыми колонками и общим полем суммы.',
    action: 'Открыть отчёт и дождаться загрузки первого экрана.',
    expectedResult: [
      'На экране отображаются 5 этапов воронки без пустого состояния.',
      'Появляются заполненные KPI и блок "По сотрудникам".',
      'Отчёт строится сразу, без промежуточного экрана настройки.',
    ],
    expectedAlerts: [],
    expectedStagesCount: 5,
    boards: cloneBoards(CLEAN_BOARDS),
    stages: cloneStages(CLEAN_STAGES),
    deals: cloneDeals(CLEAN_DEALS),
  },
  {
    id: 'metric-count-no-amount',
    name: 'TC-02: count без суммы',
    description: 'Проверяет отдельный кейс, когда график считается только по количеству и суммы полностью недоступны.',
    group: 'metric',
    testCaseRef: 'TC-02',
    precondition: 'Выбран сценарий с полной воронкой, но без числовых полей на всех досках.',
    action: 'Открыть отчёт, проверить шапку графика, alert и модалку "Настроить воронку".',
    expectedResult: [
      'На графике показываются только количества сделок и переходы между этапами.',
      'В шапке графика нет кнопок переключения метрики.',
      'В модалке настройки отсутствует блок выбора числового поля для суммы.',
      'Показан только alert "NO_AMOUNT_FIELD" со ссылкой на документацию по настройке суммы на доске.',
    ],
    expectedAlerts: [ALERT_CODES.NO_AMOUNT_FIELD],
    expectedStagesCount: 5,
    boards: cloneBoards(CLEAN_BOARDS).map((board) => ({ ...board, custom_fields: [] })),
    stages: cloneStages(CLEAN_STAGES),
    deals: cloneDeals(CLEAN_DEALS).map((deal) => ({ ...deal, deal_amount: null })),
  },
  {
    id: 'metric-amount-common-field',
    name: 'TC-03: amount с общим полем',
    description: 'Проверяет отдельный кейс, когда на всех досках есть одно и то же поле суммы и график можно строить по деньгам.',
    group: 'metric',
    testCaseRef: 'TC-03',
    precondition: 'Выбран сценарий с общим полем "Сумма сделки" на всех досках.',
    action: 'Открыть отчёт, проверить график и затем открыть модалку "Настроить воронку".',
    expectedResult: [
      'В шапке графика нет кнопок переключения метрики.',
      'Ось графика и значения внутри этапов показывают деньги, а не количество сделок.',
      'В блоках KPI отображаются денежные показатели.',
      'В модалке настройки отсутствует блок выбора числового поля для суммы.',
    ],
    expectedAlerts: [],
    expectedStagesCount: 5,
    boards: cloneBoards(CLEAN_BOARDS),
    stages: cloneStages(CLEAN_STAGES),
    deals: cloneDeals(CLEAN_DEALS),
  },
  {
    id: 'alert-different-amount-fields',
    name: 'TC-04: разные поля суммы',
    description: 'Отдельный alert-кейс: отчёт построен, но суммы нельзя использовать как общую метрику.',
    group: 'alerts',
    testCaseRef: 'TC-04',
    precondition: 'Выбран сценарий с одинаковой воронкой, но на досках разные названия числовых полей.',
    action: 'Открыть отчёт, проверить баннер и затем открыть модалку "Настроить воронку".',
    expectedResult: [
      'График и KPI построены.',
      'Показан только alert "DIFFERENT_AMOUNT_FIELDS" со ссылкой на документацию по настройке суммы на досках.',
      'В шапке графика нет кнопок переключения метрики, а отчёт падает в count-fallback, потому что поля несопоставимы.',
      'В модалке настройки отсутствует блок выбора числового поля для суммы.',
    ],
    expectedAlerts: [ALERT_CODES.DIFFERENT_AMOUNT_FIELDS],
    expectedStagesCount: 5,
    boards: cloneBoards(CLEAN_BOARDS).map((board, index) => ({
      ...board,
      custom_fields: [{ id: 9401 + index, name: index === 0 ? 'Бюджет' : 'Сумма сделки', field_type: 'number' as const }],
    })),
    stages: cloneStages(CLEAN_STAGES),
    deals: cloneDeals(CLEAN_DEALS),
  },
  {
    id: 'alert-multiple-common-amount-fields',
    name: 'TC-05: несколько общих полей суммы',
    description: 'Отдельный alert-кейс: общих числовых полей несколько, поэтому отчёт автоматически переходит на количество сделок.',
    group: 'alerts',
    testCaseRef: 'TC-05',
    precondition: 'На обеих досках есть два одинаковых по названию числовых поля.',
    action: 'Открыть отчёт, проверить предупреждение и затем открыть модалку "Настроить воронку".',
    expectedResult: [
      'Показан только alert "MULTIPLE_AMOUNT_FIELDS" со ссылкой на документацию по настройке суммы на досках.',
      'В шапке графика нет кнопок переключения метрики, потому что поле суммы определяется неоднозначно.',
      'График по умолчанию строится по количеству сделок.',
      'Отчёт остаётся заполненным, несмотря на неоднозначность выбора поля.',
      'В модалке настройки отсутствует блок выбора числового поля для суммы.',
    ],
    expectedAlerts: [ALERT_CODES.MULTIPLE_AMOUNT_FIELDS],
    expectedStagesCount: 5,
    boards: cloneBoards(CLEAN_BOARDS).map((board, index) => ({
      ...board,
      custom_fields: [
        { id: 9501 + index * 10, name: 'Сумма сделки', field_type: 'number' as const },
        { id: 9502 + index * 10, name: 'Бюджет', field_type: 'number' as const },
      ],
    })),
    stages: cloneStages(CLEAN_STAGES),
    deals: cloneDeals(CLEAN_DEALS),
  },
  {
    id: 'alert-partial-amount-fields',
    name: 'TC-06: поле суммы есть не везде',
    description: 'Отдельный alert-кейс: часть досок имеет числовое поле, часть нет.',
    group: 'alerts',
    testCaseRef: 'TC-06',
    precondition: 'У первой доски есть поле суммы, у второй доски его нет.',
    action: 'Открыть отчёт, проверить предупреждение и затем открыть модалку "Настроить воронку".',
    expectedResult: [
      'Показан только alert "PARTIAL_AMOUNT_FIELDS" со ссылкой на документацию по настройке суммы на досках.',
      'В шапке графика нет кнопок переключения метрики.',
      'График остаётся построенным по количеству сделок.',
      'В модалке настройки отсутствует блок выбора числового поля для суммы.',
    ],
    expectedAlerts: [ALERT_CODES.PARTIAL_AMOUNT_FIELDS],
    expectedStagesCount: 5,
    boards: [
      {
        ...cloneBoards(CLEAN_BOARDS)[0],
        custom_fields: [{ id: 9601, name: 'Сумма сделки', field_type: 'number' as const }],
      },
      {
        ...cloneBoards(CLEAN_BOARDS)[1],
        custom_fields: [],
      },
    ],
    stages: cloneStages(CLEAN_STAGES),
    deals: cloneDeals(CLEAN_DEALS).map((deal) => (deal.board_id === 21 ? deal : { ...deal, deal_amount: null })),
  },
  {
    id: 'alert-multiple-done-columns',
    name: 'TC-07: много done-колонок',
    description: 'Отдельный alert-кейс: система нашла больше двух итоговых колонок.',
    group: 'alerts',
    testCaseRef: 'TC-07',
    precondition: 'Выбран сценарий, где в одной доске есть три итоговые done-колонки.',
    action: 'Открыть отчёт и затем открыть "Настроить воронку".',
    expectedResult: [
      'Показан только alert "MULTIPLE_DONE_COLUMNS".',
      'График при этом заполнен данными.',
      'В модалке настройки видны все итоговые колонки для ручной проверки ролей.',
      'В модалке настройки отсутствует блок выбора числового поля для суммы.',
    ],
    expectedAlerts: [ALERT_CODES.MULTIPLE_DONE_COLUMNS],
    expectedStagesCount: 4,
    boards: cloneBoards(MULTIPLE_DONE_BOARDS),
    stages: cloneStages(MULTIPLE_DONE_STAGES),
    deals: cloneDeals(MULTIPLE_DONE_DEALS),
  },
  {
    id: 'alert-single-done-column',
    name: 'TC-08: одна done-колонка',
    description: 'Отдельный alert-кейс: система нашла только одну итоговую колонку.',
    group: 'alerts',
    testCaseRef: 'TC-08',
    precondition: 'Выбран сценарий с одной доской: рабочие этапы плюс одна done-колонка.',
    action: 'Открыть отчёт и проверить alert.',
    expectedResult: [
      'Показан только alert "SINGLE_DONE_COLUMN".',
      'Воронка содержит рабочие этапы и не падает в пустое состояние.',
      'Отчёт остаётся заполненным данными.',
    ],
    expectedAlerts: [ALERT_CODES.SINGLE_DONE_COLUMN],
    expectedStagesCount: 2,
    boards: [
      {
        id: 41,
        name: 'Сделки',
        space_id: SPACE_ID,
        sort_order: 1,
        row_sort_order: 1,
        columns: [
          { id: 4101, name: 'Новые', column_type: 'queue' },
          { id: 4102, name: 'Квалификация', column_type: 'in_progress' },
          { id: 4103, name: 'Выигран', column_type: 'done' },
        ],
        custom_fields: [
          { id: 9701, name: 'Сумма сделки', field_type: 'number' },
        ],
      },
    ],
    stages: [
      stageTemplate(4101, 41, 'Сделки', 'Новые', 1),
      stageTemplate(4102, 41, 'Сделки', 'Квалификация', 2),
    ],
    deals: generateDeals([
      { stageId: 4101, stageName: 'Новые', boardId: 41, count: 12, hasAmount: true, source: 'Сайт' },
      { stageId: 4102, stageName: 'Квалификация', boardId: 41, count: 9, wonCount: 4, lostCount: 0, hasAmount: true, source: 'Рекомендация' },
    ]),
  },
  {
    id: 'alert-no-done-columns',
    name: 'TC-09: нет done-колонок',
    description: 'Отдельный alert-кейс: система не нашла ни одной done-колонки и включила fallback.',
    group: 'alerts',
    testCaseRef: 'TC-09',
    precondition: 'Выбран сценарий, где на доске есть только рабочие этапы.',
    action: 'Открыть отчёт и проверить поведение fallback.',
    expectedResult: [
      'Показан только alert "NO_DONE_COLUMNS".',
      'График строится по рабочим этапам.',
      'Последний рабочий этап используется системой как финальный fallback.',
    ],
    expectedAlerts: [ALERT_CODES.NO_DONE_COLUMNS],
    expectedStagesCount: 2,
    boards: [
      {
        id: 42,
        name: 'Сделки',
        space_id: SPACE_ID,
        sort_order: 1,
        row_sort_order: 1,
        columns: [
          { id: 4201, name: 'Новые', column_type: 'queue' },
          { id: 4202, name: 'Квалификация', column_type: 'in_progress' },
          { id: 4203, name: 'Встреча', column_type: 'in_progress' },
        ],
        custom_fields: [
          { id: 9801, name: 'Сумма сделки', field_type: 'number' },
        ],
      },
    ],
    stages: [
      stageTemplate(4201, 42, 'Сделки', 'Новые', 1),
      stageTemplate(4202, 42, 'Сделки', 'Квалификация', 2),
    ],
    deals: generateDeals([
      { stageId: 4201, stageName: 'Новые', boardId: 42, count: 13, hasAmount: true, source: 'Сайт' },
      { stageId: 4202, stageName: 'Квалификация', boardId: 42, count: 8, wonCount: 3, lostCount: 0, hasAmount: true, source: 'Выставка' },
    ]),
  },
  {
    id: 'empty-period',
    name: 'TC-10: пустой период',
    description: 'Отдельный empty-state кейс: структура воронки есть, но данных за период нет.',
    group: 'smoke',
    testCaseRef: 'TC-10',
    precondition: 'Выбран сценарий с корректной структурой воронки, но без сделок.',
    action: 'Открыть отчёт и проверить empty-state.',
    expectedResult: [
      'Структура отчёта сохраняется.',
      'Числа в графике и KPI становятся нулевыми или пустыми.',
      'Блок сотрудников не показывает случайные записи.',
    ],
    expectedAlerts: [],
    expectedStagesCount: 5,
    boards: cloneBoards(CLEAN_BOARDS),
    stages: cloneStages(CLEAN_STAGES),
    deals: [],
  },
  {
    id: 'no-boards',
    name: 'TC-11: нет досок',
    description: 'Технический edge-кейс: в пространстве нет досок вообще.',
    group: 'edge',
    testCaseRef: 'TC-11',
    precondition: 'Выбран сценарий без досок и без сделок.',
    action: 'Открыть отчёт.',
    expectedResult: [
      'Показан только alert "NO_BOARDS".',
      'Интерфейс не падает.',
      'Пользователь получает понятное объяснение причины.',
    ],
    expectedAlerts: [ALERT_CODES.NO_BOARDS],
    expectedStagesCount: 0,
    boards: [],
    stages: [],
    deals: [],
  },
  {
    id: 'all-cols-done',
    name: 'TC-12: все колонки финальные',
    description:
      'Технический edge-кейс: рабочие этапы отсутствуют, потому что у всех существующих колонок выставлен финальный тип.',
    group: 'edge',
    testCaseRef: 'TC-12',
    precondition: 'Выбран сценарий, где на доске есть только финальные колонки.',
    action: 'Открыть отчёт.',
    expectedResult: [
      'Показан только alert "ALL_COLUMNS_DONE".',
      'График не рисует выдуманные рабочие этапы.',
      'Экран остаётся стабильным.',
    ],
    expectedAlerts: [ALERT_CODES.ALL_COLUMNS_DONE],
    expectedStagesCount: 0,
    boards: [
      {
        id: 51,
        name: 'Сделки',
        space_id: SPACE_ID,
        sort_order: 1,
        row_sort_order: 1,
        columns: [
          { id: 5101, name: 'Выигран', column_type: 'done' },
          { id: 5102, name: 'Проигран', column_type: 'done' },
        ],
        custom_fields: [
          { id: 9901, name: 'Сумма сделки', field_type: 'number' },
        ],
      },
    ],
    stages: [],
    deals: [],
  },
  {
    id: 'one-col-non-done',
    name: 'TC-13: одна рабочая колонка',
    description: 'Технический edge-кейс: на доске только одна нефинальная колонка.',
    group: 'edge',
    testCaseRef: 'TC-13',
    precondition: 'Выбран сценарий с одной in_progress-колонкой и заполненными сделками.',
    action: 'Открыть отчёт.',
    expectedResult: [
      'Показан только alert "NO_DONE_COLUMNS".',
      'Экран не падает.',
      'Сценарий позволяет проверить устойчивость алгоритма на неполной структуре доски.',
    ],
    expectedAlerts: [ALERT_CODES.NO_DONE_COLUMNS],
    expectedStagesCount: 0,
    boards: [
      {
        id: 52,
        name: 'Сделки',
        space_id: SPACE_ID,
        sort_order: 1,
        row_sort_order: 1,
        columns: [
          { id: 5201, name: 'Переговоры', column_type: 'in_progress' },
        ],
        custom_fields: [
          { id: 9911, name: 'Сумма сделки', field_type: 'number' },
        ],
      },
    ],
    stages: [],
    deals: generateDeals([
      { stageId: 5201, stageName: 'Переговоры', boardId: 52, count: 6, hasAmount: true, source: 'Сайт' },
    ]),
  },
];

export function getScenarioById(id: string): Scenario {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0];
}
