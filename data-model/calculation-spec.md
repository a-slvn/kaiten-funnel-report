# Спецификация расчётов: Отчёт «Воронка продаж»

## История изменений

| Дата | Версия | Автор | Описание |
|------|--------|-------|----------|
| 2026-02-26 | 2.1 | business-analyst | **BUGFIX: LEAD() в stage_visits.** LEAD() для `exited_at`/`next_column_id` вычислялся ПОСЛЕ фильтрации по `to_type = 'stage'`, что приводило к систематическому завышению `duration_hours` при прохождении сделки через non-stage колонки. Исправлено: LEAD() теперь вычисляется в CTE `all_movements` (полный набор перемещений), затем фильтрация в CTE `stage_visits`. Обновлены шаги 3-4 алгоритма. Добавлен edge case 9.14 (сделка через non-stage колонку). |
| 2026-02-26 | 2.0 | business-analyst | **MAJOR UPDATE по фидбеку CPO.** Переход с single-board на multi-board (space-level): все SQL обновлены `board_id = :id` -> `board_id = ANY(:board_ids)`. Новая секция: SQL автоконфигурации Best Guess (раздел 11). Новая секция: расчёты в режиме `count` (раздел 12). Обновлено построение `funnel_deal_history`: добавлен `board_id`, маппинг суммы через `deal_amount_field_mapping`, глобальная линеаризация `stage_sort_order`. Обновлена фильтрация карточек для multi-board. Добавлены edge cases: сделка на доске вне конфигурации, разные поля суммы, пространство без done-колонок. Источники: `cpo-feedback-changelog.md`, `best-guess-algorithm.md`, `multi-board-unification.md`. |
| 2026-02 | 1.0 | business-analyst | Первоначальная версия. Single-board модель. |

---

## Общее описание

Данный документ содержит подробные алгоритмы расчёта каждой метрики отчёта «Воронка продаж». Для ключевых расчётов приведён SQL-псевдокод. Описаны все edge-кейсы и правила их обработки.

**Ключевое изменение v2.0:** Воронка строится на уровне **пространства** (`space_id`), а не отдельной доски. Одно пространство может содержать несколько досок, колонки которых объединяются в единую последовательность этапов. Все SQL-запросы используют `board_id = ANY(:board_ids)` вместо `board_id = :board_id`. Поддерживаются два режима метрики: `amount` (по сумме сделки) и `count` (по количеству карточек).

---

## 1. Входные параметры

Все расчёты принимают единый набор входных параметров:

| Параметр | Тип | Обязательный | Описание | Пример |
|----------|-----|:------------:|----------|--------|
| `funnel_config_id` | integer | Да | ID конфигурации воронки | `1` |
| `date_from` | date | Да | Начало периода (включительно) | `2024-06-01` |
| `date_to` | date | Да | Конец периода (включительно) | `2024-06-30` |
| `metric_mode` | string | Нет | Режим метрики: `amount` или `count`. Если не указан -- берётся из `funnel_config.metric_mode` | `count` |
| `responsible_ids` | integer[] | Нет | Фильтр по ответственным | `[301, 302]` |
| `source_values` | string[] | Нет | Фильтр по источнику сделки | `["cold_call", "website"]` |
| `tag_names` | string[] | Нет | Фильтр по тегам | `["enterprise"]` |
| `amount_min` | decimal | Нет | Минимальная сумма сделки (только при `metric_mode = 'amount'`) | `100000` |
| `amount_max` | decimal | Нет | Максимальная сумма сделки (только при `metric_mode = 'amount'`) | `1000000` |
| `include_archived` | boolean | Нет | Включать архивные карточки | `false` (по умолчанию) |

**Из `funnel_config` извлекаются:**
- `space_id` -- пространство
- `board_ids` -- массив ID досок, входящих в воронку
- `stage_columns` -- упорядоченный массив этапов `[{column_id, board_id, label, sort_order, stale_threshold_days}]`
- `win_column_ids` -- колонки победы
- `loss_column_ids` -- колонки проигрыша
- `metric_mode` -- режим метрики (`'amount'` или `'count'`)
- `deal_amount_field_id` -- ID общего кастомного поля с суммой сделки (null если не задано)
- `deal_amount_field_mapping` -- маппинг `board_id -> field_id` для случаев разных полей суммы на разных досках (null если не задано)
- `deal_source_field_id` -- ID кастомного поля с источником
- `stage_probabilities` -- вероятности победы по этапам
- `hidden_column_ids` -- массив ID скрытых колонок (Nice to Have)
- `auto_generated` -- флаг автогенерации конфигурации

**Приоритет определения поля суммы:** `deal_amount_field_mapping[card.board_id]` > `deal_amount_field_id` > `null` (режим `count`).

**Эффективный `metric_mode`:** Если входной параметр `metric_mode` задан -- используется он. Иначе -- значение из `funnel_config.metric_mode`. Если `metric_mode = 'amount'`, но ни `deal_amount_field_id`, ни `deal_amount_field_mapping` не заданы -- автоматический fallback на `count`.

---

## 2. Предварительный шаг: построение funnel_deal_history

Прежде чем считать любую метрику, необходимо построить историю прохождения сделок через воронку. Это ключевой шаг, от которого зависят все последующие расчёты.

### 2.1. Алгоритм построения

**Вход:** `card_movements` для карточек **всех досок** из `board_ids`, `funnel_config` с определением этапов.

**Шаг 1.** Получить все перемещения карточек **всех досок пространства** (`board_ids`), отсортированные по `(card_id, moved_at, id)`.

**Шаг 2.** Для каждого перемещения определить, является ли `to_column_id` одним из этапов воронки (`stage_columns`), win-колонкой или loss-колонкой.

**Шаг 3.** Для КАЖДОГО перемещения (включая non-stage) вычислить `exited_at` и `next_column_id` через LEAD() по полному набору перемещений карточки. Это гарантирует, что `exited_at` = момент СЛЕДУЮЩЕГО любого перемещения карточки, а не только следующего stage-перемещения.

**Шаг 4.** Отфильтровать только перемещения, где `to_column_id` является этапом воронки. Каждое такое перемещение = запись «входа» на этап с уже вычисленными `exited_at` и `next_column_id`.

**Шаг 5.** Определить `visit_number` для повторных входов.

**Шаг 6.** Определить `deal_amount` с учётом маппинга полей суммы по доскам.

**SQL-псевдокод:**

```sql
-- Шаг 1: Загрузка конфигурации
WITH config AS (
  SELECT
    fc.space_id,
    fc.board_ids,
    fc.stage_columns,
    fc.win_column_ids,
    fc.loss_column_ids,
    fc.metric_mode,
    fc.deal_amount_field_id,
    fc.deal_amount_field_mapping
  FROM funnel_config fc
  WHERE fc.id = :funnel_config_id
),

-- Массив ID колонок этапов (с board_id и глобальным sort_order)
stage_column_ids AS (
  SELECT
    (elem->>'column_id')::int AS column_id,
    (elem->>'board_id')::int AS board_id,
    (elem->>'sort_order')::int AS sort_order
  FROM config, jsonb_array_elements(config.stage_columns) AS elem
),

-- Все перемещения карточек ВСЕХ досок пространства
movements AS (
  SELECT
    cm.card_id,
    cm.from_column_id,
    cm.to_column_id,
    cm.moved_at,
    cm.id AS movement_id,
    c.board_id AS card_board_id,
    -- Определяем тип назначения
    CASE
      WHEN cm.to_column_id IN (SELECT column_id FROM stage_column_ids) THEN 'stage'
      WHEN cm.to_column_id = ANY((SELECT win_column_ids FROM config)) THEN 'win'
      WHEN cm.to_column_id = ANY((SELECT loss_column_ids FROM config)) THEN 'loss'
      ELSE 'other'
    END AS to_type,
    -- sort_order этапа назначения (null если не этап)
    sc.sort_order AS to_sort_order
  FROM card_movements cm
  JOIN cards c ON cm.card_id = c.id
  LEFT JOIN stage_column_ids sc ON cm.to_column_id = sc.column_id
  WHERE c.board_id = ANY((SELECT board_ids FROM config))
  ORDER BY cm.card_id, cm.moved_at, cm.id
),

-- Шаг 2-3: LEAD() вычисляется по ПОЛНОМУ набору перемещений (до фильтрации по stage).
-- Почему: если LEAD() вычислять после фильтрации (только stage-перемещения),
-- то при уходе карточки в non-stage колонку (например "На паузе") и последующем
-- возврате на stage-этап, exited_at будет указывать на момент возврата, а НЕ на
-- момент ухода из этапа. Это систематически завышает duration_hours, включая
-- время пребывания в non-stage колонках.
all_movements AS (
  SELECT
    m.card_id,
    m.card_board_id,
    m.to_column_id,
    m.to_type,
    m.to_sort_order,
    m.moved_at,
    m.movement_id,
    -- exited_at = время СЛЕДУЮЩЕГО перемещения карточки (из ЛЮБОЙ колонки)
    LEAD(m.moved_at) OVER (
      PARTITION BY m.card_id
      ORDER BY m.moved_at, m.movement_id
    ) AS next_moved_at,
    -- next_column = куда ушла карточка следующим перемещением (из ЛЮБОЙ колонки)
    LEAD(m.to_column_id) OVER (
      PARTITION BY m.card_id
      ORDER BY m.moved_at, m.movement_id
    ) AS next_column_id
  FROM movements m
),

-- Шаг 4: Фильтрация только stage-перемещений ПОСЛЕ вычисления LEAD()
stage_visits AS (
  SELECT
    am.card_id,
    am.card_board_id,
    am.to_column_id AS stage_column_id,
    am.to_sort_order AS stage_sort_order,
    am.moved_at AS entered_at,
    am.next_moved_at AS exited_at,
    am.next_column_id
  FROM all_movements am
  WHERE am.to_type = 'stage'
)

-- Шаг 5-6: visit_number + deal_amount
SELECT
  :funnel_config_id AS funnel_config_id,
  sv.card_id,
  sv.card_board_id AS board_id,
  sv.stage_column_id,
  sv.stage_sort_order,
  sv.entered_at,
  sv.exited_at,
  sv.next_column_id,
  EXTRACT(EPOCH FROM sv.exited_at - sv.entered_at) / 3600.0 AS duration_hours,
  -- forward move: next sort_order > current sort_order, или next = win
  CASE
    WHEN sv.next_column_id = ANY((SELECT win_column_ids FROM config)) THEN true
    WHEN sv.next_column_id = ANY((SELECT loss_column_ids FROM config)) THEN false
    WHEN next_sc.sort_order > sv.stage_sort_order THEN true
    WHEN next_sc.sort_order < sv.stage_sort_order THEN false
    ELSE null
  END AS is_forward_move,
  -- Сумма сделки: приоритет маппинг по board_id > общее поле > null
  COALESCE(
    -- Маппинг по board_id карточки
    (SELECT cfv.value_number
     FROM custom_field_values cfv
     WHERE cfv.card_id = sv.card_id
       AND cfv.field_id = (
         (SELECT deal_amount_field_mapping FROM config)
         ->> sv.card_board_id::text
       )::int
    ),
    -- Общее поле
    (SELECT cfv.value_number
     FROM custom_field_values cfv
     WHERE cfv.card_id = sv.card_id
       AND cfv.field_id = (SELECT deal_amount_field_id FROM config)
    )
  ) AS deal_amount,
  c.responsible_id,
  ROW_NUMBER() OVER (
    PARTITION BY sv.card_id, sv.stage_column_id
    ORDER BY sv.entered_at
  ) AS visit_number
FROM stage_visits sv
JOIN cards c ON sv.card_id = c.id
LEFT JOIN stage_column_ids next_sc
  ON sv.next_column_id = next_sc.column_id;
```

**Важные отличия от v1.0:**
- `board_id` добавлен в результат -- берётся из `cards.board_id`, показывает исходную доску карточки
- `stage_sort_order` -- глобальный порядок, сквозной по всем доскам (из `stage_columns[].sort_order`)
- `deal_amount` определяется через двухуровневый COALESCE: сначала маппинг по `board_id`, затем общее поле
- Фильтрация карточек: `c.board_id = ANY(board_ids)` вместо `c.board_id = :board_id`
- Сортировка перемещений: `(card_id, moved_at, id)` -- `id` как tiebreaker для одновременных перемещений

### 2.2. Обработка особых случаев при построении истории

**Создание карточки сразу в колонке (from_column_id = NULL):**
- Если `to_column_id` -- этап воронки, это считается входом на этап
- `entered_at` = `moved_at` записи с `from_column_id IS NULL`

**Перескок этапов (из этапа 1 сразу в этап 3):**
- В `funnel_deal_history` создаётся запись ТОЛЬКО для этапа 3 (куда реально попала сделка)
- Этап 2 НЕ получает записи -- сделка туда не входила
- Для расчёта конверсии этапа 1: сделка считается «прошедшей дальше» (числитель конверсии)
- Для расчёта конверсии этапа 2: сделка НЕ учитывается (не входила)

**Возврат на предыдущий этап (из этапа 3 обратно в этап 2):**
- Создаётся новая запись для этапа 2 с `visit_number = 2`
- Для расчёта метрик этапа 2 (количество, сумма) сделка считается ОДИН раз (DISTINCT card_id), несмотря на два визита
- Для расчёта времени на этапе -- каждый визит считается отдельно (оба включаются в среднее/медиану)

**Перемещение в колонку вне воронки (не этап, не win, не loss):**
- Текущее пребывание на этапе закрывается (`exited_at` заполняется)
- `next_column_id` = ID внешней колонки
- `is_forward_move` = NULL (неопределено)
- Сделка считается «покинувшей воронку», но не потерянной (не loss)

---

## 3. Применение фильтров

Фильтры применяются к множеству карточек ДО расчёта метрик.

### SQL-псевдокод фильтрации

```sql
-- Множество карточек, удовлетворяющих фильтрам
-- Карточки берутся со ВСЕХ досок пространства (board_ids)
WITH filtered_cards AS (
  SELECT c.id AS card_id
  FROM cards c
  WHERE c.board_id = ANY(:board_ids)
    -- Фильтр по архивности
    AND (c.archived = false OR :include_archived = true)
    -- Фильтр по ответственному
    AND (:responsible_ids IS NULL OR c.responsible_id = ANY(:responsible_ids))
    -- Фильтр по сумме сделки (только при metric_mode = 'amount')
    -- Учитываем маппинг полей: приоритет mapping[board_id] > deal_amount_field_id
    AND (
      :amount_min IS NULL
      OR :effective_metric_mode = 'count'
      OR EXISTS (
        SELECT 1 FROM custom_field_values cfv
        WHERE cfv.card_id = c.id
          AND cfv.field_id = COALESCE(
            (:deal_amount_field_mapping ->> c.board_id::text)::int,
            :deal_amount_field_id
          )
          AND cfv.value_number >= :amount_min
      )
    )
    AND (
      :amount_max IS NULL
      OR :effective_metric_mode = 'count'
      OR EXISTS (
        SELECT 1 FROM custom_field_values cfv
        WHERE cfv.card_id = c.id
          AND cfv.field_id = COALESCE(
            (:deal_amount_field_mapping ->> c.board_id::text)::int,
            :deal_amount_field_id
          )
          AND cfv.value_number <= :amount_max
      )
    )
    -- Фильтр по источнику
    AND (
      :source_values IS NULL
      OR EXISTS (
        SELECT 1 FROM custom_field_values cfv
        WHERE cfv.card_id = c.id
          AND cfv.field_id = :deal_source_field_id
          AND (cfv.value_text = ANY(:source_values) OR cfv.value_select = ANY(:source_values))
      )
    )
    -- Фильтр по тегам
    AND (
      :tag_names IS NULL
      OR EXISTS (
        SELECT 1 FROM tags t
        WHERE t.card_id = c.id
          AND t.name = ANY(:tag_names)
      )
    )
)
```

**Отличия от v1.0:**
- `c.board_id = ANY(:board_ids)` вместо `c.board_id = :board_id` -- карточки со всех досок пространства
- Фильтр по сумме учитывает `deal_amount_field_mapping`: для каждой карточки берётся поле суммы, соответствующее её доске
- Фильтр по сумме игнорируется в режиме `count` (`effective_metric_mode = 'count'`)

Все последующие запросы используют `filtered_cards` как базовое множество карточек.

---

## 4. Определение когорты периода

Все поточные метрики (разделы 4–5) рассчитываются по **когорте** — набору сделок, чей первый вход на любой этап воронки попадает в `[date_from, date_to]`.

```sql
-- Когорта периода: сделки, впервые вошедшие в воронку в пределах периода
WITH cohort AS (
  SELECT fdh.card_id, MIN(fdh.entered_at) AS first_entered_at
  FROM funnel_deal_history fdh
  JOIN filtered_cards fc ON fdh.card_id = fc.card_id
  WHERE fdh.funnel_config_id = :funnel_config_id
  GROUP BY fdh.card_id
  HAVING MIN(fdh.entered_at) >= :date_from
     AND MIN(fdh.entered_at) < :date_to + INTERVAL '1 day'
)
```

**Важно:** `date_to` включительно, поэтому добавляем `+ INTERVAL '1 day'` для корректного сравнения с timestamptz.

Все последующие запросы используют `cohort` как базовое множество сделок.

---

## 5. Расчёт метрик этапа

### 5.1. Количество сделок, вошедших на этап

**Алгоритм:**
1. Из когорты выбрать сделки, которые побывали на этапе `stage_column_id`
2. Посчитать `COUNT(DISTINCT card_id)`

```sql
SELECT COUNT(DISTINCT fdh.card_id) AS deals_entered
FROM funnel_deal_history fdh
JOIN cohort c ON fdh.card_id = c.card_id
WHERE fdh.funnel_config_id = :funnel_config_id
  AND fdh.stage_column_id = :stage_column_id;
```

---

### 5.2. Сумма сделок на этапе

```sql
SELECT
  SUM(fdh.deal_amount) AS total_amount,
  COUNT(DISTINCT fdh.card_id) FILTER (WHERE fdh.deal_amount IS NOT NULL) AS deals_with_amount,
  COUNT(DISTINCT fdh.card_id) FILTER (WHERE fdh.deal_amount IS NULL) AS deals_without_amount
FROM funnel_deal_history fdh
JOIN cohort c ON fdh.card_id = c.card_id
WHERE fdh.funnel_config_id = :funnel_config_id
  AND fdh.stage_column_id = :stage_column_id
  -- Для DISTINCT: берём первый визит
  AND fdh.visit_number = 1;
```

**Правило DISTINCT по сумме:** Если сделка входила на этап дважды (`visit_number = 1` и `2`), её сумма учитывается один раз. Берём `deal_amount` из первого визита (`visit_number = 1`).

---

### 5.3. Средний чек на этапе

```sql
SELECT
  CASE
    WHEN COUNT(DISTINCT fdh.card_id) FILTER (WHERE fdh.deal_amount IS NOT NULL) = 0
    THEN NULL
    ELSE SUM(fdh.deal_amount) / COUNT(DISTINCT fdh.card_id) FILTER (WHERE fdh.deal_amount IS NOT NULL)
  END AS avg_amount
FROM funnel_deal_history fdh
JOIN cohort c ON fdh.card_id = c.card_id
WHERE fdh.funnel_config_id = :funnel_config_id
  AND fdh.stage_column_id = :stage_column_id
  AND fdh.visit_number = 1;
```

**Edge case:** Если все сделки без суммы -- результат `NULL`, отображается как `--`.

---

### 5.4. Конверсия этап -> этап

**Определение:** Из когортных сделок, побывавших на этапе N, сколько перешли на следующий этап (или любой более поздний).

**Алгоритм:**
1. Числитель: когортные сделки, побывавшие на этапе N, которые также побывали на этапе с `sort_order > N` или перешли в win
2. Знаменатель: все когортные сделки, побывавшие на этапе N

```sql
WITH entered AS (
  -- Когортные сделки, побывавшие на этапе N
  SELECT DISTINCT fdh.card_id
  FROM funnel_deal_history fdh
  JOIN cohort c ON fdh.card_id = c.card_id
  WHERE fdh.funnel_config_id = :funnel_config_id
    AND fdh.stage_column_id = :stage_column_id  -- этап N
),
moved_forward AS (
  -- Из них: кто перешёл на следующий этап (или дальше, или в win)
  SELECT DISTINCT e.card_id
  FROM entered e
  JOIN funnel_deal_history fdh ON fdh.card_id = e.card_id
    AND fdh.funnel_config_id = :funnel_config_id
    AND fdh.stage_sort_order > :stage_sort_order  -- любой этап дальше

  UNION

  -- Или перешёл в win напрямую с этого этапа
  SELECT DISTINCT e.card_id
  FROM entered e
  JOIN card_movements cm ON cm.card_id = e.card_id
  WHERE cm.to_column_id = ANY(:win_column_ids)
    AND cm.from_column_id = :stage_column_id
)
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM entered) = 0 THEN NULL
    ELSE (SELECT COUNT(*) FROM moved_forward)::decimal / (SELECT COUNT(*) FROM entered)
  END AS conversion_rate;
```

**Важные правила:**
- Перескок: сделка из этапа 1 в этап 3 -- засчитывается как конверсия этапа 1 (сделка ушла вперёд)
- Возврат: сделка с этапа 3 вернулась на 2, потом пошла на 3 -- конверсия этапа 2 учитывает это прохождение
- Сделки, ещё находящиеся на этапе N -- НЕ в числителе (они ещё не конвертировались)

---

### 5.5. Конверсия этап -> победа (Win rate от этапа)

**Алгоритм:**
1. Числитель: когортные сделки, побывавшие на этапе S, которые перешли в win
2. Знаменатель: все когортные сделки, побывавшие на этапе S

```sql
WITH entered AS (
  SELECT DISTINCT fdh.card_id
  FROM funnel_deal_history fdh
  JOIN cohort c ON fdh.card_id = c.card_id
  WHERE fdh.funnel_config_id = :funnel_config_id
    AND fdh.stage_column_id = :stage_column_id
),
won AS (
  SELECT DISTINCT e.card_id
  FROM entered e
  JOIN card_movements cm ON cm.card_id = e.card_id
  WHERE cm.to_column_id = ANY(:win_column_ids)
)
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM entered) = 0 THEN NULL
    ELSE (SELECT COUNT(*) FROM won)::decimal / (SELECT COUNT(*) FROM entered)
  END AS win_rate;
```

**Примечание:** победа учитывается независимо от даты. Для «молодых» когорт win rate будет ниже реальной — часть сделок ещё в процессе. По мере завершения сделок win rate когорты приближается к финальному значению.

---

### 5.6. Среднее время на этапе

**Алгоритм:**
1. Из `funnel_deal_history` выбрать когортные сделки, побывавшие на этапе и покинувшие его (`exited_at IS NOT NULL`)
2. Рассчитать `AVG(duration_hours)`
3. Перевести в дни: `AVG / 24`

```sql
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE AVG(fdh.duration_hours) / 24.0
  END AS avg_duration_days
FROM funnel_deal_history fdh
JOIN cohort c ON fdh.card_id = c.card_id
WHERE fdh.funnel_config_id = :funnel_config_id
  AND fdh.stage_column_id = :stage_column_id
  AND fdh.exited_at IS NOT NULL;
```

**Правила:**
- Считаются ВСЕ визиты (включая повторные, `visit_number > 1`), каждый как отдельное наблюдение
- Время -- календарное (включая выходные и праздники)
- Сделки, ещё находящиеся на этапе (`exited_at IS NULL`) -- не включаются в среднее

---

### 5.7. Медианное время на этапе

```sql
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fdh.duration_hours / 24.0)
  END AS median_duration_days
FROM funnel_deal_history fdh
JOIN cohort c ON fdh.card_id = c.card_id
WHERE fdh.funnel_config_id = :funnel_config_id
  AND fdh.stage_column_id = :stage_column_id
  AND fdh.exited_at IS NOT NULL;
```

---

### 5.8. Количество зависших сделок (snapshot)

**Алгоритм:**
1. Найти сделки, которые находятся на этапе на момент `date_to` (`exited_at IS NULL` или `exited_at > date_to`)
2. Рассчитать время пребывания: `date_to - entered_at`
3. Сравнить с порогом `stale_threshold_days` (из `funnel_config.stage_columns`)
4. Посчитать количество превышающих порог

```sql
WITH stale_threshold AS (
  SELECT (elem->>'stale_threshold_days')::int AS threshold_days,
         (elem->>'column_id')::int AS column_id
  FROM funnel_config fc, jsonb_array_elements(fc.stage_columns) AS elem
  WHERE fc.id = :funnel_config_id
    AND (elem->>'column_id')::int = :stage_column_id
)
SELECT COUNT(DISTINCT fdh.card_id) AS stale_count
FROM funnel_deal_history fdh
JOIN filtered_cards fc ON fdh.card_id = fc.card_id
CROSS JOIN stale_threshold st
WHERE fdh.funnel_config_id = :funnel_config_id
  AND fdh.stage_column_id = :stage_column_id
  -- Ещё на этапе на date_to
  AND fdh.entered_at <= :date_to
  AND (fdh.exited_at IS NULL OR fdh.exited_at > :date_to)
  -- Превышает порог
  AND EXTRACT(EPOCH FROM (:date_to - fdh.entered_at)) / 86400.0 > st.threshold_days;
```

**Если `stale_threshold_days` не задан:**
1. Рассчитать медианное время на этапе за последние 90 дней
2. Порог = `2 * median`
3. Если медиана не определена (нет данных) -- порог = 14 дней

---

## 6. Расчёт метрик всей воронки

### 6.1. Общая конверсия воронки

**Алгоритм:**
1. Знаменатель: размер когорты (все сделки, впервые вошедшие в воронку за период)
2. Числитель: когортные сделки, которые перешли в win

```sql
WITH won_deals AS (
  SELECT DISTINCT c.card_id
  FROM cohort c
  JOIN card_movements cm ON cm.card_id = c.card_id
  WHERE cm.to_column_id = ANY(:win_column_ids)
)
SELECT
  (SELECT COUNT(*) FROM cohort) AS cohort_size,
  (SELECT COUNT(*) FROM won_deals) AS total_won,
  CASE
    WHEN (SELECT COUNT(*) FROM cohort) = 0 THEN NULL
    ELSE (SELECT COUNT(*) FROM won_deals)::decimal / (SELECT COUNT(*) FROM cohort)
  END AS overall_conversion;
```

> Конверсия не может превысить 100%: числитель — подмножество знаменателя. Для «молодых» когорт (период = текущий месяц) конверсия будет ниже финальной — часть сделок ещё в процессе.

---

### 6.2. Средний цикл сделки

**Алгоритм:**
1. Из когорты выбрать выигранные сделки
2. Для каждой: `first_entered_at` (дата-якорь из когорты) и `win_date` (дата перехода в win)
3. Рассчитать `AVG(win_date - first_entered_at)` в днях

```sql
WITH won_deals AS (
  SELECT
    c.card_id,
    c.first_entered_at,
    fds.outcome_at AS win_date,
    EXTRACT(EPOCH FROM fds.outcome_at - c.first_entered_at) / 86400.0 AS cycle_days
  FROM cohort c
  JOIN funnel_deal_summary fds ON fds.card_id = c.card_id
  WHERE fds.funnel_config_id = :funnel_config_id
    AND fds.outcome = 'won'
)
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE AVG(cycle_days)
  END AS avg_cycle_days,
  COUNT(*) AS won_count
FROM won_deals;
```

---

### 6.3. Объём воронки (Pipeline value) — snapshot

**Алгоритм:**
1. Найти все карточки, которые на момент `date_to` находятся на одном из этапов воронки (snapshot)
2. Суммировать их `deal_amount`

```sql
-- Snapshot на date_to: какие сделки на каких этапах
WITH current_positions AS (
  SELECT
    fdh.card_id,
    fdh.stage_column_id,
    fdh.deal_amount
  FROM funnel_deal_history fdh
  JOIN filtered_cards fc ON fdh.card_id = fc.card_id
  WHERE fdh.funnel_config_id = :funnel_config_id
    AND fdh.entered_at <= :date_to
    AND (fdh.exited_at IS NULL OR fdh.exited_at > :date_to)
)
SELECT
  COUNT(DISTINCT cp.card_id) AS active_deals,
  SUM(cp.deal_amount) AS pipeline_value,
  COUNT(DISTINCT cp.card_id) FILTER (WHERE cp.deal_amount IS NULL) AS deals_without_amount
FROM current_positions cp;
```

---

### 6.4. Взвешенный объём воронки — snapshot

**Алгоритм:**
1. Получить snapshot активных сделок (как в 5.3)
2. Для каждой сделки определить её этап и вероятность победы на этом этапе
3. Рассчитать `SUM(deal_amount * probability)`

```sql
WITH current_positions AS (
  -- (аналогично 5.3)
  SELECT
    fdh.card_id,
    fdh.stage_column_id,
    fdh.deal_amount
  FROM funnel_deal_history fdh
  JOIN filtered_cards fc ON fdh.card_id = fc.card_id
  WHERE fdh.funnel_config_id = :funnel_config_id
    AND fdh.entered_at <= :date_to
    AND (fdh.exited_at IS NULL OR fdh.exited_at > :date_to)
),
stage_probs AS (
  -- Вероятности из конфига или линейная интерполяция
  SELECT
    (elem->>'column_id')::int AS column_id,
    COALESCE(
      (fc.stage_probabilities->>((elem->>'column_id')))::decimal,
      (elem->>'sort_order')::decimal / jsonb_array_length(fc.stage_columns)
    ) AS probability
  FROM funnel_config fc, jsonb_array_elements(fc.stage_columns) AS elem
  WHERE fc.id = :funnel_config_id
)
SELECT
  SUM(cp.deal_amount * sp.probability) AS weighted_pipeline_value
FROM current_positions cp
JOIN stage_probs sp ON cp.stage_column_id = sp.column_id
WHERE cp.deal_amount IS NOT NULL;
```

---

### 6.5. Скорость воронки (Pipeline velocity)

**Алгоритм:**
1. Рассчитать компоненты:
   - `deals_count` -- размер когорты (из 6.1)
   - `win_rate` -- общая конверсия когорты (из 6.1)
   - `avg_deal_size` -- средний чек выигранных сделок когорты
   - `avg_sales_cycle` -- средний цикл когорты (из 6.2)
2. `velocity = deals_count * win_rate * avg_deal_size / avg_sales_cycle`

```sql
-- Предполагаем, что переменные уже рассчитаны ранее
SELECT
  CASE
    WHEN :avg_sales_cycle_days = 0 OR :avg_sales_cycle_days IS NULL
    THEN NULL
    ELSE (:deals_entered * :win_rate * :avg_won_deal_size) / :avg_sales_cycle_days
  END AS velocity_per_day;
```

**Пример расчёта:**
- 200 сделок вошло
- Win rate = 0.185
- Средний чек побед = 230 000 руб.
- Средний цикл = 42.7 дней
- Velocity = 200 * 0.185 * 230 000 / 42.7 = **199 297 руб./день**

---

### 6.6. Потерянные сделки

```sql
WITH lost_deals AS (
  SELECT
    c.card_id,
    -- Определяем последний этап перед потерей
    (
      SELECT fdh.stage_column_id
      FROM funnel_deal_history fdh
      WHERE fdh.card_id = c.card_id
        AND fdh.funnel_config_id = :funnel_config_id
      ORDER BY fdh.entered_at DESC
      LIMIT 1
    ) AS last_stage_column_id,
    fds.deal_amount
  FROM cohort c
  JOIN funnel_deal_summary fds ON fds.card_id = c.card_id
  WHERE fds.funnel_config_id = :funnel_config_id
    AND fds.outcome = 'lost'
)
SELECT
  COUNT(*) AS total_lost,
  SUM(deal_amount) AS lost_amount,
  -- Разбивка по этапам
  last_stage_column_id,
  COUNT(*) AS lost_from_stage
FROM lost_deals
GROUP BY last_stage_column_id;
```

---

### 6.7. Коэффициент потерь по этапу (Drop-off rate)

```sql
WITH stage_entered AS (
  SELECT DISTINCT fdh.card_id
  FROM funnel_deal_history fdh
  JOIN cohort c ON fdh.card_id = c.card_id
  WHERE fdh.funnel_config_id = :funnel_config_id
    AND fdh.stage_column_id = :stage_column_id
),
lost_from_stage AS (
  SELECT DISTINCT fds.card_id
  FROM funnel_deal_summary fds
  JOIN stage_entered se ON fds.card_id = se.card_id
  WHERE fds.funnel_config_id = :funnel_config_id
    AND fds.outcome = 'lost'
    -- Последний этап перед проигрышем = текущий этап
    AND fds.card_id IN (
      SELECT fdh.card_id
      FROM funnel_deal_history fdh
      WHERE fdh.funnel_config_id = :funnel_config_id
        AND fdh.stage_column_id = :stage_column_id
        AND fdh.exited_at IS NOT NULL
        AND fdh.next_column_id = ANY(:loss_column_ids)
    )
)
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM stage_entered) = 0 THEN NULL
    ELSE (SELECT COUNT(*) FROM lost_from_stage)::decimal / (SELECT COUNT(*) FROM stage_entered)
  END AS drop_off_rate;
```

---

## 7. Расчёт сравнительных метрик

### 7.1. Определение периодов сравнения

**Варианты:**
- **Предыдущий аналогичный период:** если выбран июнь -- сравниваем с маем (тот же duration)
- **Тот же период прошлого года:** июнь 2024 vs. июнь 2023
- **Произвольный период:** пользователь задаёт оба периода вручную

**Автоматический расчёт предыдущего периода:**

```
previous_date_from = date_from - (date_to - date_from + 1 day)
previous_date_to = date_from - 1 day
```

Пример: текущий период 01.06 - 30.06 (30 дней), предыдущий: 02.05 - 31.05 (30 дней).

### 7.2. Абсолютная и относительная дельта

**Псевдокод:**

```python
def calculate_deltas(metric_current, metric_previous):
    # Абсолютная дельта
    if metric_current is None or metric_previous is None:
        absolute_delta = None
        relative_delta = None
        trend = None
    else:
        absolute_delta = metric_current - metric_previous

        # Относительная дельта
        if metric_previous == 0:
            relative_delta = None  # деление на ноль
        else:
            relative_delta = absolute_delta / metric_previous * 100

        # Тренд
        TREND_THRESHOLD = 5  # процентов
        if relative_delta is None:
            trend = None
        elif abs(relative_delta) < TREND_THRESHOLD:
            trend = 'stable'
        elif relative_delta >= TREND_THRESHOLD:
            trend = 'up'
        else:
            trend = 'down'

    return absolute_delta, relative_delta, trend
```

### 7.3. Логика цвета для дельт

| Метрика | Рост = | Падение = |
|---------|--------|-----------|
| Кол-во сделок | Позитив (зелёный) | Негатив (красный) |
| Сумма сделок | Позитив | Негатив |
| Средний чек | Позитив | Негатив |
| Конверсия | Позитив | Негатив |
| Win rate | Позитив | Негатив |
| Среднее время на этапе | **Негатив** (красный) | **Позитив** (зелёный) |
| Медианное время | **Негатив** | **Позитив** |
| Зависшие сделки | **Негатив** | **Позитив** |
| Общая конверсия | Позитив | Негатив |
| Цикл сделки | **Негатив** | **Позитив** |
| Объём воронки | Позитив | Негатив |
| Скорость воронки | Позитив | Негатив |
| Потерянные сделки | **Негатив** | **Позитив** |
| Drop-off rate | **Негатив** | **Позитив** |

Метрики, отмеченные жирным -- «инвертированные»: их увеличение является негативным сигналом.

---

## 8. Полный алгоритм расчёта отчёта

Порядок выполнения при запросе отчёта:

```
0. [Если funnel_config_id не задан, но задан space_id]
   └── Запустить алгоритм Best Guess (раздел 11)
       ├── Собрать доски пространства
       ├── Построить последовательность этапов
       ├── Определить won/lost колонки
       ├── Определить поле суммы и metric_mode
       └── Вернуть автоконфигурацию (не сохраняя в БД)

1. Загрузить funnel_config по funnel_config_id
   ├── Извлечь: space_id, board_ids, stage_columns, win_column_ids, loss_column_ids
   ├── Извлечь: metric_mode, deal_amount_field_id, deal_amount_field_mapping
   ├── Извлечь: deal_source_field_id, stage_probabilities
   └── Определить effective_metric_mode (входной параметр > config > fallback)

2. Построить filtered_cards (применить фильтры, карточки со ВСЕХ досок)
   ├── board_ids = ANY(:board_ids)
   ├── responsible_ids
   ├── source_values
   ├── tag_names
   ├── amount_min / amount_max (только при metric_mode = 'amount')
   └── include_archived

3. Построить/обновить funnel_deal_history
   ├── Обработать card_movements ВСЕХ досок board_ids
   ├── Определить входы/выходы с этапов (глобальный sort_order)
   ├── Добавить board_id из cards.board_id
   ├── Рассчитать duration_hours
   ├── Определить visit_number
   └── Определить deal_amount (маппинг по board_id > общее поле > null)

4. Построить/обновить funnel_deal_summary
   ├── Определить outcome (in_progress / won / lost)
   ├── Добавить board_id из cards.board_id
   ├── Рассчитать total_duration_hours
   └── Подсчитать stages_visited, backward_moves

5. Определить когорту периода (раздел 4)
   └── MIN(entered_at) по каждой сделке ∈ [date_from, date_to]

6. Для каждого этапа рассчитать (по когорте):
   ├── deals_entered (5.1)                           -- оба режима
   ├── total_amount, avg_amount (5.2, 5.3)           -- только amount
   ├── conversion_to_next (5.4)                      -- оба режима
   ├── win_rate (5.5)                                -- оба режима
   ├── avg_duration, median_duration (5.6, 5.7)      -- оба режима
   ├── stale_count (5.8, snapshot)                   -- оба режима
   └── drop_off_rate (6.7)                           -- оба режима

7. Рассчитать метрики всей воронки:
   ├── overall_conversion (6.1)                      -- оба режима
   ├── avg_sales_cycle (6.2)                         -- оба режима
   ├── pipeline_value (6.3, snapshot)                -- только amount
   ├── weighted_pipeline_value (6.4, snapshot)       -- только amount
   ├── velocity (6.5)                                -- только amount
   └── lost_deals (6.6)                              -- оба режима

8. Если задан период сравнения:
   ├── Повторить шаги 2-7 для предыдущего периода (другая когорта)
   └── Рассчитать дельты и тренды (7.2, 7.3)

9. Сформировать response
   └── При metric_mode = 'count': денежные метрики = null
```

---

## 9. Полный каталог edge cases

### 9.1. Сделка создана до начала периода, перешла на этап в периоде

- **Поведение:** Принадлежность к когорте определяется по `MIN(entered_at)` — дате первого входа на любой этап воронки. Дата создания карточки не имеет значения.
- **Пример:** Сделка впервые вошла на «Квалификацию» 20 мая → когорта мая. В июньском отчёте эта сделка **не появится**, даже если она перешла на «Предложение» 3 июня. В майском отчёте — покажет все этапы, включая «Предложение».

### 9.2. Сделка перемещалась туда-сюда между этапами

- **Поведение:** В `funnel_deal_history` создаётся по записи на каждый визит.
- **Для COUNT (количество сделок):** DISTINCT card_id -- считается один раз.
- **Для SUM (сумма):** берётся из первого визита.
- **Для AVG/MEDIAN (время):** каждый визит -- отдельное наблюдение в выборке.
- **Для конверсии:** сделка учитывается в знаменателе один раз. В числителе -- если хотя бы один раз прошла дальше.
- **Пример:** Сделка: этап 1 -> этап 2 -> этап 1 -> этап 2 -> этап 3. На этапе 1: 1 сделка, 2 визита, время считается дважды. Конверсия этапа 1: 1/1 = 100%.

### 9.3. Сделка перескочила этапы

- **Поведение:** Запись создаётся ТОЛЬКО для этапа, на который сделка реально попала.
- **Для пропущенного этапа:** сделка НЕ учитывается ни в одной метрике этого этапа.
- **Для этапа-источника:** сделка учитывается как «прошла дальше» (числитель конверсии).
- **Пример:** Сделка: этап 1 -> этап 3 (пропустив этап 2). Этап 1: конверсия = 1 из 1 = 100%. Этап 2: 0 вошло, конверсия = `--`. Этап 3: 1 вошло.

### 9.4. Пустые этапы (нет сделок)

- **Поведение:** Этап отображается в воронке с нулевыми значениями.
- **Количество:** `0`
- **Сумма:** `--`
- **Средний чек:** `--`
- **Конверсия:** `--` (не 0% -- нет данных для расчёта)
- **Время:** `--`

### 9.5. Сделка без суммы

- **Поведение:** Учитывается в COUNT, но НЕ в SUM/AVG по сумме.
- **Для pipeline value:** не включается в SUM. Отображается примечание: `N сделок без суммы`.
- **Для weighted pipeline:** не включается.
- **Для velocity:** не влияет на avg_deal_size (считается только по сделкам с суммой).

### 9.6. Удалённые/архивные карточки

- **По умолчанию:** архивные карточки ИСКЛЮЧАЮТСЯ (`include_archived = false`).
- **При включении:** учитываются наравне с обычными.
- **Удалённые карточки:** если карточка удалена, но `card_movements` сохранены -- данные учитываются. Если `card_movements` удалены каскадно -- данных нет, карточка не учитывается.
- **Рекомендация:** при удалении карточки помечать её как архивную, а не удалять физически.

### 9.7. Одновременные перемещения (несколько движений в одну секунду)

- **Поведение:** Сортировка по `(card_id, moved_at, id)` -- `id` как tiebreaker.
- **На практике:** возникает при массовых операциях (batch move). Каждое перемещение обрабатывается отдельно в порядке `id`.

### 9.8. Перемещение в колонку, не входящую ни в stage_order, ни в win/loss

- **Поведение:** Текущее пребывание на этапе закрывается (`exited_at` заполняется). Сделка считается «покинувшей воронку» без определённого итога.
- **Для конверсии:** не в числителе (не прошла дальше). В знаменателе (вошла на этап).
- **Для outcome:** остаётся `in_progress` (технически находится вне воронки, но не проиграна).

### 9.9. Пустой период (нет перемещений)

- **Поведение:** Все метрики = `--` или `0`. Воронка отображается с нулями. Сообщение: «Нет данных за выбранный период».

### 9.10. Воронка с одним этапом

- **Поведение:** Допустимо. Отображается один этап.
- **Конверсия этап -> этап:** `--` (нет следующего этапа, только win/loss).
- **Конверсия в win:** рассчитывается нормально.

### 9.11. Сделка на доске, не входящей в конфигурацию воронки

- **Поведение:** Карточки на досках, не входящих в `board_ids` конфигурации, полностью игнорируются. Их `card_movements` не учитываются при построении `funnel_deal_history`.
- **Пример:** Пространство "CRM" содержит доски "Лиды" (id=101), "Сделки" (id=102), "Архив" (id=103). Конфигурация воронки включает `board_ids = [101, 102]`. Карточки на доске "Архив" (103) не попадут в отчёт.
- **Фильтрация:** `WHERE c.board_id = ANY(:board_ids)` в `filtered_cards` и при построении `movements`.
- **Переход между досками:** Если карточка перемещена с доски из `board_ids` на доску вне `board_ids` (например, в "Архив"), это считается выходом из воронки. Текущее пребывание на этапе закрывается, `is_forward_move = null`.

### 9.12. Разные поля суммы на разных досках

- **Поведение:** Если в `deal_amount_field_mapping` заданы разные `field_id` для разных досок, сумма каждой карточки берётся из поля, соответствующего её доске (`mapping[card.board_id]`).
- **Если маппинг не задан для конкретной доски:** fallback на `deal_amount_field_id` (общее поле). Если и оно не задано -- `deal_amount = null` для карточек этой доски.
- **Агрегация:** Суммы карточек с разных досок складываются. Предполагается, что если пользователь задал маппинг -- он подтвердил сопоставимость полей.
- **Пример:** Доска 1 -- поле "Оценка бюджета" (field_id=501), Доска 2 -- поле "Сумма контракта" (field_id=602). `deal_amount_field_mapping = {"101": 501, "102": 602}`. Карточка на доске 1 получит сумму из поля 501, карточка на доске 2 -- из поля 602.
- **В режиме `count`:** `deal_amount` может быть null. Денежные метрики не рассчитываются.

### 9.13. Пространство без досок с done-колонками

- **Поведение при Best Guess (auto-config):** Если ни одна доска не содержит колонок с `column_type = 'done'`, алгоритм Best Guess использует последнюю колонку последней доски как won-колонку (исключая её из этапов). `loss_column_ids = []`. Confidence: `low`. Алерт: `NO_DONE_COLUMNS`.
- **Влияние на расчёты:**
  - Без loss-колонок: `drop_off_rate` для всех этапов = `null` (нет определённого проигрыша)
  - `total_lost = 0` в summary
  - `outcome = 'lost'` никогда не устанавливается в `funnel_deal_summary`
  - Все сделки, не перешедшие в won, имеют `outcome = 'in_progress'`
- **Конверсия:** Общая конверсия рассчитывается только по переходам в won. Без loss-данных она показывает долю сделок, дошедших до конца.

### 9.14. Сделка проходит через non-stage колонку

- **Сценарий:** Сделка находится на этапе «Квалификация», перемещается в колонку «На паузе» (не является ни stage, ни win, ни loss), затем возвращается на этап «Предложение».
- **Поведение:**
  - Пребывание на «Квалификации» закрывается в момент ухода в «На паузе» (а НЕ в момент возврата на «Предложение»)
  - `exited_at` для «Квалификации» = `moved_at` перемещения в «На паузе»
  - `next_column_id` для «Квалификации» = ID колонки «На паузе»
  - `is_forward_move` = NULL (переход в non-stage колонку)
  - Время в «На паузе» НЕ включается в `duration_hours` ни одного этапа воронки
  - При возврате на «Предложение» создаётся новая запись в `funnel_deal_history`
- **Реализация:** LEAD() вычисляется по полному набору перемещений (CTE `all_movements`), включая non-stage, и только затем записи фильтруются по `to_type = 'stage'` (CTE `stage_visits`). Это гарантирует, что `exited_at` всегда = момент следующего перемещения карточки из любой колонки.
- **Пример:** Сделка: Квалификация (10:00) -> На паузе (14:00) -> Предложение (09:00 след. день). `duration_hours` для «Квалификации» = 4 часа (с 10:00 до 14:00), а НЕ 23 часа (с 10:00 до 09:00 след. дня).

### 9.15. Невалидный field_id в deal_amount_field_mapping

- **Описание:** Поле суммы сделки (`field_id`), указанное в `deal_amount_field_mapping` или в `deal_amount_field_id`, стало невалидным после сохранения конфигурации. Типичные причины: поле удалено администратором, тип поля изменён с `number` на другой (`text`, `select` и т.д.), поле перенесено на другую доску.
- **Симптом без валидации:** SQL-запрос для `deal_amount` через `LEFT JOIN custom_field_values` молча возвращает `NULL` для всех карточек с невалидным полем. Пользователь видит нулевые суммы без объяснения причины.
- **Поведение:** Валидация выполняется на уровне application layer при загрузке конфигурации (Шаг 1 в `backend-implementation-guide.md`), **до начала SQL-расчётов**. Для каждой записи `(board_id, field_id)` из маппинга проверяются три условия: (1) поле существует в `custom_fields`, (2) `field_type = 'number'`, (3) `custom_fields.board_id` совпадает с ключом маппинга.
- **Обработка:**
  - Невалидные записи исключаются из маппинга.
  - Для каждой исключённой записи возвращается алерт `INVALID_FIELD_MAPPING` (тип `warning`) с указанием `board_id`, `field_id` и причины (`field_not_found` / `wrong_field_type` / `wrong_board`).
  - Для досок с исключёнными записями -- fallback на `deal_amount_field_id` (если задан и валиден). Если `deal_amount_field_id` тоже невалиден -- `deal_amount = NULL` для карточек этой доски.
  - Если после исключения маппинг пуст И `deal_amount_field_id` невалиден (или не задан) -- автоматический fallback на `metric_mode = 'count'`. Алерт `FALLBACK_TO_COUNT`.
- **SQL:** Дополнительных SQL-запросов не требуется. Валидация выполняется одним запросом к `custom_fields` при загрузке конфига (application layer). В расчётные SQL (разделы 2-8) попадает уже очищенный маппинг.
- **Пример:** Конфигурация содержит `deal_amount_field_mapping = {"101": 501, "102": 602}`. Поле 501 было удалено. При загрузке конфига валидация обнаруживает, что поле 501 не существует. Запись `"101": 501` исключается из маппинга. Если задан `deal_amount_field_id = 700` и он валиден -- карточки доски 101 получат сумму из поля 700. Если `deal_amount_field_id` не задан -- карточки доски 101 будут с `deal_amount = NULL` (учитываются в количестве, но не в суммах). Пользователь видит алерт: «Поле суммы для доски "Лиды" не найдено. Проверьте настройки воронки.»

---

## 10. Производительность и оптимизация

### 10.1. Стратегия расчёта

**Важно (v2.0):** В multi-board модели объёмы `card_movements` растут пропорционально количеству досок в пространстве (обычно x2-5 по сравнению с single-board). Пороги стратегий указаны для суммарного объёма **по всему пространству**.

| Объём данных (card_movements на пространство) | Стратегия |
|----------------------------------------------|-----------|
| < 5 000 | Расчёт на лету (VIEW), без кеширования |
| 5 000 -- 50 000 | Материализация `funnel_deal_history` + расчёт агрегатов на лету |
| 50 000 -- 500 000 | Полная материализация + `funnel_stage_snapshot` с предрасчётом |
| > 500 000 | Предрасчёт + партиционирование по `funnel_config_id` и `period_start` |

### 10.2. Инкрементальное обновление

При каждом `card_movement` (перемещении карточки):
1. Определить, принадлежит ли доска карточки (`cards.board_id`) какому-либо `funnel_config.board_ids` (поиск через GIN-индекс на `board_ids`)
2. Для каждого затронутого `funnel_config`: определить, входит ли колонка from/to в `stage_columns`, `win_column_ids` или `loss_column_ids`
3. Если да -- обновить `funnel_deal_history` для этого `card_id`:
   - Закрыть текущую запись (заполнить `exited_at`, `next_column_id`, `duration_hours`)
   - Создать новую запись (если `to_column` -- этап воронки)
   - Установить `board_id` из `cards.board_id`
4. Обновить `funnel_deal_summary` для этого `card_id`
5. Инвалидировать `funnel_stage_snapshot` для затронутых этапов и периодов
6. Инвалидировать кеш auto-config при изменении структуры доски (добавление/удаление колонки, смена `column_type`)

### 10.3. Ожидаемое время ответа

| Объём (на пространство) | Без кеша | С материализацией |
|-------------------------|----------|-------------------|
| < 5 000 | < 200 ms | N/A |
| 5 000 -- 50 000 | 200 ms -- 2 s | < 200 ms |
| 50 000 -- 500 000 | 2 s -- 10 s | < 500 ms |
| > 500 000 | 10 s+ | < 1 s |

### 10.4. Особенности multi-board производительности

- **`board_id = ANY(:board_ids)`:** PostgreSQL эффективно использует `= ANY()` с B-tree индексом по `board_id`, если массив небольшой (до 20 элементов). Для пространств с > 20 досками рекомендуется материализация.
- **Cross-board JOIN:** При построении `funnel_deal_history` из `card_movements` происходит JOIN с `cards` для получения `board_id`. Индекс `cards(board_id, column_id)` покрывает этот сценарий.
- **GIN-индекс на `funnel_config.board_ids`:** Позволяет быстро искать конфигурации при перемещении карточки. Запрос: `WHERE board_ids @> ARRAY[card.board_id]`.
- **Auto-config кеширование:** Best Guess кешируется на уровне пространства с TTL 5 минут. Инвалидация при изменении структуры досок.

---

## 11. SQL автоконфигурации Best Guess

Данный раздел содержит SQL-запросы, используемые алгоритмом Best Guess для автоматического определения конфигурации воронки по `space_id`. Полное описание алгоритма -- в `research/best-guess-algorithm.md`.

### 11.1. Сбор досок пространства с колонками

```sql
-- Шаг 1 + 2: Доски пространства и их колонки
-- Результат: плоский список колонок с глобальным порядком
WITH space_boards AS (
  SELECT
    b.id AS board_id,
    b.title AS board_title,
    b.sort_order,
    b.row_sort_order,
    ROW_NUMBER() OVER (
      ORDER BY b.row_sort_order ASC, b.sort_order ASC
    ) AS board_position
  FROM boards b
  WHERE b.space_id = :space_id
    AND b.company_id = :company_id
    AND b.archived = false
  ORDER BY b.row_sort_order ASC, b.sort_order ASC
),
board_columns AS (
  SELECT
    c.id AS column_id,
    c.board_id,
    c.title AS column_title,
    c.sort_order AS column_sort_order,
    c.column_type,
    sb.board_title,
    sb.board_position
  FROM columns c
  JOIN space_boards sb ON c.board_id = sb.board_id
  ORDER BY sb.board_position ASC, c.sort_order ASC
)
SELECT
  column_id,
  board_id,
  column_title,
  column_type,
  board_title,
  board_position,
  column_sort_order,
  -- Глобальный sort_order (сквозная нумерация по всем доскам, исключая done)
  ROW_NUMBER() OVER (
    ORDER BY board_position ASC, column_sort_order ASC
  ) FILTER (WHERE column_type != 'done') AS global_sort_order
FROM board_columns;
```

### 11.2. Определение won/lost колонок по column_type

```sql
-- Шаг 4: Все done-колонки, отсортированные по глобальной позиции
WITH space_boards AS (
  SELECT b.id AS board_id,
         ROW_NUMBER() OVER (
           ORDER BY b.row_sort_order ASC, b.sort_order ASC
         ) AS board_position
  FROM boards b
  WHERE b.space_id = :space_id
    AND b.company_id = :company_id
    AND b.archived = false
),
done_columns AS (
  SELECT
    c.id AS column_id,
    c.board_id,
    c.title AS column_title,
    c.sort_order AS column_sort_order,
    sb.board_position,
    -- Глобальная позиция done-колонки
    ROW_NUMBER() OVER (
      ORDER BY sb.board_position ASC, c.sort_order ASC
    ) AS done_position,
    -- Общее количество done-колонок
    COUNT(*) OVER () AS total_done_count
  FROM columns c
  JOIN space_boards sb ON c.board_id = sb.board_id
  WHERE c.column_type = 'done'
  ORDER BY sb.board_position ASC, c.sort_order ASC
)
SELECT
  column_id,
  board_id,
  column_title,
  done_position,
  total_done_count,
  -- Логика назначения: последний done = won, остальные = lost
  CASE
    WHEN done_position = total_done_count THEN 'won'
    ELSE 'lost'
  END AS terminal_role
FROM done_columns;
```

**Интерпретация результатов:**

| `total_done_count` | Действие | Confidence |
|-------------------|----------|------------|
| 0 | Последний этап (не-done) из запроса 11.1 = won. Loss = пусто | `low` |
| 1 | Единственный done = won. Loss = пусто | `medium` |
| 2 | Последний done = won, первый done = lost | `high` |
| 3+ | Последний done = won, остальные done = lost | `medium` |

### 11.3. Определение поля суммы (кандидаты по доскам)

```sql
-- Шаг 5: Числовые поля на досках пространства
WITH space_boards AS (
  SELECT b.id AS board_id, b.title AS board_title
  FROM boards b
  WHERE b.space_id = :space_id
    AND b.company_id = :company_id
    AND b.archived = false
),
number_fields AS (
  SELECT
    cf.id AS field_id,
    cf.name AS field_name,
    cf.board_id,
    sb.board_title,
    lower(trim(cf.name)) AS normalized_name
  FROM custom_fields cf
  JOIN space_boards sb ON cf.board_id = sb.board_id
  WHERE cf.field_type = 'number'
  ORDER BY cf.board_id, cf.id
),
-- Поиск общих имён полей (присутствующих на ВСЕХ досках, где есть числовые поля)
boards_with_fields AS (
  SELECT DISTINCT board_id FROM number_fields
),
field_name_coverage AS (
  SELECT
    nf.normalized_name,
    COUNT(DISTINCT nf.board_id) AS boards_count,
    (SELECT COUNT(*) FROM boards_with_fields) AS total_boards_with_fields,
    MIN(nf.field_id) AS first_field_id,
    MIN(nf.field_name) AS field_name_display
  FROM number_fields nf
  GROUP BY nf.normalized_name
)
SELECT
  normalized_name,
  field_name_display,
  first_field_id,
  boards_count,
  total_boards_with_fields,
  -- Общее поле: присутствует на ВСЕХ досках, имеющих числовые поля
  CASE
    WHEN boards_count = total_boards_with_fields THEN true
    ELSE false
  END AS is_common_field
FROM field_name_coverage
ORDER BY is_common_field DESC, boards_count DESC, normalized_name;
```

**Логика определения `metric_mode`:**

```python
# На основе результатов запроса 11.3
common_fields = [f for f in results if f.is_common_field]

if len(common_fields) == 1:
    metric_mode = 'amount'
    deal_amount_field_id = common_fields[0].first_field_id
elif len(common_fields) > 1:
    metric_mode = 'amount'
    deal_amount_field_id = common_fields[0].first_field_id  # первый по алфавиту
    alerts.append('MULTIPLE_AMOUNT_FIELDS')
elif total_boards_with_fields == 0:
    metric_mode = 'count'
    alerts.append('NO_AMOUNT_FIELD')
elif len(boards) == 1 and any_number_fields:
    metric_mode = 'amount'
    deal_amount_field_id = first_number_field.field_id
else:
    metric_mode = 'count'
    alerts.append('DIFFERENT_AMOUNT_FIELDS' or 'PARTIAL_AMOUNT_FIELDS')
```

### 11.4. Связь с основными расчётами

Auto-config не сохраняется в БД -- вычисляется на лету при каждом запросе без сохранённого `funnel_config`. Результат алгоритма используется для формирования временной конфигурации, которая далее передаётся в стандартный pipeline расчётов (разделы 2-8).

```
GET /api/v1/reports/funnel?space_id=42&date_from=...&date_to=...

1. Проверить: есть ли funnel_config для space_id = 42?
   ├── Да -> использовать сохранённый конфиг (шаг 1 из раздела 8)
   └── Нет -> запустить Best Guess (раздел 11)
       ├── Вычислить: board_ids, stages, won/lost, metric_mode, amount_field
       └── Сформировать временный конфиг (без id, auto_generated = true)

2. Далее стандартный pipeline (разделы 2-8) с полученным конфигом
```

---

## 12. Расчёты в режиме count

В режиме `metric_mode = 'count'` воронка строится по количеству карточек. Денежные метрики не рассчитываются. Этот режим используется по умолчанию, когда поле суммы не определено.

### 12.1. Матрица доступности метрик по режимам

| Метрика | `amount` | `count` | Комментарий |
|---------|:--------:|:-------:|-------------|
| **Метрики этапа** | | | |
| Количество сделок, вошедших на этап | Да | Да | Без изменений |
| Сумма сделок на этапе | Да | **Нет** (null) | Требует `deal_amount` |
| Средний чек на этапе | Да | **Нет** (null) | Требует `deal_amount` |
| Конверсия этап -> этап | Да | Да | Всегда по количеству сделок |
| Конверсия этап -> победа | Да | Да | Всегда по количеству сделок |
| Среднее время на этапе | Да | Да | Без изменений |
| Медианное время на этапе | Да | Да | Без изменений |
| Количество зависших сделок | Да | Да | Без изменений |
| Drop-off rate | Да | Да | Всегда по количеству сделок |
| **Метрики воронки** | | | |
| Общая конверсия | Да | Да | Всегда по количеству сделок |
| Средний цикл сделки | Да | Да | Без изменений |
| Pipeline value (сумма) | Да | **Нет** (null) | Требует `deal_amount` |
| Pipeline count (количество) | Да | Да | Количество активных сделок |
| Weighted pipeline value | Да | **Нет** (null) | Требует `deal_amount` |
| Velocity | Да | **Нет** (null) | Требует `deal_amount` |
| Средний чек выигранных | Да | **Нет** (null) | Требует `deal_amount` |
| Потерянные сделки (кол-во) | Да | Да | Без изменений |
| Потерянные сделки (сумма) | Да | **Нет** (null) | Требует `deal_amount` |

### 12.2. Упрощённые SQL для режима count

**Сумма сделок (5.2) -- в режиме count:**

```sql
-- В режиме count: только количество, без суммы
SELECT
  COUNT(DISTINCT fdh.card_id) AS deals_entered,
  NULL::decimal AS total_amount,
  0 AS deals_with_amount,
  COUNT(DISTINCT fdh.card_id) AS deals_without_amount
FROM funnel_deal_history fdh
JOIN cohort c ON fdh.card_id = c.card_id
WHERE fdh.funnel_config_id = :funnel_config_id
  AND fdh.stage_column_id = :stage_column_id
  AND fdh.visit_number = 1;
```

**Средний чек (5.3) -- в режиме count:**

```sql
-- В режиме count: всегда null
SELECT NULL::decimal AS avg_amount;
```

**Pipeline value (6.3) -- в режиме count:**

```sql
-- В режиме count: только количество активных сделок
WITH current_positions AS (
  SELECT
    fdh.card_id,
    fdh.stage_column_id
  FROM funnel_deal_history fdh
  JOIN filtered_cards fc ON fdh.card_id = fc.card_id
  WHERE fdh.funnel_config_id = :funnel_config_id
    AND fdh.entered_at <= :date_to
    AND (fdh.exited_at IS NULL OR fdh.exited_at > :date_to)
)
SELECT
  COUNT(DISTINCT cp.card_id) AS active_deals,
  NULL::decimal AS pipeline_value,
  COUNT(DISTINCT cp.card_id) AS deals_without_amount
FROM current_positions cp;
```

**Weighted pipeline (6.4) и Velocity (6.5) -- в режиме count:**

```sql
-- В режиме count: не рассчитываются
SELECT
  NULL::decimal AS weighted_pipeline_value;

SELECT
  NULL::decimal AS velocity_per_day;
```

**Потерянные сделки (6.6) -- в режиме count:**

```sql
-- В режиме count: только количество, без суммы
WITH lost_deals AS (
  SELECT
    c.card_id,
    (
      SELECT fdh.stage_column_id
      FROM funnel_deal_history fdh
      WHERE fdh.card_id = c.card_id
        AND fdh.funnel_config_id = :funnel_config_id
      ORDER BY fdh.entered_at DESC
      LIMIT 1
    ) AS last_stage_column_id
  FROM cohort c
  JOIN funnel_deal_summary fds ON fds.card_id = c.card_id
  WHERE fds.funnel_config_id = :funnel_config_id
    AND fds.outcome = 'lost'
)
SELECT
  COUNT(*) AS total_lost,
  NULL::decimal AS lost_amount,
  last_stage_column_id,
  COUNT(*) AS lost_from_stage
FROM lost_deals
GROUP BY last_stage_column_id;
```

### 12.3. Фильтрация по сумме в режиме count

В режиме `count` фильтры `amount_min` и `amount_max` **игнорируются** (см. раздел 3, условие `OR :effective_metric_mode = 'count'`). Это логично: если воронка строится по количеству карточек, фильтрация по сумме не имеет смысла.

Если пользователь переключается с `count` на `amount`, фильтры по сумме становятся активными.

### 12.4. Отображение в UI при режиме count

| Элемент | Поведение |
|---------|-----------|
| Основная цифра этапа | Количество сделок (вместо суммы) |
| Подпись под цифрой | "сделок" (вместо "руб.") |
| Переключатель "Кол-во / Сумма" | "Кол-во" активен. "Сумма" задизейблен если `deal_amount_field_id IS NULL` |
| Тултип задизейбленной "Сумма" | "Настройте числовое поле для суммы сделки" |
| Карточки KPI (pipeline, velocity) | Не отображаются или показывают `--` |
| Фильтр "Сумма от / до" | Задизейблен |
