import type { FunnelDealItem } from '@/lib/types';

export interface MockDeal extends FunnelDealItem {
  stage_column_id: number;
  board_id: number;
}

// Reference data
const companies = [
  'Газпром', 'Сбербанк', 'Яндекс', 'Wildberries', 'Ozon',
  'МТС', 'Мегафон', 'Билайн', 'Тинькофф', 'ВТБ',
  'Роснефть', 'Лукойл', 'Норникель', 'Северсталь', 'Магнит',
  'X5 Group', 'Ростелеком', 'Аэрофлот', 'Алроса', 'РЖД',
  'Ашан', 'Лента', 'Пятёрочка', 'Перекрёсток', 'Касперский',
  'ABBYY', 'Mail.ru', '2GIS', 'Delivery Club', 'СитиМобил',
  'Lamoda', 'KupiVIP', 'Avito', 'HeadHunter', 'Superjob',
  'Skyeng', 'GeekBrains', 'Skillbox', 'Нетология', 'КРОК',
  'Ланит', 'Ренессанс Страхование', 'СОГАЗ', 'Альфа-Страхование', 'Росгосстрах',
  'СДЭК', 'Boxberry', 'ПЭК', 'Деловые Линии', 'Энергия',
  'РусГидро', 'Интер РАО', 'Мосэнерго', 'Татнефть', 'Сургутнефтегаз',
  'НЛМК', 'Металлоинвест', 'Евраз', 'Русал', 'ММК',
  'Автодор', 'Трансконтейнер', 'Совкомфлот', 'Новатэк', 'АФК Система',
  'Ростех', 'Росатом', 'Ростелеком-ЦОД', 'МТС Банк', 'Почта России',
  'Сколково', 'РВК', 'Росинфокоминвест', 'Мосгортранс', 'Аэроэкспресс',
  'Московское метро', 'Аэропорт Шереметьево', 'Пулково', 'Домодедово', 'Внуково',
];

const dealTypes = [
  'Контракт с',
  'Лицензия для',
  'Интеграция с',
  'Поставка для',
  'Проект для',
  'Внедрение для',
  'Консалтинг для',
  'Обслуживание',
];

const managers = [
  { id: 301, full_name: 'Иванов Пётр' },
  { id: 302, full_name: 'Петрова Анна' },
  { id: 303, full_name: 'Сидоров Михаил' },
  { id: 304, full_name: 'Козлова Елена' },
  { id: 305, full_name: 'Морозов Дмитрий' },
];

// Stages mapped to boards (non-done columns only — funnel stages)
const stages = [
  { id: 101, name: 'Новые', boardId: 1 },
  { id: 102, name: 'Квалификация', boardId: 1 },
  { id: 201, name: 'Встреча', boardId: 2 },
  { id: 202, name: 'Предложение', boardId: 2 },
  { id: 203, name: 'Переговоры', boardId: 2 },
  { id: 301, name: 'Onboarding', boardId: 3 },
];

const sources = [
  'Холодный звонок',
  'Сайт',
  'Рекомендация',
  'Выставка',
  'LinkedIn',
];

const tags = [
  'enterprise',
  'smb',
  'strategic',
  'renewal',
  'upsell',
];

// Seeded random number generator for deterministic results
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randomChoice<T>(arr: T[], seed: number): T {
  const index = Math.floor(seededRandom(seed) * arr.length);
  return arr[index];
}

function randomInt(min: number, max: number, seed: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function randomAmount(seed: number, hasAmountField: boolean, nullChance = 0.1): number | null {
  // If the board doesn't have an amount custom field, return null
  if (!hasAmountField) return null;
  if (seededRandom(seed * 1.1) < nullChance) return null;
  const amounts = [50000, 75000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000];
  return randomChoice(amounts, seed * 1.2);
}

function generateDate(seed: number): string {
  const day = randomInt(1, 28, seed);
  const hour = randomInt(8, 18, seed * 1.3);
  const minute = randomInt(0, 59, seed * 1.4);
  return `2024-06-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function generateDeal(
  dealIndex: number,
  stageId: number,
  stageName: string,
  boardId: number,
  outcome: 'in_progress' | 'won' | 'lost',
  hasExited: boolean,
  hasAmountField: boolean,
): MockDeal {
  const cardId = 10001 + dealIndex;
  const seed = cardId;

  const company = randomChoice(companies, seed);
  const dealType = randomChoice(dealTypes, seed * 1.5);
  const manager = randomChoice(managers, seed * 2);
  const source = randomChoice(sources, seed * 3);

  const numTags = randomInt(1, 3, seed * 4);
  const selectedTags: string[] = [];
  for (let i = 0; i < numTags; i++) {
    const tag = randomChoice(tags, seed * 5 + i);
    if (!selectedTags.includes(tag)) {
      selectedTags.push(tag);
    }
  }

  const enteredAt = generateDate(seed * 6);
  const durationDays = randomInt(1, 15, seed * 7);
  const exitedAt = hasExited ? addDays(enteredAt, durationDays) : null;

  const currentStageIndex = stages.findIndex(s => s.id === stageId);
  const nextStageName = currentStageIndex < stages.length - 1 && hasExited
    ? stages[currentStageIndex + 1].name
    : null;

  const isStale = outcome === 'in_progress' && durationDays > 10;
  const visitNumber = seededRandom(seed * 8) > 0.8 ? 2 : 1;

  return {
    card_id: cardId,
    card_title: `${dealType} ${company}`,
    card_url: `/spaces/100/boards/${boardId}/cards/${cardId}`,
    responsible: manager,
    deal_amount: randomAmount(seed * 9, hasAmountField),
    source,
    tags: selectedTags,
    entered_at: enteredAt,
    exited_at: exitedAt,
    duration_days: durationDays,
    next_stage_name: nextStageName,
    outcome,
    visit_number: visitNumber,
    is_stale: isStale,
    stage_column_id: stageId,
    board_id: boardId,
  };
}

/**
 * Generate ~100 deals distributed across 3 boards:
 * - Лиды (board 1): 30 deals, ~40% without amount (no "Сумма сделки" field)
 * - Сделки (board 2): 45 deals, all with amount field
 * - Аккаунтинг (board 3): 25 deals, all with amount field
 */
function generateMockDeals(): MockDeal[] {
  const deals: MockDeal[] = [];
  let idx = 0;

  // === Board 1: Лиды ===
  // Stage: Новые (101) — 18 deals
  for (let i = 0; i < 18; i++) {
    const outcome = i < 14 ? 'in_progress' as const : 'lost' as const;
    deals.push(generateDeal(idx++, 101, 'Новые', 1, outcome, false, false));
  }
  // Stage: Квалификация (102) — 12 deals
  for (let i = 0; i < 12; i++) {
    const outcome = i < 9 ? 'in_progress' as const : 'lost' as const;
    deals.push(generateDeal(idx++, 102, 'Квалификация', 1, outcome, false, false));
  }

  // === Board 2: Сделки ===
  // Stage: Встреча (201) — 15 deals
  for (let i = 0; i < 15; i++) {
    const outcome = i < 11 ? 'in_progress' as const : 'lost' as const;
    deals.push(generateDeal(idx++, 201, 'Встреча', 2, outcome, false, true));
  }
  // Stage: Предложение (202) — 12 deals
  for (let i = 0; i < 12; i++) {
    const outcome = i < 9 ? 'in_progress' as const : 'lost' as const;
    deals.push(generateDeal(idx++, 202, 'Предложение', 2, outcome, false, true));
  }
  // Stage: Переговоры (203) — 8 deals
  for (let i = 0; i < 8; i++) {
    const outcome = i < 6 ? 'in_progress' as const : 'lost' as const;
    deals.push(generateDeal(idx++, 203, 'Переговоры', 2, outcome, false, true));
  }
  // Won deals on Сделки (Оплачено = 204) — counted as won, exited
  for (let i = 0; i < 10; i++) {
    deals.push(generateDeal(idx++, 203, 'Переговоры', 2, 'won', true, true));
  }

  // === Board 3: Аккаунтинг ===
  // Stage: Onboarding (301) — 15 deals
  for (let i = 0; i < 15; i++) {
    const outcome = i < 12 ? 'in_progress' as const : 'lost' as const;
    deals.push(generateDeal(idx++, 301, 'Onboarding', 3, outcome, false, true));
  }
  // Won deals on Аккаунтинг (Активный клиент = 302) — exited
  for (let i = 0; i < 10; i++) {
    deals.push(generateDeal(idx++, 301, 'Onboarding', 3, 'won', true, true));
  }

  return deals;
}

export const mockDeals: MockDeal[] = generateMockDeals();

export const stageInfo = {
  stages,
  distribution: {
    101: 18,
    102: 12,
    201: 15,
    202: 12,
    203: 18, // 8 in_progress/lost + 10 won
    301: 25, // 15 in_progress/lost + 10 won
  },
  total: mockDeals.length,
};
