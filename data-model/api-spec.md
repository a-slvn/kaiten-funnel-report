# Спецификация API: Отчёт «Воронка продаж»

## История изменений

| Дата | Версия | Автор | Описание |
|------|--------|-------|----------|
| 2026-02-26 | 2.1 | business-analyst | **Race condition fix.** POST config: upsert-поведение при конфликте `(space_id, company_id)` -- возврат существующего конфига с `200` вместо `409`. Auto-config: добавлено поле `structure_hash` для отслеживания изменений структуры пространства. POST config: добавлено поле `expected_structure_hash` для optimistic locking. Новый код ошибки `STRUCTURE_CHANGED (409)`. |
| 2026-02-26 | 2.0 | business-analyst | **MAJOR UPDATE по фидбеку CPO.** Новый endpoint: `GET /api/v1/reports/funnel/auto-config` для автоконфигурации Best Guess. Обновлён основной endpoint: добавлен `space_id` как альтернатива `funnel_config_id`, параметр `metric_mode`. Обновлён response: `board_id` -> `space_id` + `board_ids[]`, добавлен `metric_mode`. Config endpoints переведены на space-level: `space_id` вместо `board_id`, добавлены `board_ids[]`, `metric_mode`, `auto_generated`, `deal_amount_field_mapping`. Обновлены все TypeScript-интерфейсы. Обновлены коды ошибок. Источники: `cpo-feedback-changelog.md`, `best-guess-algorithm.md`, `multi-board-unification.md`, `data-model.md` v2.0. |
| 2026-02 | 1.0 | business-analyst | Первоначальная версия. Single-board модель. |

---

## Общее описание

Данный документ описывает API-контракт для отчёта «Воронка продаж» в Kaiten CRM. Включает endpoints для получения данных воронки, автоконфигурации, drill-down по этапам и управления конфигурацией воронки.

**Базовый URL:** `/api/v1`

**Аутентификация:** Bearer token в заголовке `Authorization`. Все запросы автоматически ограничены `company_id` пользователя (мультитенантность).

**Формат:** JSON. Даты -- ISO 8601 (`YYYY-MM-DD`). Timestamps -- ISO 8601 с timezone (`YYYY-MM-DDTHH:mm:ssZ`).

**Ключевое изменение v2.0:** Воронка строится на уровне **пространства** (`space_id`), а не отдельной доски. Основной endpoint принимает `space_id` как альтернативу `funnel_config_id`. При отсутствии сохранённой конфигурации применяется алгоритм Best Guess (автоконфигурация). Поддерживаются два режима метрики: `amount` и `count`.

---

## 1. TypeScript-интерфейсы (общие типы)

```typescript
/** Результат выполнения: обёртка для всех ответов */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

/** Пагинация */
interface PaginationParams {
  page?: number;       // Номер страницы, начиная с 1. По умолчанию: 1
  per_page?: number;   // Элементов на странице. По умолчанию: 25. Макс: 100
}

interface PaginationMeta {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Направление тренда */
type TrendDirection = 'up' | 'down' | 'stable';

/** Тип значения: позитивный или негативный (для цвета) */
type DeltaSentiment = 'positive' | 'negative' | 'neutral';

/** Итог сделки */
type DealOutcome = 'in_progress' | 'won' | 'lost';

/** Режим метрики */
type MetricMode = 'amount' | 'count';

/** Уровень уверенности автоконфигурации */
type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Тип алерта автоконфигурации */
type AlertType = 'info' | 'warning' | 'error';

/** Сортировка */
interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
```

---

## 2. Endpoints

### 2.1. GET /api/v1/reports/funnel

Основной endpoint отчёта. Возвращает полную структуру данных воронки: метрики по каждому этапу и агрегированные метрики воронки.

#### Request

**Method:** `GET`

**Query Parameters:**

| Параметр | Тип | Обязательный | Описание | Пример |
|----------|-----|:------------:|----------|--------|
| `funnel_config_id` | integer | Условно | ID конфигурации воронки. Обязателен, если не задан `space_id` | `1` |
| `space_id` | integer | Условно | ID пространства. Обязателен, если не задан `funnel_config_id`. При отсутствии сохранённого конфига -- применяется автоконфигурация Best Guess | `42` |
| `date_from` | date (ISO) | Да | Начало периода | `2024-06-01` |
| `date_to` | date (ISO) | Да | Конец периода | `2024-06-30` |
| `metric_mode` | string | Нет | Режим метрики: `amount` или `count`. По умолчанию -- из конфигурации или `count` при auto-config | `count` |
| `compare_date_from` | date (ISO) | Нет | Начало периода сравнения | `2024-05-01` |
| `compare_date_to` | date (ISO) | Нет | Конец периода сравнения | `2024-05-31` |
| `responsible_ids` | string (comma-separated) | Нет | Фильтр по ответственным | `301,302` |
| `source_values` | string (comma-separated) | Нет | Фильтр по источникам | `cold_call,website` |
| `tag_names` | string (comma-separated) | Нет | Фильтр по тегам | `enterprise,strategic` |
| `amount_min` | decimal | Нет | Минимальная сумма сделки (игнорируется при `metric_mode = 'count'`) | `100000` |
| `amount_max` | decimal | Нет | Максимальная сумма сделки (игнорируется при `metric_mode = 'count'`) | `1000000` |
| `include_archived` | boolean | Нет | Включать архивные. По умолчанию `false` | `false` |
| `win_rate_mode` | string | Нет | Режим расчёта win rate: `strict` (в пределах периода, по умолчанию) или `loose` (без ограничения на дату победы) | `strict` |

**Логика определения конфигурации:**
1. Если задан `funnel_config_id` -- используется сохранённый конфиг
2. Если задан `space_id` (без `funnel_config_id`):
   - Ищется сохранённый конфиг для `(space_id, company_id)`
   - Если найден -- используется он
   - Если не найден -- запускается Best Guess (автоконфигурация)
3. Если не задан ни `funnel_config_id`, ни `space_id` -- ошибка `MISSING_REQUIRED_PARAM`

**Валидация:**
- Должен быть задан хотя бы один из: `funnel_config_id`, `space_id`
- `date_from` <= `date_to`
- Если указан `compare_date_from`, то `compare_date_to` тоже обязателен
- `compare_date_from` <= `compare_date_to`
- `amount_min` <= `amount_max` (если оба заданы, и `metric_mode = 'amount'`)
- `funnel_config_id` (если задан) должен принадлежать `company_id` пользователя
- `space_id` (если задан) должен принадлежать `company_id` пользователя
- `metric_mode` должен быть `amount` или `count` (если задан)
- Максимальный период: 366 дней

#### Response

**Status:** `200 OK`

```typescript
interface FunnelReportResponse {
  /** Метаданные отчёта */
  meta: FunnelReportMeta;

  /** Метрики по каждому этапу воронки (в порядке этапов) */
  stages: FunnelStageData[];

  /** Агрегированные метрики всей воронки */
  summary: FunnelSummaryData;

  /** Данные сравнения с предыдущим периодом (null если не запрошено) */
  comparison: FunnelComparisonData | null;

  /** Алерты автоконфигурации (пустой массив если конфиг сохранённый) */
  alerts: BestGuessAlert[];
}

interface FunnelReportMeta {
  /** ID конфигурации (null если auto-config) */
  funnel_config_id: number | null;
  funnel_name: string;

  /** Пространство */
  space_id: number;
  space_name: string;

  /** Доски, входящие в воронку */
  board_ids: number[];
  boards: {
    id: number;
    name: string;
  }[];

  /** Режим метрики */
  metric_mode: MetricMode;

  /** Конфигурация создана автоматически (Best Guess) */
  auto_generated: boolean;

  date_from: string;        // ISO date
  date_to: string;          // ISO date
  filters_applied: {
    responsible_ids: number[] | null;
    source_values: string[] | null;
    tag_names: string[] | null;
    amount_min: number | null;
    amount_max: number | null;
    include_archived: boolean;
  };
  total_deals_in_scope: number;   // Общее кол-во сделок, попавших под фильтры
  generated_at: string;           // ISO timestamp
}

/** Алерт автоконфигурации */
interface BestGuessAlert {
  type: AlertType;
  code: string;
  message: string;
  action_label: string;
  action_target: 'settings' | 'board';
}

/** Метрики одного этапа */
interface FunnelStageData {
  stage_column_id: number;
  stage_name: string;
  stage_sort_order: number;

  /** Кол-во уникальных сделок, вошедших на этап за период */
  deals_entered: number;

  /** Суммарная стоимость сделок (null если все без суммы) */
  total_amount: number | null;

  /** Кол-во сделок с заполненной суммой */
  deals_with_amount: number;

  /** Кол-во сделок без суммы */
  deals_without_amount: number;

  /** Средний чек (null если нет сделок с суммой) */
  avg_amount: number | null;

  /** Конверсия в следующий этап (0.0 - 1.0, null если нет данных) */
  conversion_to_next: number | null;

  /** Конверсия в победу от этого этапа (0.0 - 1.0, null если нет данных) */
  conversion_to_win: number | null;

  /** Коэффициент потерь от этого этапа (0.0 - 1.0, null если нет данных) */
  drop_off_rate: number | null;

  /** Среднее время на этапе в днях (null если нет завершённых пребываний) */
  avg_duration_days: number | null;

  /** Медианное время на этапе в днях */
  median_duration_days: number | null;

  /** Кол-во сделок, ещё находящихся на этапе */
  deals_currently_on_stage: number;

  /** Кол-во зависших сделок */
  stale_deals_count: number;

  /** Порог зависания (дни) */
  stale_threshold_days: number;
}

/** Агрегированные метрики всей воронки */
interface FunnelSummaryData {
  /** Общая конверсия: вход -> победа */
  overall_conversion: number | null;

  /** Всего вошло на первый этап */
  total_entered: number;

  /** Всего выиграно */
  total_won: number;

  /** Всего проиграно */
  total_lost: number;

  /** Ещё в процессе */
  total_in_progress: number;

  /** Средний цикл сделки (дни, null если нет побед) */
  avg_sales_cycle_days: number | null;

  /** Медианный цикл сделки (дни) */
  median_sales_cycle_days: number | null;

  /** Объём воронки: сумма активных сделок на date_to */
  pipeline_value: number | null;

  /** Кол-во активных сделок */
  pipeline_deals_count: number;

  /** Кол-во активных сделок без суммы */
  pipeline_deals_without_amount: number;

  /** Взвешенный объём воронки */
  weighted_pipeline_value: number | null;

  /** Скорость воронки (валюта/день, null если невозможно рассчитать) */
  velocity_per_day: number | null;

  /** Средний чек выигранных сделок (null если нет побед) */
  avg_won_deal_size: number | null;

  /** Распределение потерь по этапам */
  lost_by_stage: LostByStageItem[];
}

interface LostByStageItem {
  stage_column_id: number;
  stage_name: string;
  count: number;
  amount: number | null;
}

/** Данные сравнения периодов */
interface FunnelComparisonData {
  compare_date_from: string;
  compare_date_to: string;

  /** Метрики предыдущего периода по этапам */
  stages: FunnelStageData[];

  /** Метрики предыдущего периода (агрегаты) */
  summary: FunnelSummaryData;

  /** Дельты по этапам */
  stage_deltas: FunnelStageDelta[];

  /** Дельты по агрегированным метрикам */
  summary_deltas: FunnelSummaryDelta;
}

interface FunnelStageDelta {
  stage_column_id: number;
  stage_name: string;

  deals_entered: DeltaValue;
  total_amount: DeltaValue;
  avg_amount: DeltaValue;
  conversion_to_next: DeltaValue;
  conversion_to_win: DeltaValue;
  drop_off_rate: DeltaValue;
  avg_duration_days: DeltaValue;
  median_duration_days: DeltaValue;
  stale_deals_count: DeltaValue;
}

interface FunnelSummaryDelta {
  overall_conversion: DeltaValue;
  total_entered: DeltaValue;
  total_won: DeltaValue;
  total_lost: DeltaValue;
  avg_sales_cycle_days: DeltaValue;
  pipeline_value: DeltaValue;
  weighted_pipeline_value: DeltaValue;
  velocity_per_day: DeltaValue;
}

interface DeltaValue {
  /** Абсолютная дельта (null если невозможно рассчитать) */
  absolute: number | null;

  /** Относительная дельта в процентах (null если деление на ноль) */
  relative_percent: number | null;

  /** Направление тренда */
  trend: TrendDirection | null;

  /** Позитивное или негативное изменение (для цвета) */
  sentiment: DeltaSentiment;
}
```

#### Пример ответа

```json
{
  "success": true,
  "data": {
    "meta": {
      "funnel_config_id": 1,
      "funnel_name": "Основная воронка B2B",
      "space_id": 42,
      "space_name": "CRM",
      "board_ids": [1042, 1043],
      "boards": [
        {"id": 1042, "name": "Лиды"},
        {"id": 1043, "name": "Сделки"}
      ],
      "metric_mode": "amount",
      "auto_generated": false,
      "date_from": "2024-06-01",
      "date_to": "2024-06-30",
      "filters_applied": {
        "responsible_ids": null,
        "source_values": null,
        "tag_names": null,
        "amount_min": null,
        "amount_max": null,
        "include_archived": false
      },
      "total_deals_in_scope": 200,
      "generated_at": "2024-07-01T10:30:00Z"
    },
    "stages": [
      {
        "stage_column_id": 5001,
        "stage_name": "Квалификация",
        "stage_sort_order": 1,
        "deals_entered": 200,
        "total_amount": 28000000,
        "deals_with_amount": 180,
        "deals_without_amount": 20,
        "avg_amount": 155555.56,
        "conversion_to_next": 0.60,
        "conversion_to_win": 0.185,
        "drop_off_rate": 0.23,
        "avg_duration_days": 3.2,
        "median_duration_days": 2.5,
        "deals_currently_on_stage": 35,
        "stale_deals_count": 4,
        "stale_threshold_days": 7
      },
      {
        "stage_column_id": 5002,
        "stage_name": "Встреча",
        "stage_sort_order": 2,
        "deals_entered": 120,
        "total_amount": 19200000,
        "deals_with_amount": 115,
        "deals_without_amount": 5,
        "avg_amount": 166956.52,
        "conversion_to_next": 0.667,
        "conversion_to_win": 0.308,
        "drop_off_rate": 0.167,
        "avg_duration_days": 5.1,
        "median_duration_days": 4.0,
        "deals_currently_on_stage": 22,
        "stale_deals_count": 3,
        "stale_threshold_days": 10
      }
    ],
    "summary": {
      "overall_conversion": 0.185,
      "total_entered": 200,
      "total_won": 37,
      "total_lost": 63,
      "total_in_progress": 100,
      "avg_sales_cycle_days": 42.7,
      "median_sales_cycle_days": 35.0,
      "pipeline_value": 12450000,
      "pipeline_deals_count": 95,
      "pipeline_deals_without_amount": 3,
      "weighted_pipeline_value": 4230000,
      "velocity_per_day": 199297,
      "avg_won_deal_size": 230000,
      "lost_by_stage": [
        {"stage_column_id": 5001, "stage_name": "Квалификация", "count": 28, "amount": 3200000},
        {"stage_column_id": 5002, "stage_name": "Встреча", "count": 20, "amount": 2800000},
        {"stage_column_id": 5003, "stage_name": "Предложение", "count": 15, "amount": 3500000}
      ]
    },
    "comparison": null,
    "alerts": []
  }
}
```

**Пример ответа с auto-config (Best Guess):**

```json
{
  "success": true,
  "data": {
    "meta": {
      "funnel_config_id": null,
      "funnel_name": "CRM (автоконфигурация)",
      "space_id": 42,
      "space_name": "CRM",
      "board_ids": [1042, 1043],
      "boards": [
        {"id": 1042, "name": "Лиды"},
        {"id": 1043, "name": "Сделки"}
      ],
      "metric_mode": "count",
      "auto_generated": true,
      "date_from": "2024-06-01",
      "date_to": "2024-06-30",
      "filters_applied": {
        "responsible_ids": null,
        "source_values": null,
        "tag_names": null,
        "amount_min": null,
        "amount_max": null,
        "include_archived": false
      },
      "total_deals_in_scope": 150,
      "generated_at": "2024-07-01T10:30:00Z"
    },
    "stages": [],
    "summary": {},
    "comparison": null,
    "alerts": [
      {
        "type": "info",
        "code": "NO_AMOUNT_FIELD",
        "message": "На досках нет числового поля для суммы сделки. Воронка построена по количеству карточек.",
        "action_label": "Перейти к доске",
        "action_target": "board"
      }
    ]
  }
}
```

#### Коды ошибок

| HTTP Status | Код ошибки | Описание |
|:-----------:|------------|----------|
| `400` | `INVALID_DATE_RANGE` | `date_from` > `date_to` или период > 366 дней |
| `400` | `INVALID_COMPARE_RANGE` | Указан `compare_date_from`, но не `compare_date_to` |
| `400` | `INVALID_AMOUNT_RANGE` | `amount_min` > `amount_max` |
| `400` | `INVALID_METRIC_MODE` | Недопустимое значение `metric_mode` (должно быть `amount` или `count`) |
| `400` | `MISSING_REQUIRED_PARAM` | Не указан ни `funnel_config_id`, ни `space_id` |
| `403` | `ACCESS_DENIED` | Конфигурация или пространство принадлежит другой компании |
| `404` | `FUNNEL_CONFIG_NOT_FOUND` | Конфигурация воронки не найдена (при передаче `funnel_config_id`) |
| `404` | `SPACE_NOT_FOUND` | Пространство не найдено (при передаче `space_id`) |
| `422` | `NO_BOARDS_IN_SPACE` | В пространстве нет досок (Best Guess невозможен) |
| `422` | `ALL_COLUMNS_DONE` | Все колонки на досках имеют тип "done" -- невозможно построить этапы |
| `500` | `CALCULATION_ERROR` | Внутренняя ошибка при расчёте метрик |

---

### 2.2. GET /api/v1/reports/funnel/auto-config

Endpoint автоконфигурации Best Guess. Возвращает автоматически определённую конфигурацию воронки для пространства. Вызывается при первом визите на отчёт (без сохранённого конфига) или при явном сбросе конфигурации.

#### Request

**Method:** `GET`

**Query Parameters:**

| Параметр | Тип | Обязательный | Описание | Пример |
|----------|-----|:------------:|----------|--------|
| `space_id` | integer | Да | ID пространства | `42` |

#### Response

**Status:** `200 OK`

```typescript
interface AutoConfigResponse {
  /** Автоконфигурация воронки */
  config: AutoFunnelConfig;

  /** Алерты для пользователя */
  alerts: BestGuessAlert[];

  /** Уровень уверенности алгоритма */
  confidence: ConfidenceLevel;

  /** Режим метрики */
  metric_mode: MetricMode;

  /** Причина выбора metric_mode */
  metric_mode_reason: string;

  /**
   * Хеш структуры пространства на момент генерации.
   * Вычисляется как SHA-256 от отсортированной конкатенации:
   *   sorted(board_ids) + sorted(column_ids всех досок) + sorted(custom_field_ids всех досок)
   * Используется для optimistic locking при сохранении конфига:
   * клиент передаёт этот хеш в POST config, бекенд сравнивает с текущим состоянием.
   */
  structure_hash: string;
}

interface AutoFunnelConfig {
  space_id: number;
  space_name: string;

  /** Доски, включённые в воронку */
  board_ids: number[];
  boards: {
    id: number;
    name: string;
  }[];

  /** Этапы воронки (глобальный порядок) */
  stages: AutoConfigStage[];

  /** Колонки победы */
  win_column_ids: number[];
  win_columns: {
    column_id: number;
    column_name: string;
    board_id: number;
    board_name: string;
  }[];

  /** Колонки проигрыша */
  loss_column_ids: number[];
  loss_columns: {
    column_id: number;
    column_name: string;
    board_id: number;
    board_name: string;
  }[];

  /** ID поля суммы (null если не определено) */
  deal_amount_field_id: number | null;
  deal_amount_field_name: string | null;

  /** Флаг автогенерации (всегда true для auto-config) */
  auto_generated: true;
}

interface AutoConfigStage {
  column_id: number;
  board_id: number;
  board_name: string;
  label: string;
  /** Отображаемое название (с суффиксом доски при дублировании) */
  display_label: string;
  sort_order: number;
}
```

#### Пример ответа

```json
{
  "success": true,
  "data": {
    "config": {
      "space_id": 42,
      "space_name": "CRM",
      "board_ids": [1042, 1043],
      "boards": [
        {"id": 1042, "name": "Лиды"},
        {"id": 1043, "name": "Сделки"}
      ],
      "stages": [
        {"column_id": 5001, "board_id": 1042, "board_name": "Лиды", "label": "Новый лид", "display_label": "Новый лид", "sort_order": 1},
        {"column_id": 5002, "board_id": 1042, "board_name": "Лиды", "label": "Квалификация", "display_label": "Квалификация", "sort_order": 2},
        {"column_id": 6001, "board_id": 1043, "board_name": "Сделки", "label": "Встреча", "display_label": "Встреча", "sort_order": 3},
        {"column_id": 6002, "board_id": 1043, "board_name": "Сделки", "label": "Предложение", "display_label": "Предложение", "sort_order": 4}
      ],
      "win_column_ids": [6004],
      "win_columns": [
        {"column_id": 6004, "column_name": "Выигран", "board_id": 1043, "board_name": "Сделки"}
      ],
      "loss_column_ids": [6003],
      "loss_columns": [
        {"column_id": 6003, "column_name": "Проигран", "board_id": 1043, "board_name": "Сделки"}
      ],
      "deal_amount_field_id": 201,
      "deal_amount_field_name": "Сумма сделки",
      "auto_generated": true
    },
    "alerts": [],
    "confidence": "high",
    "metric_mode": "amount",
    "metric_mode_reason": "single_common_field",
    "structure_hash": "a1b2c3d4e5f6..."
  }
}
```

#### Когда вызывается

1. **Первый визит на отчёт:** Пользователь открывает воронку для пространства, для которого нет сохранённой конфигурации. Клиент вызывает `auto-config`, получает конфигурацию, затем вызывает основной endpoint с `space_id`.
2. **Сброс конфигурации:** Пользователь удаляет сохранённый конфиг (DELETE config/:id). Клиент запрашивает auto-config для пересчёта.
3. **Превью настроек:** UI настроек предзаполняется результатами auto-config.

**Важно:** Auto-config НЕ сохраняет конфигурацию в БД. Это read-only endpoint. Для сохранения конфигурации используйте POST config.

#### Коды ошибок

| HTTP Status | Код ошибки | Описание |
|:-----------:|------------|----------|
| `403` | `ACCESS_DENIED` | Пространство принадлежит другой компании |
| `404` | `SPACE_NOT_FOUND` | Пространство не найдено |
| `422` | `NO_BOARDS_IN_SPACE` | В пространстве нет досок |
| `422` | `ALL_COLUMNS_DONE` | Все колонки на досках имеют тип "done" |

---

### 2.3. GET /api/v1/reports/funnel/stages/:stageColumnId/deals

Drill-down: список сделок на конкретном этапе воронки. Поддерживает пагинацию и сортировку.

#### Request

**Method:** `GET`

**Path Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `stageColumnId` | integer | ID колонки-этапа |

**Query Parameters:**

| Параметр | Тип | Обязательный | Описание | Пример |
|----------|-----|:------------:|----------|--------|
| `funnel_config_id` | integer | Условно | ID конфигурации воронки. Обязателен, если не задан `space_id` | `1` |
| `space_id` | integer | Условно | ID пространства. Обязателен, если не задан `funnel_config_id` | `42` |
| `date_from` | date | Да | Начало периода | `2024-06-01` |
| `date_to` | date | Да | Конец периода | `2024-06-30` |
| `deal_status` | string | Нет | Фильтр по статусу: `entered` (вошли на этап), `currently_on` (сейчас на этапе), `exited_forward` (прошли дальше), `exited_to_win` (выиграны), `exited_to_loss` (проиграны), `stale` (зависшие). По умолчанию: `entered` | `stale` |
| `responsible_ids` | string | Нет | Фильтр по ответственным (comma-separated) | `301,302` |
| `source_values` | string | Нет | Фильтр по источникам | `cold_call` |
| `tag_names` | string | Нет | Фильтр по тегам | `enterprise` |
| `amount_min` | decimal | Нет | Минимальная сумма | `100000` |
| `amount_max` | decimal | Нет | Максимальная сумма | `500000` |
| `include_archived` | boolean | Нет | Включать архивные | `false` |
| `page` | integer | Нет | Номер страницы (с 1). По умолчанию: `1` | `1` |
| `per_page` | integer | Нет | Элементов на странице. По умолчанию: `25`. Макс: `100` | `25` |
| `sort_by` | string | Нет | Поле сортировки: `entered_at`, `deal_amount`, `duration_days`, `title`, `responsible_name`. По умолчанию: `entered_at` | `deal_amount` |
| `sort_order` | string | Нет | Направление: `asc`, `desc`. По умолчанию: `desc` | `desc` |

#### Response

**Status:** `200 OK`

```typescript
interface FunnelStageDealListResponse {
  stage: {
    stage_column_id: number;
    stage_name: string;
    stage_sort_order: number;
  };

  items: FunnelDealItem[];

  pagination: PaginationMeta;

  /** Агрегаты по текущей выборке (с учётом фильтров) */
  aggregates: {
    total_count: number;
    total_amount: number | null;
    avg_amount: number | null;
    avg_duration_days: number | null;
    deals_without_amount: number;
  };
}

interface FunnelDealItem {
  card_id: number;
  card_title: string;

  /** URL карточки в Kaiten (для перехода) */
  card_url: string;

  /** Доска, на которой находится карточка */
  board_id: number;
  board_name: string;

  /** Ответственный */
  responsible: {
    id: number;
    full_name: string;
  } | null;

  /** Сумма сделки (null при metric_mode = 'count' или если сумма не заполнена) */
  deal_amount: number | null;

  /** Источник */
  source: string | null;

  /** Теги */
  tags: string[];

  /** Время входа на этот этап */
  entered_at: string;   // ISO timestamp

  /** Время выхода с этапа (null если ещё на этапе) */
  exited_at: string | null;

  /** Время пребывания на этапе в днях */
  duration_days: number;

  /** Куда ушла сделка */
  next_stage_name: string | null;

  /** Текущий статус сделки в воронке */
  outcome: DealOutcome;

  /** Номер визита на этот этап */
  visit_number: number;

  /** Флаг: зависшая ли сделка */
  is_stale: boolean;
}
```

#### Пример ответа

```json
{
  "success": true,
  "data": {
    "stage": {
      "stage_column_id": 5002,
      "stage_name": "Встреча",
      "stage_sort_order": 2
    },
    "items": [
      {
        "card_id": 98765,
        "card_title": "Контракт с Газпром",
        "card_url": "/boards/1042/cards/98765",
        "board_id": 1042,
        "board_name": "Лиды",
        "responsible": {
          "id": 301,
          "full_name": "Иванов Пётр"
        },
        "deal_amount": 350000,
        "source": "Холодный звонок",
        "tags": ["enterprise", "neft"],
        "entered_at": "2024-06-05T11:45:00Z",
        "exited_at": "2024-06-08T09:15:00Z",
        "duration_days": 2.9,
        "next_stage_name": "Предложение",
        "outcome": "in_progress",
        "visit_number": 1,
        "is_stale": false
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 25,
      "total_count": 120,
      "total_pages": 5
    },
    "aggregates": {
      "total_count": 120,
      "total_amount": 19200000,
      "avg_amount": 166956.52,
      "avg_duration_days": 5.1,
      "deals_without_amount": 5
    }
  }
}
```

#### Коды ошибок

| HTTP Status | Код ошибки | Описание |
|:-----------:|------------|----------|
| `400` | `INVALID_DATE_RANGE` | Некорректный диапазон дат |
| `400` | `INVALID_DEAL_STATUS` | Недопустимое значение `deal_status` |
| `400` | `INVALID_SORT_FIELD` | Недопустимое значение `sort_by` |
| `400` | `INVALID_PAGINATION` | `page` < 1 или `per_page` > 100 |
| `403` | `ACCESS_DENIED` | Нет доступа к конфигурации воронки |
| `404` | `FUNNEL_CONFIG_NOT_FOUND` | Конфигурация не найдена |
| `404` | `STAGE_NOT_FOUND` | Указанная колонка не входит в конфигурацию воронки |

---

### 2.4. GET /api/v1/reports/funnel/config

Получение конфигурации воронки.

#### Request

**Method:** `GET`

**Query Parameters:**

| Параметр | Тип | Обязательный | Описание | Пример |
|----------|-----|:------------:|----------|--------|
| `space_id` | integer | Нет | Фильтр по пространству. Если не указан -- возвращаются все конфигурации компании | `42` |

#### Response

**Status:** `200 OK`

```typescript
interface FunnelConfigListResponse {
  items: FunnelConfigItem[];
}

interface FunnelConfigItem {
  id: number;

  /** Пространство */
  space_id: number;
  space_name: string;

  /** Доски, входящие в воронку */
  board_ids: number[];
  boards: {
    id: number;
    name: string;
  }[];

  name: string;

  /** Режим метрики */
  metric_mode: MetricMode;

  /** Конфигурация создана автоматически (Best Guess) */
  auto_generated: boolean;

  stages: FunnelConfigStage[];

  win_columns: FunnelConfigColumn[];
  loss_columns: FunnelConfigColumn[];

  /** ID общего кастомного поля «Сумма сделки» (null если не настроено) */
  deal_amount_field_id: number | null;
  deal_amount_field_name: string | null;

  /** Маппинг полей суммы по доскам (null если не настроен) */
  deal_amount_field_mapping: Record<string, number> | null;

  /** ID кастомного поля «Источник» */
  deal_source_field_id: number | null;
  deal_source_field_name: string | null;

  /** Вероятности победы по этапам (null если не настроены) */
  stage_probabilities: Record<number, number> | null;

  /** Скрытые колонки (null если нет) */
  hidden_column_ids: number[] | null;

  created_at: string;
  updated_at: string;
  created_by: {
    id: number;
    full_name: string;
  };
}

interface FunnelConfigStage {
  column_id: number;
  board_id: number;
  board_name: string;
  column_name: string;
  label: string;            // Пользовательское название этапа
  display_label: string;    // Отображаемое (с суффиксом доски при дублировании)
  sort_order: number;
  stale_threshold_days: number;
}

interface FunnelConfigColumn {
  column_id: number;
  column_name: string;
  board_id: number;
  board_name: string;
}
```

#### Коды ошибок

| HTTP Status | Код ошибки | Описание |
|:-----------:|------------|----------|
| `403` | `ACCESS_DENIED` | Пространство принадлежит другой компании |
| `404` | `SPACE_NOT_FOUND` | Пространство не найдено |

---

### 2.5. POST /api/v1/reports/funnel/config

Создание новой конфигурации воронки. Привязка к пространству (`space_id`), а не к отдельной доске.

#### Стратегия обработки конкурентных запросов (race condition)

**Проблема:** Два параллельных запроса на создание конфига для одного пространства: оба проходят валидацию, один получает конфликт по unique constraint `(space_id, company_id)`. Типичный сценарий: два пользователя открывают отчёт, оба видят auto-config, оба нажимают "Сохранить".

**Решение: upsert-like поведение.**

Бекенд использует `INSERT ... ON CONFLICT (space_id, company_id) DO NOTHING` + `SELECT`:

1. Выполнить `INSERT ... ON CONFLICT (space_id, company_id) DO NOTHING`
2. Если вставка произошла (affected rows = 1) -- вернуть созданный конфиг с кодом `201 Created`
3. Если вставка не произошла (affected rows = 0, конфиг уже существует) -- загрузить существующий конфиг по `(space_id, company_id)` и вернуть его с кодом `200 OK`

Таким образом, оба параллельных запроса получают успешный ответ. Первый получает `201`, второй -- `200` с уже существующим конфигом. Ошибка `409 CONFIG_EXISTS` **больше не возвращается** при обычном создании.

**Индикация для клиента:** Клиент отличает "создал новый" от "получил существующий" по HTTP-коду ответа (`201` vs `200`). В ответе `200` дополнительно возвращается флаг:

```typescript
interface CreateFunnelConfigResponse {
  /** true, если конфиг уже существовал и был возвращён без изменений */
  already_existed: boolean;
  id: number;
  // ... все поля FunnelConfigItem
}
```

#### Optimistic locking через structure_hash

**Проблема:** Auto-config генерируется на лету, но структура пространства (доски, колонки, кастомные поля) может измениться между моментом генерации и моментом сохранения.

**Решение:** Поле `expected_structure_hash` в запросе на создание конфига.

1. Клиент получает auto-config через `GET /auto-config` -- ответ содержит `structure_hash`
2. При сохранении конфига клиент передаёт этот хеш в поле `expected_structure_hash`
3. Бекенд вычисляет текущий `structure_hash` пространства
4. Если хеши не совпадают -- структура изменилась, бекенд возвращает `409 STRUCTURE_CHANGED` с новым auto-config в теле ответа
5. Если хеши совпадают или `expected_structure_hash` не передан -- сохранение продолжается

#### Request

**Method:** `POST`

**Body:**

```typescript
interface CreateFunnelConfigRequest {
  /** Пространство (обязательно) */
  space_id: number;

  /** Доски, входящие в воронку (обязательно) */
  board_ids: number[];

  name: string;

  /** Режим метрики */
  metric_mode?: MetricMode;  // По умолчанию: 'count'

  /** Этапы воронки в порядке прохождения */
  stages: {
    column_id: number;
    board_id: number;
    label?: string;                // Переопределение названия (по умолчанию = column.title)
    stale_threshold_days?: number; // По умолчанию: 14
  }[];

  /** Колонки победы */
  win_column_ids: number[];

  /** Колонки проигрыша */
  loss_column_ids: number[];

  /** Общее поле суммы (опционально) */
  deal_amount_field_id?: number;

  /** Маппинг полей суммы по доскам (опционально, для multi-board с разными полями) */
  deal_amount_field_mapping?: Record<string, number>;

  /** Поле источника (опционально) */
  deal_source_field_id?: number;

  /** Вероятности победы по этапам (опционально) */
  stage_probabilities?: Record<number, number>;

  /** Скрытые колонки (опционально, Nice to Have) */
  hidden_column_ids?: number[];

  /** Конфигурация создана автоматически (для сохранения результата Best Guess) */
  auto_generated?: boolean;  // По умолчанию: false

  /**
   * Хеш структуры пространства, полученный из auto-config.
   * Если передан -- бекенд проверяет, что структура не изменилась с момента генерации.
   * Если не передан -- проверка пропускается (backward-compatible).
   */
  expected_structure_hash?: string;
}
```

| Поле | Тип | Обязательное | Валидация |
|------|-----|:------------:|-----------|
| `space_id` | integer | Да | Пространство должно существовать и принадлежать компании |
| `board_ids` | integer[] | Да | Минимум 1. Все доски должны принадлежать `space_id` |
| `name` | string | Да | Не пустое, макс. 255 символов |
| `metric_mode` | string | Нет | `'amount'` или `'count'`. По умолчанию: `'count'` |
| `stages` | array | Да | Минимум 1 этап. Все `column_id` должны принадлежать доскам из `board_ids` |
| `stages[].column_id` | integer | Да | Не должен совпадать с win/loss columns |
| `stages[].board_id` | integer | Да | Должен быть в `board_ids` |
| `stages[].stale_threshold_days` | integer | Нет | >= 1. По умолчанию: 14 |
| `win_column_ids` | integer[] | Да | Минимум 1. Все должны принадлежать доскам из `board_ids` |
| `loss_column_ids` | integer[] | Нет | Все должны принадлежать доскам из `board_ids` (может быть пустым -- см. Best Guess) |
| `deal_amount_field_id` | integer | Нет | Должен быть числовым полем (field_type = 'number') |
| `deal_amount_field_mapping` | object | Нет | Ключи = board_id из `board_ids`. Значения = field_id числовых полей |
| `deal_source_field_id` | integer | Нет | Должен быть текстовым или select полем |
| `stage_probabilities` | object | Нет | Ключи = column_id из stages. Значения: 0.0 - 1.0 |
| `hidden_column_ids` | integer[] | Нет | Подмножество column_id из stages |
| `auto_generated` | boolean | Нет | По умолчанию: false |
| `expected_structure_hash` | string | Нет | Хеш из auto-config. Если передан, проверяется совпадение с текущей структурой пространства |

**Пересечения и ограничения:**
- `stages[].column_id`, `win_column_ids`, `loss_column_ids` не должны пересекаться
- Один `column_id` не может быть одновременно этапом и win/loss
- Unique constraint: `(space_id, company_id)` -- одно пространство = одна конфигурация
- `metric_mode = 'amount'` допустим только если `deal_amount_field_id IS NOT NULL` или `deal_amount_field_mapping IS NOT NULL`

#### Response

**Status:** `201 Created` (новый конфиг создан) или `200 OK` (конфиг уже существовал, возвращён без изменений)

```typescript
interface CreateFunnelConfigResponse {
  /**
   * true, если конфиг для (space_id, company_id) уже существовал.
   * В этом случае HTTP-код = 200, и возвращается существующий конфиг без изменений.
   * false, если конфиг только что создан (HTTP-код = 201).
   */
  already_existed: boolean;
  id: number;
  // ... все поля FunnelConfigItem
}
```

**Поведение при конкурентном создании:**

| Сценарий | HTTP Status | `already_existed` | Описание |
|----------|:-----------:|:-----------------:|----------|
| Конфиг создан | `201` | `false` | Первый запрос — конфиг вставлен в БД |
| Конфиг уже есть | `200` | `true` | Параллельный/повторный запрос — возвращён существующий конфиг |
| Структура изменилась | `409` | — | `expected_structure_hash` не совпадает с текущим (см. ниже) |

**Ответ при `409 STRUCTURE_CHANGED`:**

Если передан `expected_structure_hash` и он не совпадает с текущим хешем структуры пространства, бекенд возвращает `409` с новым auto-config:

```typescript
interface StructureChangedErrorResponse {
  error: {
    code: 'STRUCTURE_CHANGED';
    message: string;
    details: {
      /** Хеш, который клиент передал */
      expected_hash: string;
      /** Текущий хеш структуры */
      current_hash: string;
    };
  };
  /** Свежий auto-config с актуальной структурой */
  auto_config: AutoConfigResponse;
}
```

Клиент получает актуальный auto-config и может предложить пользователю проверить конфигурацию перед повторным сохранением.

#### Коды ошибок

| HTTP Status | Код ошибки | Описание |
|:-----------:|------------|----------|
| `400` | `INVALID_SPACE` | Пространство не найдено или не принадлежит компании |
| `400` | `INVALID_BOARD` | Доска не найдена или не принадлежит пространству |
| `400` | `EMPTY_STAGES` | Не указан ни один этап |
| `400` | `INVALID_COLUMN` | column_id не принадлежит доскам из board_ids |
| `400` | `COLUMN_CONFLICT` | column_id одновременно в stages и win/loss |
| `400` | `INVALID_PROBABILITY` | Вероятность вне диапазона 0-1 |
| `400` | `INVALID_FIELD_TYPE` | Кастомное поле имеет несовместимый тип |
| `400` | `INVALID_METRIC_MODE` | `metric_mode = 'amount'`, но поле суммы не задано |
| `400` | `NAME_TOO_LONG` | Название > 255 символов |
| `400` | `INVALID_FIELD_MAPPING` | Ключ в `deal_amount_field_mapping` не входит в `board_ids` |
| `403` | `ACCESS_DENIED` | Нет доступа |
| `409` | `STRUCTURE_CHANGED` | Структура пространства изменилась после генерации auto-config (хеш не совпадает). В теле -- свежий auto-config |

---

### 2.6. PUT /api/v1/reports/funnel/config/:configId

Обновление конфигурации воронки.

#### Request

**Method:** `PUT`

**Path Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `configId` | integer | ID конфигурации |

**Body:** Все поля опциональны (partial update).

```typescript
interface UpdateFunnelConfigRequest {
  name?: string;

  /** Обновление досок (расширение/сужение scope) */
  board_ids?: number[];

  /** Режим метрики */
  metric_mode?: MetricMode;

  stages?: {
    column_id: number;
    board_id: number;
    label?: string;
    stale_threshold_days?: number;
  }[];
  win_column_ids?: number[];
  loss_column_ids?: number[];

  deal_amount_field_id?: number | null;   // null для очистки
  deal_amount_field_mapping?: Record<string, number> | null;  // null для очистки
  deal_source_field_id?: number | null;
  stage_probabilities?: Record<number, number> | null;
  hidden_column_ids?: number[] | null;

  /** При обновлении из auto-config в пользовательский конфиг */
  auto_generated?: boolean;
}
```

**Примечание:** `space_id` не обновляется. Для смены пространства удалите конфиг и создайте новый.

#### Response

**Status:** `200 OK`

Тело аналогично `CreateFunnelConfigResponse`.

**Важно:** При изменении `stages`, `win_column_ids`, `loss_column_ids` или `board_ids` необходимо инвалидировать предрассчитанные данные (`funnel_deal_history`, `funnel_stage_snapshot`).

#### Коды ошибок

| HTTP Status | Код ошибки | Описание |
|:-----------:|------------|----------|
| `400` | Все ошибки из POST | Аналогичная валидация |
| `400` | `INVALID_FIELD_MAPPING` | Ключ в `deal_amount_field_mapping` не входит в `board_ids` |
| `400` | `INVALID_METRIC_MODE` | `metric_mode = 'amount'`, но поле суммы не задано |
| `403` | `ACCESS_DENIED` | Нет доступа |
| `404` | `FUNNEL_CONFIG_NOT_FOUND` | Конфигурация не найдена |

---

### 2.7. DELETE /api/v1/reports/funnel/config/:configId

Удаление конфигурации воронки.

#### Request

**Method:** `DELETE`

**Path Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `configId` | integer | ID конфигурации |

#### Response

**Status:** `204 No Content`

При удалении:
- Удаляются `funnel_deal_history` для этого `funnel_config_id`
- Удаляются `funnel_stage_snapshot` для этого `funnel_config_id`
- Удаляются `funnel_deal_summary` для этого `funnel_config_id`

#### Коды ошибок

| HTTP Status | Код ошибки | Описание |
|:-----------:|------------|----------|
| `403` | `ACCESS_DENIED` | Нет доступа |
| `404` | `FUNNEL_CONFIG_NOT_FOUND` | Конфигурация не найдена |

---

### 2.8. GET /api/v1/reports/funnel/config/available-columns

Вспомогательный endpoint: получение списка доступных колонок и числовых полей для настройки воронки. Работает на уровне пространства.

#### Request

**Method:** `GET`

**Query Parameters:**

| Параметр | Тип | Обязательный | Описание | Пример |
|----------|-----|:------------:|----------|--------|
| `space_id` | integer | Условно | ID пространства. Обязателен, если не задан `config_id` | `42` |
| `config_id` | integer | Условно | ID конфигурации (для определения space_id и текущих usage) | `1` |

#### Response

**Status:** `200 OK`

```typescript
interface AvailableColumnsResponse {
  space_id: number;
  space_name: string;

  /** Доски пространства с колонками */
  boards: AvailableBoardInfo[];

  /** Числовые кастомные поля (для выбора поля суммы) */
  custom_fields: AvailableCustomField[];
}

interface AvailableBoardInfo {
  board_id: number;
  board_name: string;
  board_position: number;  // Глобальный порядок доски
  columns: {
    id: number;
    title: string;
    sort_order: number;
    column_type: string | null;
    /** Используется ли уже в конфиге (stage/win/loss/hidden/unused) */
    usage: 'stage' | 'win' | 'loss' | 'hidden' | 'unused';
  }[];
}

interface AvailableCustomField {
  id: number;
  name: string;
  field_type: string;
  board_id: number;
  board_name: string;
}
```

---

### 2.9. GET /api/v1/reports/funnel/export

Экспорт отчёта в CSV/XLSX.

#### Request

**Method:** `GET`

**Query Parameters:** Все параметры из 2.1 (GET /api/v1/reports/funnel) плюс:

| Параметр | Тип | Обязательный | Описание | Пример |
|----------|-----|:------------:|----------|--------|
| `format` | string | Да | Формат экспорта: `csv`, `xlsx` | `xlsx` |
| `sections` | string | Нет | Какие секции экспортировать (comma-separated): `summary`, `stages`, `deals`. По умолчанию: `summary,stages` | `summary,stages,deals` |

#### Response

**Status:** `200 OK`

**Headers:**
```
Content-Type: text/csv; charset=utf-8 (или application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
Content-Disposition: attachment; filename="funnel-report-2024-06.csv"
```

Body: бинарные данные файла.

**Структура CSV/XLSX:**
- Лист 1 (Summary): KPI-метрики воронки
- Лист 2 (Stages): таблица метрик по этапам
- Лист 3 (Deals, если запрошен): полный список сделок с данными

---

## 3. Общие HTTP-заголовки

### Request

| Заголовок | Описание | Пример |
|-----------|----------|--------|
| `Authorization` | Bearer-токен аутентификации | `Bearer eyJhbGc...` |
| `Accept` | Формат ответа | `application/json` |
| `Accept-Language` | Язык (для локализации названий) | `ru` |

### Response

| Заголовок | Описание | Пример |
|-----------|----------|--------|
| `Content-Type` | Формат тела | `application/json; charset=utf-8` |
| `X-Request-Id` | ID запроса для отладки | `req_abc123` |
| `X-Response-Time` | Время обработки (ms) | `342` |

---

## 4. Rate limiting

| Endpoint | Лимит |
|----------|-------|
| `GET /reports/funnel` | 30 запросов / минута на пользователя |
| `GET /reports/funnel/auto-config` | 30 запросов / минута |
| `GET /reports/funnel/stages/*/deals` | 60 запросов / минута |
| `GET /reports/funnel/config/available-columns` | 30 запросов / минута |
| `GET /reports/funnel/export` | 5 запросов / минута |
| `POST/PUT/DELETE /reports/funnel/config` | 10 запросов / минута |

При превышении возвращается `429 Too Many Requests` с заголовком `Retry-After`.

---

## 5. Кеширование

| Endpoint | Стратегия |
|----------|-----------|
| `GET /reports/funnel` | Кеш 5 минут (key: hash(all params)). Инвалидация при card_movement на досках пространства |
| `GET /reports/funnel/auto-config` | Кеш 5 минут (key: space_id). Инвалидация при: добавлении/удалении доски, изменении колонок, изменении кастомных полей |
| `GET /reports/funnel/stages/*/deals` | Кеш 2 минуты. Инвалидация при card_movement |
| `GET /reports/funnel/config` | Кеш 30 минут. Инвалидация при изменении конфигурации |
| `GET /reports/funnel/config/available-columns` | Кеш 5 минут. Инвалидация при изменении структуры досок |
| `GET /reports/funnel/export` | Без кеша (генерация файла) |

---

## 6. Версионирование API

Версия указывается в URL: `/api/v1/...`. При внесении breaking changes создаётся `/api/v2/...` с параллельной поддержкой v1 в течение 6 месяцев.

Non-breaking changes (добавление полей в response, добавление опциональных query params) не требуют новой версии.
