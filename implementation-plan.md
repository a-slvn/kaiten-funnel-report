# План рефакторинга: Воронка продаж -- Best Guess

> **Цель:** Привести прототип в соответствие с фидбэком CPO. Убрать стоп-экран, реализовать автоконфигурацию Best Guess, перейти на модель space_id + multi-board, добавить переключение метрики (количество / сумма), показать алерт-баннеры.
>
> **Scope:** Только фронтенд (mock-data прототип). Бэкенд и API не затрагиваются.
>
> **Базовая директория приложения:** `/Users/slvn/ai/kaiten/funnel_report/app/`
>
> **Дизайн-система:** Только **MUI** (`@mui/material`, `@mui/icons-material`). Shadcn/ui НЕ использовать.

---

## Дизайн-система: только MUI

**Жёсткое ограничение:** Все компоненты строятся исключительно на MUI 7. Не использовать shadcn/ui, Radix UI или другие библиотеки компонентов.

**Текущее состояние:** Бизнес-компоненты (`components/funnel/`) уже полностью на MUI. Папка `components/ui/` содержит 16 shadcn-компонентов, но из них используется только `Skeleton` в `loading.tsx`.

**Действие в Фазе 0:** Заменить `Skeleton` в `loading.tsx` на `MUI Skeleton`, удалить `components/ui/`, удалить `components.json` (конфиг shadcn).

---

## Инструментарий: агенты, скиллы, MCP-серверы

### Агенты

| Агент | Где используется | Назначение |
|-------|-----------------|------------|
| **frontend-developer** | Фазы 0-9 | Основной исполнитель: пишет компоненты, хуки, типы, mock-данные. Работает с React 19, MUI 7, Recharts, TypeScript. |
| **ui-ux-designer** | Фаза 5, 6, 7, 8 | Проектирование UI-элементов: alert-banner, metric-mode-toggle, обновлённый setup-dialog. Формирует MUI-спецификации (sx, цвета, отступы). |
| **Explore** | Перед каждой фазой | Быстрая разведка файлов перед модификацией: проверка импортов, зависимостей, текущего состояния. |
| **general-purpose** | Фаза 0, 9 | Чистка мёртвого кода, grep по проекту на broken imports, проверка TSC. |

### Скиллы

| Скилл | Где используется | Назначение |
|-------|-----------------|------------|
| **vercel-react-best-practices** | Фаза 4, 8 | Проверка компонентов на оптимальность: избежание лишних рендеров, правильное использование `useMemo`/`useCallback`, оптимизация бандла. |
| **simplify** | После каждой фазы | Ревью написанного кода: нет ли дублирования, избыточности, нарушений DRY. |
| **web-design-guidelines** | Фаза 9 | Финальный аудит UI: доступность, контраст, семантика, keyboard navigation. |

### MCP-серверы

| MCP-сервер | Где используется | Назначение |
|------------|-----------------|------------|
| **Context7** | Фазы 1-8 | Документация MUI 7: актуальные API компонентов (`Alert`, `ToggleButtonGroup`, `Autocomplete`, `Drawer`, `Dialog` и др.), примеры использования, новые паттерны v7. |
| **chrome-devtools** | Фаза 9 | Визуальная проверка: скриншоты страниц, snapshot DOM-дерева, проверка console errors, network requests. Верификация всех 7 сценариев. |
| **Vercel** | По необходимости | Деплой для ревью, если потребуется показать результат. |

### НЕ используем

| Инструмент | Причина |
|------------|---------|
| **shadcn MCP** | Не используем shadcn/ui. Все компоненты на MUI. |
| **backend-architect** | Scope ограничен фронтендом. |
| **product-manager / business-analyst** | Требования уже зафиксированы в документах. Вопросы решены. |

### Распределение по фазам

```
Фаза 0 (Чистка)
  └─ Агент: general-purpose — grep broken imports, удаление файлов
  └─ Скилл: simplify — проверка после чистки

Фаза 1 (Типы)
  └─ Агент: frontend-developer — обновление types.ts, constants.ts
  └─ MCP: Context7 — API MUI типов (если нужны MUI-специфичные интерфейсы)

Фаза 2 (Mock-данные)
  └─ Агент: frontend-developer — перезапись 4 файлов данных

Фаза 3 (Best Guess)
  └─ Агент: frontend-developer — алгоритм best-guess.ts + хук
  └─ Скилл: vercel-react-best-practices — оптимизация хука

Фаза 4 (Стоп-экран)
  └─ Агент: frontend-developer — рефакторинг funnel-report.tsx
  └─ Скилл: vercel-react-best-practices — проверка рендер-потока
  └─ Скилл: simplify — ревью после крупной переработки

Фаза 5 (Алерт-баннеры)
  └─ Агент: frontend-developer — создание alert-banner.tsx
  └─ Агент: ui-ux-designer — MUI-спецификация Alert-компонента
  └─ MCP: Context7 — документация MUI Alert, AlertTitle

Фаза 6 (Metric toggle)
  └─ Агент: frontend-developer — создание metric-mode-toggle.tsx
  └─ Агент: ui-ux-designer — дизайн переключателя
  └─ MCP: Context7 — документация MUI ToggleButtonGroup, Tooltip

Фаза 7 (Setup dialog)
  └─ Агент: frontend-developer — переписать funnel-setup-dialog.tsx
  └─ Агент: ui-ux-designer — UX опционального диалога
  └─ MCP: Context7 — документация MUI Dialog, Switch, Select, Autocomplete

Фаза 8 (Адаптация компонентов)
  └─ Агент: frontend-developer (параллельно несколько) — 6 компонентов
  └─ Скилл: simplify — ревью каждого компонента

Фаза 9 (Финал)
  └─ Агент: general-purpose — TSC проверка, grep на мёртвый код
  └─ MCP: chrome-devtools — скриншоты, DOM snapshot, console errors
  └─ Скилл: web-design-guidelines — аудит доступности
  └─ Скилл: simplify — финальный ревью
```

---

## Обзор фаз

| Фаза | Описание | Зависимости |
|------|----------|-------------|
| **Фаза 0** | Удаление мёртвого кода и стабов | Нет |
| **Фаза 1** | Новые типы и модель данных (space_id, multi-board, metric mode) | Нет |
| **Фаза 2** | Обновление mock-данных под multi-board сценарий | Фаза 1 |
| **Фаза 3** | Алгоритм Best Guess (фронтенд-версия) | Фазы 1, 2 |
| **Фаза 4** | Устранение стоп-экрана, новый поток открытия отчёта | Фазы 1, 2, 3 |
| **Фаза 5** | Алерт-баннеры для автоконфигурации | Фазы 3, 4 |
| **Фаза 6** | Переключатель метрики (количество / сумма) с fallback | Фазы 1, 4 |
| **Фаза 7** | Редизайн панели настроек (опциональная, не обязательная) | Фазы 3, 4, 5 |
| **Фаза 8** | Адаптация визуальных компонентов под метрику | Фаза 6 |
| **Фаза 9** | Финальная проверка и полировка | Все фазы |

---

## Фаза 0. Удаление мёртвого кода

### 0.0. Удалить shadcn/ui и перевести loading.tsx на MUI

**Что делаем:** Единственное использование shadcn — `Skeleton` в `loading.tsx`. Заменяем на MUI `Skeleton`, после чего удаляем всю папку `components/ui/` и конфиг `components.json`.

**Файлы для модификации:**
- `/Users/slvn/ai/kaiten/funnel_report/app/app/reports/funnel/loading.tsx` — заменить `import { Skeleton } from '@/components/ui/skeleton'` на `import Skeleton from '@mui/material/Skeleton'`

**Файлы/папки для удаления:**
- `/Users/slvn/ai/kaiten/funnel_report/app/components/ui/` — вся папка (16 файлов)
- `/Users/slvn/ai/kaiten/funnel_report/app/components.json` — конфиг shadcn

**Проверить:** `grep -r "components/ui" app/` — убедиться, что нет других импортов.

**Сложность:** S
**Зависимости:** Нет

---

### 0.1. Удалить неиспользуемые стабы

**Что делаем:** Удаляем файлы-заглушки, которые не содержат рабочей логики и помечены как deprecated. Также удаляем дублирующий `configure-dialog.tsx` (полный дубликат логики `funnel-setup-dialog.tsx`, но ни разу не подключён в текущем рабочем потоке).

**Файлы для удаления:**
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/filters-panel.tsx` -- заглушка, 7 строк, помечена "no longer used"
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/period-select.tsx` -- заглушка, 6 строк, помечена "replaced"
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/responsible-combobox.tsx` -- заглушка, 6 строк, помечена "replaced"
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/configure-dialog.tsx` -- 399 строк, дублирует funnel-setup-dialog, не импортируется из funnel-report.tsx
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-config-dialog.tsx` -- 93 строки, показывает read-only конфиг, не используется в текущем flow

**Проверить:** Нет ли импортов этих файлов в других компонентах (grep по проекту).

**Сложность:** S
**Зависимости:** Нет

---

### 0.2. Удалить компонент EmptyState (стоп-экран)

**Что делаем:** Удаляем компонент, который блокирует показ графика до ручной настройки. Это решает P-001 (стоп-экран), P-002 (нарушение паттерна Best Guess), P-003 (двухуровневая настройка).

**Файлы для удаления:**
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/empty-state.tsx`

**Файлы для модификации:**
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx` -- удалить импорт `EmptyState`, удалить весь блок `if (!setup.isConfigured)` (строки 117-154)

**Замечание:** Компонент `EmptyState` с типом `no-data` (нет данных за период) можно оставить или создать заново позже. Но текущий файл удаляем целиком, потому что его основное назначение -- стоп-экран. Если позже потребуется пустое состояние "нет данных", создадим специализированный компонент.

**Сложность:** S
**Зависимости:** Нет (но логически идёт перед Фазой 4)

---

## Фаза 1. Новые типы и модель данных

### 1.1. Обновить типы: переход с board_id на space_id

**Что делаем:** Рефакторим систему типов. Фундаментальное изменение: воронка больше не привязана к одной доске -- она привязана к пространству и включает все доски пространства.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/types.ts`

**Конкретные изменения:**

1. **Добавить новые типы для Best Guess:**

```typescript
// === Metric mode ===
export type MetricMode = 'amount' | 'count';

// === Best Guess result ===
export type BestGuessConfidence = 'high' | 'medium' | 'low';

export interface BestGuessAlert {
  type: 'info' | 'warning';
  code: string;
  message: string;
  action_label: string;
  action_target: 'settings';
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
```

2. **Обновить SpaceBoard -- добавить column_type:**

```typescript
export interface SpaceColumn {
  id: number;
  name: string;
  column_type: 'queue' | 'in_progress' | 'done'; // добавить
}

export interface SpaceBoard {
  id: number;
  name: string;
  space_id: number;       // добавить
  sort_order: number;     // добавить
  row_sort_order: number; // добавить
  columns: SpaceColumn[];
  custom_fields?: CustomFieldDef[]; // добавить
}

export interface CustomFieldDef {
  id: number;
  name: string;
  field_type: 'number' | 'string' | 'date'; // для определения amount
}
```

3. **Обновить FunnelConfig -- от board_id к space_id:**

```typescript
export interface FunnelConfig {
  id: number;
  name: string;
  space_id: number;       // было: board_id
  space_name: string;     // было: board_name
  board_ids: number[];    // новое: массив досок
  stages: { column_id: number; board_id: number; label: string; sort_order: number }[];
  win_column_ids: number[];   // новое
  loss_column_ids: number[];  // новое
  metric_mode: MetricMode;    // новое
  deal_amount_field_id: number | null; // новое
  auto_generated: boolean;    // новое
}
```

4. **Обновить FunnelSetupConfig -- убрать isConfigured:**

```typescript
export interface FunnelSetupConfig {
  boards: BoardSetup[];
  // isConfigured: boolean; -- УДАЛИТЬ. Теперь конфигурация всегда есть (Best Guess).
  // Добавить:
  metric_mode: MetricMode;
  deal_amount_field_id: number | null;
}
```

5. **Обновить FunnelStageData -- добавить board_id:**

```typescript
export interface FunnelStageData {
  // ...существующие поля...
  board_id: number;    // добавить: к какой доске принадлежит этап
  board_name: string;  // добавить: для дисамбигуации одноимённых колонок
}
```

6. **Добавить тип для MockDeal -- добавить board_id:**

```typescript
// В mock-deals.ts уже есть MockDeal с stage_column_id.
// Добавить board_id:
export interface MockDeal extends FunnelDealItem {
  stage_column_id: number;
  board_id: number; // новое
}
```

**Сложность:** M
**Зависимости:** Нет

---

### 1.2. Обновить константы

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/constants.ts`

**Изменения:**

1. Заменить `DEFAULT_FUNNEL_CONFIG`:

```typescript
// Было:
export const DEFAULT_FUNNEL_CONFIG = {
  id: 1,
  name: 'Основная воронка B2B',
  board_id: 1042,
  board_name: 'Продажи B2B',
};

// Стало:
export const DEFAULT_SPACE = {
  id: 100,
  name: 'CRM-пространство',
};
```

2. Добавить алерт-коды (строковые константы):

```typescript
export const ALERT_CODES = {
  NO_BOARDS: 'NO_BOARDS',
  ALL_COLUMNS_DONE: 'ALL_COLUMNS_DONE',
  NO_DONE_COLUMNS: 'NO_DONE_COLUMNS',
  SINGLE_DONE_COLUMN: 'SINGLE_DONE_COLUMN',
  MULTIPLE_DONE_COLUMNS: 'MULTIPLE_DONE_COLUMNS',
  NO_AMOUNT_FIELD: 'NO_AMOUNT_FIELD',
  MULTIPLE_AMOUNT_FIELDS: 'MULTIPLE_AMOUNT_FIELDS',
  DIFFERENT_AMOUNT_FIELDS: 'DIFFERENT_AMOUNT_FIELDS',
} as const;
```

**Сложность:** S
**Зависимости:** 1.1

---

## Фаза 2. Обновление mock-данных

### 2.1. Переписать mock-boards: CRM-сценарий с 3 досками

**Что делаем:** Текущие mock-доски (`Backlog`, `В работе`, `Ready for Delivery`) не похожи на CRM. Создаём реалистичный CRM-сценарий: пространство с 3 досками, у каждой -- column_type, custom_fields.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-boards.ts`

**Полная перезапись.** Новое содержимое:

```typescript
import type { SpaceBoard } from '@/lib/types';

export const MOCK_SPACE_ID = 100;
export const MOCK_SPACE_NAME = 'Продажи B2B';

export const mockSpaceBoards: SpaceBoard[] = [
  {
    id: 1,
    name: 'Лиды',
    space_id: MOCK_SPACE_ID,
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
  },
  {
    id: 2,
    name: 'Сделки',
    space_id: MOCK_SPACE_ID,
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
  },
  {
    id: 3,
    name: 'Аккаунтинг',
    space_id: MOCK_SPACE_ID,
    sort_order: 2,
    row_sort_order: 2,
    columns: [
      { id: 301, name: 'Onboarding', column_type: 'in_progress' },
      { id: 302, name: 'Активный клиент', column_type: 'done' },
    ],
    custom_fields: [
      { id: 904, name: 'LTV', field_type: 'number' },
    ],
  },
];
```

**Логика CRM-потока:**
- Лиды: Новые -> Квалификация -> Квалифицирован (done)
- Сделки: Встреча -> Предложение -> Переговоры -> Оплачено (done) / Отказ (done)
- Аккаунтинг: Onboarding -> Активный клиент (done)

**Best Guess должен определить:**
- Этапы: Новые, Квалификация, Встреча, Предложение, Переговоры, Onboarding (6 этапов)
- Won: Активный клиент (последняя done по глобальному порядку) или Оплачено
- Lost: Отказ
- Done-колонки: Квалифицирован (103), Оплачено (204), Отказ (205), Активный клиент (302)

**Сложность:** M
**Зависимости:** 1.1

---

### 2.2. Переписать mock-stages под multi-board

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-stages.ts`

**Что делаем:** Текущие 5 этапов (Квалификация, Встреча, Предложение, Переговоры, Закрытие) привязаны к фиктивным column_id 5001-5005. Переписываем на новые column_id из mock-boards (101, 102, 201, 202, 203, 301) с указанием board_id.

**Полная перезапись.** Этапы определяются Best Guess, но для обратной совместимости и быстрого рендера создаём "предрассчитанный" массив:

```typescript
export const mockStages: FunnelStageData[] = [
  { stage_column_id: 101, board_id: 1, board_name: 'Лиды', stage_name: 'Новые', stage_sort_order: 1, ... },
  { stage_column_id: 102, board_id: 1, board_name: 'Лиды', stage_name: 'Квалификация', stage_sort_order: 2, ... },
  { stage_column_id: 201, board_id: 2, board_name: 'Сделки', stage_name: 'Встреча', stage_sort_order: 3, ... },
  { stage_column_id: 202, board_id: 2, board_name: 'Сделки', stage_name: 'Предложение', stage_sort_order: 4, ... },
  { stage_column_id: 203, board_id: 2, board_name: 'Сделки', stage_name: 'Переговоры', stage_sort_order: 5, ... },
  { stage_column_id: 301, board_id: 3, board_name: 'Аккаунтинг', stage_name: 'Onboarding', stage_sort_order: 6, ... },
];
```

Числовые значения (deals_entered, total_amount и т.д.) пересчитаем в mock-funnel-data.ts.

**Сложность:** M
**Зависимости:** 2.1

---

### 2.3. Переписать mock-deals под multi-board

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-deals.ts`

**Что делаем:** Генерируем ~100 сделок, распределённых по всем 3 доскам. Каждая сделка получает `board_id`. Некоторые сделки не имеют `deal_amount` (null) -- для тестирования fallback на count.

**Ключевые изменения:**
- Обновить массив `stages` (строка 46) на новые ID (101, 102, 201, 202, 203, 301)
- Добавить `board_id` в `generateDeal()` (строка 106)
- Распределить сделки по 3 доскам: ~30 на Лиды, ~40 на Сделки, ~30 на Аккаунтинг
- Сделки на доске "Лиды" -- часть без суммы (нет custom field "Бюджет"), на "Сделках" -- все с суммой
- Обновить `card_url` на `/spaces/100/boards/{board_id}/cards/{cardId}`

**Сложность:** M
**Зависимости:** 2.1, 2.2

---

### 2.4. Обновить mock-funnel-data (агрегация)

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-funnel-data.ts`

**Что делаем:** Агрегация `getFunnelData()` должна работать с новыми stage ID и учитывать multi-board. Основная логика `buildStageMetrics()` не меняется принципиально (она уже оперирует `stage_column_id` и `stage_sort_order`), но нужно:

1. Импортировать новые `mockStages` с board_id
2. Обновить `STAGE_SORT_ORDER` map
3. Добавить параметр `metricMode: MetricMode` в `getFunnelData()`:
   - Если `metricMode === 'count'`: все поля `total_amount`, `avg_amount` и т.д. заполняются null
   - Если `metricMode === 'amount'`: работает как сейчас
4. Добавить параметр `boardIds: number[]` для фильтрации сделок по доскам
5. Обновить `getDealsByStage()` -- без изменений (уже фильтрует по `stage_column_id`)

**Сигнатура:**

```typescript
export function getFunnelData(
  filters: FunnelFilters,
  metricMode: MetricMode,
  boardIds?: number[]
): FunnelReportData
```

**Сложность:** M
**Зависимости:** 2.2, 2.3

---

## Фаза 3. Алгоритм Best Guess (фронтенд mock-версия)

### 3.1. Создать модуль best-guess

**Что делаем:** Реализуем фронтенд-версию алгоритма Best Guess из `research/best-guess-algorithm.md`. Алгоритм берёт массив `SpaceBoard[]` и возвращает `BestGuessResult`.

**Создать файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/best-guess.ts`

**Содержимое:**

Функция `runBestGuess(boards: SpaceBoard[]): BestGuessResult` реализует 6 шагов:

1. **Шаг 1 (Сбор досок):** Принимает уже отсортированный массив (в mock-данных порядок задан).

2. **Шаг 2 (Сбор колонок):** Итерируем по доскам, группируем колонки.

3. **Шаг 3 (Построение этапов):** Колонки с `column_type !== 'done'` становятся этапами. Порядок: доска 1 -> доска 2 -> ... Глобальный `sort_order` инкрементируется.

4. **Шаг 4 (Определение won/lost и порядок отображения):**
   - Обычные колонки → **этапы воронки** (stages), по `sort_order`
   - Колонка с `column_type = 'done'` → **Оплачено** (won), отображается после последнего этапа
   - **Проиграно** (lost) → отображается последней, после "Оплачено"
   - Порядок на графике: `[Этап 1] → [Этап 2] → ... → [Оплачено] → [Проиграно]`

5. **Шаг 5 (Определение поля суммы):** По настройкам доски:
   - Если на доске **явно указано** кастомное поле суммы → `metric_mode = 'amount'`
   - Если **не указано** → `metric_mode = 'count'`, деньги не отображаем
   - НЕ угадываем поле по числовым полям — берём только то, что настроено на доске
   - Если поле не задано → показываем подсказку: "Выберите поле суммы, чтобы график был полнее"

6. **Шаг 6 (Сборка результата):** Формируем `BestGuessResult` с config, alerts, confidence, metric_mode.

**Также реализовать набор алерт-фабрик:**

```typescript
function createAlert(code: string): BestGuessAlert {
  // Map code -> message + action_label по таблице из research/best-guess-algorithm.md
}
```

**Алерты (из спецификации):**
- `NO_BOARDS` -- warning: "В пространстве нет досок"
- `ALL_COLUMNS_DONE` -- warning: "Все колонки имеют тип done"
- `NO_DONE_COLUMNS` -- info: "Не найдены done-колонки, последний этап определён как win"
- `SINGLE_DONE_COLUMN` -- info: "Найдена одна done-колонка, определена как win"
- `MULTIPLE_DONE_COLUMNS` -- info: "Найдено 3+ done-колонок"
- `NO_AMOUNT_FIELD` -- info: "Нет числовых полей, отображаем количество сделок"
- `MULTIPLE_AMOUNT_FIELDS` -- info: "Несколько числовых полей, выбрано первое"
- `DIFFERENT_AMOUNT_FIELDS` -- warning: "На разных досках разные поля суммы"

**Покрыть тестами:** Написать 10 edge cases из спецификации.

**Создать файл тестов:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/__tests__/best-guess.test.ts`

**Сложность:** L
**Зависимости:** 1.1, 1.2, 2.1

---

### 3.2. Создать хук use-best-guess

**Что делаем:** Хук-обёртка, которая запускает `runBestGuess` при загрузке компонента и кэширует результат. Имитирует асинхронность (setTimeout 100ms) для будущей замены на API-вызов.

**Создать файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/hooks/use-best-guess.ts`

**API:**

```typescript
export function useBestGuess(boards: SpaceBoard[]) {
  // Возвращает:
  return {
    result: BestGuessResult | null,
    isLoading: boolean,
    rerun: () => void, // для пересчёта после изменения настроек
  };
}
```

**Сложность:** S
**Зависимости:** 3.1

---

## Фаза 4. Устранение стоп-экрана -- новый поток открытия

### 4.1. Переписать funnel-report.tsx -- главный компонент

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx`

**Что делаем:** Полный рефакторинг главного компонента. Новый поток:

1. Загрузка -> показать скелетон (уже есть `CircularProgress`)
2. Запуск `useBestGuess(mockSpaceBoards)` -> получить конфигурацию
3. Запуск `useFunnelData(filters, bestGuess.result.metric_mode)` -> получить данные
4. Сразу показать график (без стоп-экрана)
5. Если есть `bestGuess.result.alerts` -- показать алерт-баннер над графиком

**Конкретные изменения:**

| Строки | Было | Стало |
|--------|------|-------|
| 25 | `import { useFunnelSetup }` | Удалить этот импорт |
| 17 | `import { EmptyState }` | Удалить |
| 19 | `import { FunnelSetupDialog }` | Оставить, но вызывать по-другому |
| 26 | `import { mockSpaceBoards }` | Оставить |
| 43-50 | `useFunnelSetup(mockSpaceBoards)` | Заменить на `useBestGuess(mockSpaceBoards)` |
| 38 | `useFunnelData(filters)` | `useFunnelData(filters, metricMode)` |
| 108-114 | `if (!setupLoaded)` -- ожидание localStorage | Заменить на `if (bestGuess.isLoading)` |
| 117-154 | `if (!setup.isConfigured)` -- стоп-экран | **УДАЛИТЬ ЦЕЛИКОМ** |
| 73-84 | `setupDialog` | Переписать: диалог теперь опционален, не блокирует |
| 87-105 | `configureButton` | Оставить, но текст можно сменить на "Настроить" |

**Новая структура рендера:**

```
<Box layout>
  <Box main-content>
    <Breadcrumbs + configureButton>
    <AlertBanner alerts={bestGuess.alerts} />   <!-- НОВОЕ -->
    <MetricModeToggle />                        <!-- НОВОЕ -->
    <Chart or Table>
    <KpiCards>
    <EmployeeSection>
  </Box>
  <FiltersSidebar />
  <SetupDialog />        <!-- теперь опциональная настройка -->
  <StageDrilldown />
</Box>
```

**Состояние:**
- Убрать: `useFunnelSetup`, `setupDialogOpen`, `setupLoaded`, `setup`
- Добавить: `useBestGuess`, `metricMode` (из bestGuess.result.metric_mode, переопределяемый пользователем)

**Сложность:** L
**Зависимости:** 0.2, 3.2

---

### 4.2. Рефакторить use-funnel-setup.ts (или удалить)

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/hooks/use-funnel-setup.ts`

**Варианты:**

**Вариант A (рекомендуемый): Переписать** в хук `use-funnel-overrides.ts`, который хранит **пользовательские переопределения** поверх Best Guess:
- Если пользователь вручную отключил доску -- это override
- Если пользователь изменил role колонки -- это override
- Override хранится в localStorage, но **не блокирует** показ графика
- Возвращает `overrides` + `applyOverrides(bestGuessResult) => FinalConfig`

**Вариант B: Удалить**, если решим, что ручная настройка пока не нужна (Nice to Have). В этом случае FunnelSetupDialog тоже удаляется.

**Рекомендация:** Вариант A, так как кнопка "Настроить график" остаётся (CPO просил убрать *обязательную* настройку, но не *возможность* настройки).

**Создать файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/hooks/use-funnel-overrides.ts`

**Удалить файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/hooks/use-funnel-setup.ts`

**Сложность:** M
**Зависимости:** 3.1, 3.2

---

### 4.3. Обновить use-funnel-config.ts

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/hooks/use-funnel-config.ts`

**Что делаем:** Хук сейчас хранит `FunnelConfig` с `board_id`. Нужно обновить:

1. Заменить `DEFAULT_FUNNEL_CONFIG` на новый из constants.ts
2. Обновить тип `FunnelConfig` (space_id вместо board_id)
3. Хук может стать тонким -- он просто транслирует результат Best Guess в `FunnelConfig`

**Альтернатива:** Удалить хук, если вся конфигурация будет жить в `useBestGuess` + `useFunnelOverrides`. В этом случае `FunnelConfig` как отдельная сущность не нужна.

**Рекомендация:** Удалить. Конфигурация = BestGuessResult + overrides. Отдельный хук для "конфига" не нужен.

**Сложность:** S
**Зависимости:** 4.1

---

### 4.4. Обновить use-funnel-data.ts

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/hooks/use-funnel-data.ts`

**Что делаем:** Хук должен принимать `metricMode` и пробрасывать в `getFunnelData()`.

**Изменения:**

```typescript
// Было:
export function useFunnelData(filters: FunnelFilters)

// Стало:
export function useFunnelData(
  filters: FunnelFilters,
  metricMode: MetricMode,
  boardIds?: number[]
)
```

Внутри -- обновить вызов `getFunnelData(filters, metricMode, boardIds)`.

**Сложность:** S
**Зависимости:** 2.4

---

## Фаза 5. Алерт-баннеры

### 5.1. Создать компонент AlertBanner

**Что делаем:** Информационный баннер, который показывается над графиком, когда Best Guess не может точно определить конфигурацию. Содержит текст алерта и кнопку "Настроить" (ведёт в Setup Dialog).

**Создать файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/alert-banner.tsx`

**Визуальный дизайн:**
- Тип `info`: голубой фон (`#e3f2fd`), иконка InfoOutlined, текст
- Тип `warning`: жёлтый фон (`#fff8e1`), иконка WarningAmberOutlined, текст
- Кнопка-ссылка "Настроить" справа (text button, не outlined)
- Если несколько алертов -- показываем их стопкой (вертикально)
- Кнопка "Скрыть" (dismiss) -- алерт скрывается до следующей перезагрузки

**Props:**

```typescript
interface AlertBannerProps {
  alerts: BestGuessAlert[];
  onOpenSettings: () => void;
  onDismiss?: (alertCode: string) => void;
}
```

**MUI-компоненты:** `Alert`, `AlertTitle`, `Button`.

**Сложность:** S
**Зависимости:** 1.1

---

### 5.2. Подключить AlertBanner в funnel-report.tsx

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx`

**Что делаем:** Вставить `<AlertBanner>` между breadcrumbs и графиком. Пробросить `bestGuess.result.alerts` и `onOpenSettings`.

**Конкретная вставка (в новом потоке рендера):**

```tsx
{bestGuess.result?.alerts.length > 0 && (
  <AlertBanner
    alerts={bestGuess.result.alerts}
    onOpenSettings={handleOpenSetup}
  />
)}
```

**Добавить состояние** `dismissedAlerts: Set<string>` для отслеживания скрытых алертов.

**Сложность:** S
**Зависимости:** 4.1, 5.1

---

## Фаза 6. Переключатель метрики (количество / сумма)

### 6.1. Создать компонент MetricModeToggle

**Что делаем:** Компактный переключатель в шапке блока графика, позволяющий переключить отображение между "Количество сделок" и "Сумма сделок". Best Guess устанавливает значение по умолчанию; пользователь может переключить.

**Создать файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/metric-mode-toggle.tsx`

**Визуал:** MUI `ToggleButtonGroup` (аналогично `ViewSwitcher`):
- Кнопка "Кол-во" (значение `count`)
- Кнопка "Сумма" (значение `amount`); disabled, если `deal_amount_field_id === null`

**Props:**

```typescript
interface MetricModeToggleProps {
  value: MetricMode;
  onChange: (mode: MetricMode) => void;
  amountAvailable: boolean; // false если нет числового поля
}
```

Если `amountAvailable === false`:
- Кнопка "Сумма" -- disabled
- Tooltip на hover: "Нет числового поля для суммы. Настройте в параметрах."

**Сложность:** S
**Зависимости:** 1.1

---

### 6.2. Интегрировать MetricModeToggle в funnel-report.tsx

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx`

**Что делаем:**

1. Добавить состояние `metricMode`:
```typescript
const [metricMode, setMetricMode] = useState<MetricMode>(
  bestGuess.result?.metric_mode ?? 'count'
);
```

2. Синхронизировать с Best Guess (useEffect: при изменении bestGuess.result.metric_mode обновить state, если пользователь не менял вручную).

3. Разместить `<MetricModeToggle>` рядом с `<ViewSwitcher>`:
```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
  <MetricModeToggle
    value={metricMode}
    onChange={setMetricMode}
    amountAvailable={bestGuess.result?.config.deal_amount_field_id != null}
  />
  <ViewSwitcher value={viewMode} onChange={setViewMode} />
</Box>
```

4. Пробросить `metricMode` в `useFunnelData`.

**Сложность:** S
**Зависимости:** 4.1, 6.1

---

## Фаза 7. Редизайн панели настроек

### 7.1. Переписать FunnelSetupDialog

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-setup-dialog.tsx`

**Что делаем:** Диалог настройки больше не блокирующий. Это опциональная панель для тонкой корректировки Best Guess. Изменения:

1. **Заголовок:** "Настроить воронку" (не "Настроить график")

2. **Описание:** "Воронка построена автоматически. Вы можете скорректировать этапы и колонки ниже."

3. **Содержимое:**
   - Показать все доски пространства (сгруппированные)
   - Каждая колонка имеет:
     - Включена/выключена (Switch) -- по умолчанию: по Best Guess
     - Роль: "Этап", "Успех", "Отказ" -- по умолчанию: по Best Guess
   - Кнопка "Сбросить к автоматическим" -- сбросить overrides

4. **Добавить секцию "Метрика":**
   - Выбор поля суммы из числовых полей досок (Select)
   - Или "Количество сделок" (отсутствие поля)
   - Это решает F-003 (Amount field selector in filter sidebar)

5. **Кнопки:** "Отмена" + "Применить"

6. **При "Применить":** Сохранить overrides в localStorage, пересчитать данные

**Props обновить:**

```typescript
interface FunnelSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (overrides: FunnelOverrides) => void;
  boards: SpaceBoard[];
  bestGuessConfig: AutoFunnelConfig; // текущий Best Guess
  currentOverrides: FunnelOverrides; // текущие переопределения
}
```

**Сложность:** L
**Зависимости:** 3.1, 4.2

---

## Фаза 8. Адаптация визуальных компонентов под metric mode

### 8.1. Обновить FunnelChart -- поддержка count/amount

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-chart.tsx`

**Что делаем:**

1. Добавить prop `metricMode: MetricMode`

2. Если `metricMode === 'count'`:
   - Ось Y: "Кол-во сделок" (как сейчас)
   - Bars: `deals_entered` (как сейчас)
   - Badge внутри бара: убрать amount badge (скрыть)
   - Подписи под графиком: убрать суммы, показать только конверсию

3. Если `metricMode === 'amount'`:
   - Ось Y: "Сумма, руб."
   - Bars: `total_amount`
   - Badge: показать количество сделок (инвертировать)
   - Подписи: суммы + конверсия

4. `CustomBarLabel` (строка 93): условная отрисовка в зависимости от `metricMode`

5. `CustomTooltipContent` (строка 33): показывать обе метрики в тултипе (и количество, и сумму), выделяя основную

6. Ряд конверсионных стрелок (строка 292): оставить всегда (конверсия всегда по количеству)

**Сложность:** M
**Зависимости:** 6.2

---

### 8.2. Обновить FunnelTable -- поддержка count/amount

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-table.tsx`

**Что делаем:**

1. Добавить prop `metricMode: MetricMode`

2. Если `metricMode === 'count'`:
   - Скрыть колонки "Сумма" и "Ср. чек" (или показать "--" если данных нет)

3. Если `metricMode === 'amount'`:
   - Показать все колонки (как сейчас)

4. Для каждого этапа показать принадлежность к доске (tooltip или мелкий текст):
   - "Встреча" -> подпись "Сделки" (название доски)
   - Актуально для одноимённых колонок на разных досках

**Сложность:** S
**Зависимости:** 6.2

---

### 8.3. Обновить KpiCards -- поддержка count/amount

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/kpi-cards.tsx`

**Что делаем:**

1. Добавить prop `metricMode: MetricMode`

2. Если `metricMode === 'count'`:
   - Карточка "сделок всего": показать только число, без суммы
   - Карточка "оплачено": показать только количество, без суммы
   - Убрать pipeline_value

3. Если `metricMode === 'amount'`:
   - Работает как сейчас

**Сложность:** S
**Зависимости:** 6.2

---

### 8.4. Обновить StageDrilldown и DrilldownDealList

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/stage-drilldown.tsx`
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/drilldown-deal-list.tsx`

**Что делаем:**

1. `StageDrilldown` (строка 71): при `count` mode, скрыть total_amount в хедере
2. `DrilldownDealList`: при `count` mode, скрыть колонку "Сумма" в таблице сделок (или показывать, если данные есть, но не акцентировать)
3. Добавить отображение `board_name` в хедере дриллдауна (из какой доски этот этап)

**Сложность:** S
**Зависимости:** 6.2

---

### 8.5. Обновить EmployeeSection

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/employee-section.tsx`

**Что делаем:**

1. Добавить prop `metricMode: MetricMode`
2. При `count` mode: скрыть суммы (Chip с форматированной суммой, строка 151-163)
3. При `amount` mode: работает как сейчас

**Сложность:** S
**Зависимости:** 6.2

---

### 8.6. Обновить FiltersSidebar -- добавить фильтр ответственного

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/filters-sidebar.tsx`

**Что делаем:**

1. **Добавить мультиселект "Ответственный"** -- сейчас этого фильтра нет (был stub `responsible-combobox.tsx`). Реализовать:
   - MUI `Autocomplete` с `multiple` и `checkbox`
   - Данные: `mockManagers`
   - При выборе: вызывать `onOwnerIdsChange(ids: number[])`

2. **Убрать секцию "Типы карточек"** (строка 151-174) -- она стаб ("Все") и не имеет смысла в текущем scope.

3. **Обновить props:**
```typescript
interface FiltersSidebarProps {
  filters: FunnelFilters;
  managers: Manager[];
  onPeriodChange: (period: PeriodPreset) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onOwnerIdsChange: (ids: number[]) => void;
  onApply: () => void;
}
```

**Сложность:** M
**Зависимости:** Нет прямых, но лучше делать после 4.1

---

## Фаза 9. Финальная проверка

### 9.1. Проверить все импорты и зависимости

**Что делаем:** После всех изменений пройтись по всем файлам и убедиться:
- Нет broken imports (удалённые файлы, переименованные типы)
- Нет неиспользуемых импортов
- TypeScript компилируется без ошибок (`npx tsc --noEmit`)

**Команда:** `cd /Users/slvn/ai/kaiten/funnel_report/app && npx tsc --noEmit`

**Сложность:** S
**Зависимости:** Все фазы

---

### 9.2. Визуальная проверка потока

**Что делаем:** Запустить dev-сервер (`npm run dev -- --port 3100`) и пройти сценарии:

1. **Открытие отчёта:** Должен сразу показать график без стоп-экрана
2. **Алерт-баннер:** Должен показать предупреждение (в текущих mock-данных -- какой конфиденс?)
3. **Переключение метрики:** count <-> amount -- график перестраивается
4. **Кнопка "Настроить":** Открывает диалог с предзаполненными Best Guess значениями
5. **Фильтр по ответственному:** Выбрать менеджера -- данные фильтруются
6. **Drilldown:** Клик по этапу -- открывается drawer со сделками, видна доска-источник
7. **Fallback на count:** Если amount недоступен -- кнопка "Сумма" отключена

**Сложность:** S
**Зависимости:** Все фазы

---

### 9.3. Очистить localStorage

**Что делаем:** Удалить ключи `funnel-setup-config` и `funnel-config` из localStorage, которые использовались старой реализацией. Добавить в `useBestGuess` проверку: если есть старые ключи -- удалить их.

**Сложность:** S
**Зависимости:** 4.1

---

## Сводная таблица задач

| # | Задача | Файлы | Слож. | Завис. | Фаза |
|---|--------|-------|-------|--------|------|
| 0.0 | Удалить shadcn/ui, перевести loading на MUI | components/ui/ (16 файлов), components.json, loading.tsx | S | -- | 0 |
| 0.1 | Удалить стабы и дубликаты | 5 файлов удалить | S | -- | 0 |
| 0.2 | Удалить EmptyState (стоп-экран) | empty-state.tsx, funnel-report.tsx | S | -- | 0 |
| 1.1 | Обновить типы (space_id, multi-board, metric mode) | types.ts | M | -- | 1 |
| 1.2 | Обновить константы | constants.ts | S | 1.1 | 1 |
| 2.1 | Переписать mock-boards (CRM-сценарий) | mock-boards.ts | M | 1.1 | 2 |
| 2.2 | Переписать mock-stages (multi-board) | mock-stages.ts | M | 2.1 | 2 |
| 2.3 | Переписать mock-deals (multi-board + board_id) | mock-deals.ts | M | 2.1, 2.2 | 2 |
| 2.4 | Обновить mock-funnel-data (агрегация) | mock-funnel-data.ts | M | 2.2, 2.3 | 2 |
| 3.1 | Реализовать алгоритм Best Guess | **best-guess.ts** (новый), тесты | L | 1.1, 2.1 | 3 |
| 3.2 | Создать хук use-best-guess | **use-best-guess.ts** (новый) | S | 3.1 | 3 |
| 4.1 | Переписать funnel-report.tsx (убрать стоп-экран) | funnel-report.tsx | L | 0.2, 3.2 | 4 |
| 4.2 | Создать use-funnel-overrides (замена use-funnel-setup) | **use-funnel-overrides.ts** (новый), удалить use-funnel-setup.ts | M | 3.1 | 4 |
| 4.3 | Удалить use-funnel-config (больше не нужен) | use-funnel-config.ts | S | 4.1 | 4 |
| 4.4 | Обновить use-funnel-data (metricMode param) | use-funnel-data.ts | S | 2.4 | 4 |
| 5.1 | Создать AlertBanner | **alert-banner.tsx** (новый) | S | 1.1 | 5 |
| 5.2 | Подключить AlertBanner в funnel-report | funnel-report.tsx | S | 4.1, 5.1 | 5 |
| 6.1 | Создать MetricModeToggle | **metric-mode-toggle.tsx** (новый) | S | 1.1 | 6 |
| 6.2 | Интегрировать MetricModeToggle в funnel-report | funnel-report.tsx | S | 4.1, 6.1 | 6 |
| 7.1 | Переписать FunnelSetupDialog (опциональный, не блокирующий) | funnel-setup-dialog.tsx | L | 3.1, 4.2 | 7 |
| 8.1 | FunnelChart: поддержка count/amount | funnel-chart.tsx | M | 6.2 | 8 |
| 8.2 | FunnelTable: поддержка count/amount | funnel-table.tsx | S | 6.2 | 8 |
| 8.3 | KpiCards: поддержка count/amount | kpi-cards.tsx | S | 6.2 | 8 |
| 8.4 | StageDrilldown + DrilldownDealList: board_name | stage-drilldown.tsx, drilldown-deal-list.tsx | S | 6.2 | 8 |
| 8.5 | EmployeeSection: поддержка count/amount | employee-section.tsx | S | 6.2 | 8 |
| 8.6 | FiltersSidebar: фильтр ответственного | filters-sidebar.tsx | M | 4.1 | 8 |
| 9.1 | Проверить компиляцию TypeScript | -- | S | Все | 9 |
| 9.2 | Визуальная проверка | -- | S | Все | 9 |
| 9.3 | Очистить legacy localStorage | use-best-guess.ts | S | 4.1 | 9 |

---

## Файлы: итоговая карта изменений

### Новые файлы (6)
> Все новые компоненты строятся исключительно на MUI 7.

| Файл | Описание |
|------|----------|
| `lib/best-guess.ts` | Алгоритм автоконфигурации |
| `lib/__tests__/best-guess.test.ts` | Тесты Best Guess |
| `lib/hooks/use-best-guess.ts` | Хук для Best Guess |
| `lib/hooks/use-funnel-overrides.ts` | Хук для пользовательских переопределений |
| `components/funnel/alert-banner.tsx` | Компонент алерт-баннера |
| `components/funnel/metric-mode-toggle.tsx` | Переключатель метрики |

### Удаляемые файлы (8 + 16 shadcn + 1 конфиг = 25)

| Файл | Причина удаления |
|------|------------------|
| `components/funnel/filters-panel.tsx` | Стаб, не используется |
| `components/funnel/period-select.tsx` | Стаб, не используется |
| `components/funnel/responsible-combobox.tsx` | Стаб, не используется |
| `components/funnel/configure-dialog.tsx` | Дубликат setup-dialog, не подключён |
| `components/funnel/funnel-config-dialog.tsx` | Read-only конфиг, не используется |
| `components/funnel/empty-state.tsx` | Стоп-экран, удаляем по P-001 |
| `lib/hooks/use-funnel-setup.ts` | Заменяется на use-funnel-overrides |
| `lib/hooks/use-funnel-config.ts` | Конфигурация переезжает в Best Guess |
| `components/ui/*.tsx` (16 файлов) | shadcn/ui — не используем, только MUI |
| `components.json` | Конфиг shadcn — не нужен |

### Модифицируемые файлы (14)

| Файл | Суть изменений |
|------|----------------|
| `lib/types.ts` | Новые типы: MetricMode, BestGuess*, AutoFunnelConfig, SpaceColumn.column_type |
| `lib/constants.ts` | DEFAULT_SPACE, ALERT_CODES |
| `data/mock-boards.ts` | Полная перезапись: CRM-сценарий с 3 досками |
| `data/mock-stages.ts` | Полная перезапись: multi-board этапы |
| `data/mock-deals.ts` | Полная перезапись: сделки с board_id |
| `data/mock-funnel-data.ts` | Обновление: metricMode param, board_ids filter |
| `lib/hooks/use-funnel-data.ts` | Обновление: metricMode param |
| `components/funnel/funnel-report.tsx` | Полная перезапись: убрать стоп-экран, Best Guess, алерты, метрика |
| `components/funnel/funnel-setup-dialog.tsx` | Переписать: опциональный диалог поверх Best Guess |
| `components/funnel/funnel-chart.tsx` | Добавить metricMode, условный рендер |
| `components/funnel/funnel-table.tsx` | Добавить metricMode, условный рендер |
| `components/funnel/kpi-cards.tsx` | Добавить metricMode |
| `components/funnel/employee-section.tsx` | Добавить metricMode |
| `components/funnel/filters-sidebar.tsx` | Добавить мультиселект ответственного |

### Файлы без изменений (6)

| Файл | Причина |
|------|---------|
| `components/funnel/conversion-badge.tsx` | Конверсия всегда по количеству -- без изменений |
| `components/funnel/view-switcher.tsx` | Переключатель chart/table не затронут |
| `components/funnel/stage-drilldown.tsx` | Минимальные изменения (board_name) -- указан в 8.4 |
| `components/funnel/drilldown-deal-list.tsx` | Минимальные изменения -- указан в 8.4 |
| `data/mock-managers.ts` | Без изменений |
| `lib/format.ts` | Без изменений |

---

## Оценка трудоёмкости

| Сложность | Количество задач | Ориентировочное время |
|-----------|------------------|-----------------------|
| S (small) | 17 | ~15-30 мин каждая |
| M (medium) | 9 | ~30-60 мин каждая |
| L (large) | 3 | ~1-2 ч каждая |
| **Итого** | **29 задач** | ~12-18 ч работы |

---

## Порядок выполнения (рекомендуемый)

Задачи внутри фазы можно делать параллельно, если нет зависимостей друг от друга.

```
Фаза 0 (0.1, 0.2)           -- 30 мин
     |
Фаза 1 (1.1, 1.2)           -- 1 ч
     |
Фаза 2 (2.1 -> 2.2 -> 2.3 -> 2.4)  -- 2-3 ч
     |
Фаза 3 (3.1 -> 3.2)         -- 2-3 ч
     |
Фаза 4 (4.1, 4.2, 4.3, 4.4) -- 2-3 ч
     |
Фаза 5 (5.1 -> 5.2)  +  Фаза 6 (6.1 -> 6.2)  -- параллельно, ~1 ч
     |
Фаза 7 (7.1)                 -- 1-2 ч
     |
Фаза 8 (8.1-8.6)             -- 2-3 ч (параллелятся)
     |
Фаза 9 (9.1, 9.2, 9.3)      -- 30 мин
```

---

## Маппинг на требования CPO

| Код | Требование | Задачи в плане |
|-----|-----------|----------------|
| **P-001** | Убрать стоп-экран | 0.2, 4.1 |
| **P-002** | Следовать паттерну Best Guess | 3.1, 3.2, 4.1 |
| **P-003** | Убрать двухуровневую настройку | 0.2, 4.1, 4.2 |
| **P-004** | Включить все доски (не только первую) | 2.1, 3.1 |
| **P-005** | Воронка per space, не per board | 1.1, 2.1-2.4, 3.1 |
| **P-006** | Fallback на count при отсутствии amount | 3.1 (шаг 5), 6.1, 6.2 |
| **P-007** | Разные amount fields -> fallback | 3.1 (шаг 5), 5.1 |
| **F-001** | Best Guess алгоритм | 3.1, 3.2 |
| **F-002** | Алерт-баннер | 5.1, 5.2 |
| **F-003** | Селектор поля суммы | 7.1 |
| **F-004** | Fallback на count | 6.1, 6.2, 8.1-8.5 |
| **F-005** | Unified funnel across boards | 2.1-2.4, 3.1 |
| **F-006** | Sum hidden columns | Не реализуется в текущем scope (Nice to Have) |

---

## Открытые вопросы

1. ~~**Проигранная колонка — последняя или предпоследняя?**~~ **РЕШЕНО:** Проиграно идёт после Оплачено, всегда последняя на графике. Порядок: Этапы → Оплачено → Проиграно.

2. **F-006 (Sum hidden columns):** Требование суммировать скрытые колонки вместо исключения -- нужно ли реализовывать в mock? Рекомендация: отложить, т.к. это Nice to Have и требует уточнения UX-паттерна.

3. **Кумулятивная диаграмма как референс:** Нужно ли визуально сверять UI с кумулятивной диаграммой Kaiten? Если да -- нужен скриншот.

4. **Несколько пространств:** Текущий прототип работает с одним пространством (`MOCK_SPACE_ID`). Переключение между пространствами -- отдельная задача, не входит в scope.

5. **Сохранение overrides:** Overrides хранятся в localStorage привязано к `space_id`. При смене пространства -- свои overrides. Верно ли это поведение?

## Уточнения от продукта (зафиксировано)

### Логика Best Guess (уточнение от продукта):
- **Обычные колонки** → этапы воронки
- **Колонка с типом "done"** → Оплачено (won)
- **Проиграно** (lost) → отображается **после** Оплачено, всегда последняя на графике
- Порядок: `[Этап 1] → [Этап 2] → ... → [Оплачено] → [Проиграно]`

### Поле суммы (уточнение от продукта):
- Если на доске **не настроено** кастомное поле суммы → график строится **только по количеству сделок**, без денег
- Если **настроено** → строим график с суммой
- Не угадываем поле автоматически — берём только то, что явно задано в настройках доски
- Показываем подсказку: "Выберите поле суммы, чтобы график был полнее"
