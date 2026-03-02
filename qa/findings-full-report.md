# Findings: Полный QA-обзор отчёта «Воронка продаж»

**Дата:** 2026-03-02
**Scope:** Полный обзор фронтенд-прототипа (mock-data)
**Версия:** После рефакторинга Best Guess (implementation-plan.md)
**Статус:** Найдены проблемы

---

## Критические (Critical)

### F-001. Фильтры не применяются к данным

**Влияние:** Данные отчёта не изменяются при смене периода, даты или ответственного. Пользователь меняет фильтры, нажимает «Показать», но воронка остаётся прежней.

**Воспроизведение:**
1. Открыть отчёт
2. В фильтре «Ответственный» выбрать конкретного менеджера
3. Нажать «Показать»
4. Данные на графике и в KPI-карточках не изменяются

**Причина:** В `funnel-report.tsx` (строка 79-81) обработчик `handleFilterApply` пуст — `useCallback(() => {}, [])`. Локальные состояния `ownerIds` и `localDateFrom/localDateTo` обновляются, но не передаются в хук `useFilters` и не влияют на `useFunnelData`.

В `filters-sidebar.tsx` callback `onOwnerIdsChange` вызывается при выборе менеджера в Autocomplete (строка 179-181), но `ownerIds` из `funnel-report.tsx` (строка 72) — это отдельный state, который нигде не подключён к фильтрам хука `useFilters`. Хук `useFilters` имеет свой `setOwnerIds`, но он не вызывается.

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx`, строки 72-81
- `/Users/slvn/ai/kaiten/funnel_report/app/lib/hooks/use-filters.ts`

**Отсутствующий критерий приёмки:** Изменение фильтров должно перестраивать воронку. US 3.1, 3.3.

---

### F-002. Даты фильтра не влияют на выборку данных

**Влияние:** Mock-данные содержат даты за июнь 2024 года, но фильтр по умолчанию показывает «Текущий месяц» (март 2026). Несмотря на это, все 100 сделок отображаются. При реальном API это будет критическая ошибка — данные не фильтруются по дате.

**Причина:** В `mock-funnel-data.ts` (функция `getFunnelData`, строки 122-138) отсутствует фильтрация по `filters.date_from` и `filters.date_to`. Фильтрация реализована только по `owner_ids` и `boardIds`.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-funnel-data.ts`, строки 122-138

**Отсутствующий критерий приёмки:** Данные должны фильтроваться по диапазону дат. US 3.1, 3.2.

---

### F-003. «Оплачено» (done-колонка) отмечена как «Проиграно» в Best Guess

**Влияние:** Колонка «Оплачено» (id=204, column_type=done) в результате Best Guess получает роль «loss» (Проиграно). Это логическая ошибка — оплаченные сделки считаются проигранными. На скриншоте setup-dialog видно: «Оплачено: Проиграно».

**Причина:** Алгоритм Best Guess при 4+ done-колонках (103, 204, 205, 302) назначает последнюю по позиции как won (302 = «Активный клиент»), а все остальные done — как loss (103, 204, 205). Но «Оплачено» семантически — это успех.

Алгоритм не учитывает название колонки. Он полагается только на position — `sortDoneByGlobalPosition()` в `best-guess.ts` (строки 120-131).

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/best-guess.ts`, строки 350-361

**Скриншот:** `screenshots/04-setup-dialog.png`

**Отсутствующий критерий приёмки:** Best Guess должен корректно определять won/lost по семантике или хотя бы показывать алерт, что «Оплачено» помечена как «Проиграно». US 6.4.

---

## Высокие (High)

### F-004. Кнопка «Показать» не применяет фильтры

**Влияние:** Пользователь ожидает, что нажатие «Показать» применит выбранные фильтры. Фактически кнопка ничего не делает.

**Причина:** `handleFilterApply` — пустая функция. При этом кнопка визуально выглядит активной и кликабельной. Это обман ожиданий.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx`, строки 79-81

---

### F-005. Смена периода в Select не обновляет данные

**Влияние:** Пользователь выбирает «Прошлый месяц» — даты в полях обновляются, но данные на графике те же.

**Причина:** `handlePeriodChange` вызывает `setPeriod`, который обновляет `filters` в хуке. Однако mock-данные не фильтруются по дате (см. F-002). Кроме того, поля дат «Дата начала» / «Дата окончания» управляются локальным состоянием (`localDateFrom/localDateTo`) и не синхронизированы с `filters.date_from/date_to` при ручном изменении.

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx`, строки 35-36, 65-70
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/filters-sidebar.tsx`, строки 118-119

---

### F-006. Настройки из Setup Dialog не перестраивают данные воронки

**Влияние:** Пользователь заходит в «Настроить», меняет роли колонок, нажимает «Применить» — данные на графике не меняются. Только переключатель метрики (count/amount) может измениться.

**Причина:** `handleSetupApply` в `funnel-report.tsx` (строки 90-95) сохраняет overrides в state, но `useFunnelData` не получает overrides и не перестраивает stages. Данные всегда берутся из `mock-funnel-data.ts`, который использует фиксированный список `mockStages`.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx`, строки 87-95

**Отсутствующий критерий приёмки:** Применение настроек должно перестроить воронку. US 6.6, 6.8, 6.10.

---

### F-007. Нет кнопки «Сбросить фильтры»

**Влияние:** По требованиям (US 3.7) должна быть кнопка «Сбросить фильтры», которая видна при активных фильтрах. В текущей реализации такой кнопки нет.

**Причина:** `useFilters` экспортирует `resetFilters`, но он не подключён к UI. В `FiltersSidebar` нет кнопки сброса.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/filters-sidebar.tsx`

---

### F-008. Нет индикатора активных фильтров

**Влияние:** Пользователь не видит, что данные отфильтрованы (US 3.8). Нет бейджа с количеством активных фильтров.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/filters-sidebar.tsx`

---

### F-009. Ср. время (avg_duration_days) показывает «—» для 4 из 6 этапов

**Влияние:** В таблице этапы «Новые», «Квалификация», «Встреча», «Предложение» показывают «—» в столбце «Ср. время». Это вводит в заблуждение.

**Причина:** `avg_duration_days` рассчитывается только по `closedVisits` — сделкам с `exited_at != null` на конкретном этапе. В mock-данных большинство сделок на ранних этапах имеют `exited_at = null` (т.к. `hasExited = false` в `generateDeal`). В итоге `average([])` возвращает `null`.

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-funnel-data.ts`, строки 71-73
- `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-deals.ts`, строки 178-187

**Скриншот:** `screenshots/02-table-view-count.png`

---

### F-010. Accessibility: aria-hidden блокирует фокус

**Влияние:** При закрытии Drawer и Dialog возникает предупреждение `Blocked aria-hidden on an element because its descendant retained focus`. Пользователи screen-reader могут потерять контекст.

**Воспроизведение:** Открыть drilldown, закрыть его. В консоли появляется warning.

**Файл:** Проблема MUI Drawer/Dialog. Требуется использование `inert` или корректный focus management.

---

## Средние (Medium)

### F-011. Conversion_to_next отображается как процент от 0 до 100, но считается как доля

**Влияние:** `formatPercent` умножает значение на 100 (`(value * 100).toFixed(1)%`), но `conversion_to_next` уже является долей (0.82). В таблице отображается `82.0%`, что корректно. Однако в bar-label на графике используется `Math.round(stage.conversion_to_win * 100)` без `.toFixed(1)`, что округляет иначе. Нет единого форматирования.

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/lib/format.ts`, строка 32
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-chart.tsx`, строки 114-116

---

### F-012. Заголовок «Конверсия по этапам: Сделки» статичный

**Влияние:** Заголовок не отражает текущий режим метрики (count vs amount) или применённые фильтры.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx`, строка 183

---

### F-013. Нет пустого состояния (empty state) при пустых данных

**Влияние:** Если фильтр отсечёт все сделки, график покажет пустые столбцы или 0, но специального сообщения «Нет данных за выбранный период» нет.

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-chart.tsx`
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-table.tsx`

---

### F-014. Пагинация drilldown: нет скролла к началу при смене страницы

**Влияние:** При переключении страницы в drilldown-панели список не скроллится наверх. Пользователь видит конец списка предыдущей страницы.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/stage-drilldown.tsx`

---

### F-015. Setup Dialog не синхронизирует draft при повторном открытии

**Влияние:** `handleEnter` в `FunnelSetupDialog` вызывается через `TransitionProps.onEnter`. Однако `useState` инициализируется только при первом рендере. Если пользователь открывает dialog, меняет что-то, закрывает без применения, а потом открывает снова — он видит свои несохранённые изменения, а не текущее состояние.

**Причина:** `useState` init не вызывается повторно при переоткрытии, а `handleEnter` может не синхронизироваться из-за timing.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-setup-dialog.tsx`, строки 128-136, 141-147

---

### F-016. Таблица в режиме count не показывает столбец «Конверсия до выигрыша» (CR to win)

**Влияние:** В таблице есть столбец «Конверсия», который показывает `conversion_to_next`. Но нет отображения `conversion_to_win`, который показывается на графике (CR%). Пользователь видит разные метрики конверсии в разных видах.

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-table.tsx` — показывает `conversion_to_next`
- `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-chart.tsx` — показывает `conversion_to_win` как CR%

---

### F-017. Секция «По сотрудникам»: заголовки столбцов не выровнены с данными

**Влияние:** Заголовки «сделок», «оплачено», «потеряно» расположены в правой части строки заголовка, но данные по каждому менеджеру выводятся в виде текста `сделок: 26  оплачено: 4  потеряно: 6` в левой части. Визуально заголовки не соответствуют позиции чисел.

**Скриншот:** `screenshots/06-employee-expanded.png`

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/employee-section.tsx`, строки 228-241 (заголовки) vs строки 87-92 (данные)

---

### F-018. «Подробнее:» не выглядит как интерактивный элемент

**Влияние:** Кнопка «Подробнее:» реализована как `<Box component="button">` без видимых стилей кнопки. Она выглядит как текст с иконкой, а не кнопка. Нет фокусного кольца.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/employee-section.tsx`, строки 96-118

---

### F-019. Нет ссылки на карточку сделки из drilldown

**Влияние:** По требованиям (US 5.3) клик по карточке в drill-down должен открывать карточку в Kaiten. В текущей реализации `card_url` генерируется в mock-данных, но в `DrilldownDealList` нет ссылки — строки таблицы не кликабельны.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/drilldown-deal-list.tsx`

---

### F-020. Sidebar фильтров не адаптивна

**Влияние:** Sidebar имеет фиксированную ширину 280px (`width: 280, flexShrink: 0`). На узких экранах (<768px) sidebar вытесняет основной контент. Нет breakpoints для скрытия/сворачивания.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/filters-sidebar.tsx`, строка 41

---

## Низкие (Low)

### F-021. `className="dark"` на html, но MUI-тема — light

**Влияние:** В `layout.tsx` (строка 22) указан `className="dark"` на `<html>`, но MUI-тема в `theme.ts` задана как `mode: 'light'`. Это несогласованность. Tailwind может применить dark-mode стили, а MUI — нет.

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/app/layout.tsx`, строка 22
- `/Users/slvn/ai/kaiten/funnel_report/app/lib/theme.ts`, строка 7

---

### F-022. Утилита `cn()` из `lib/utils.ts` не используется

**Влияние:** Файл `lib/utils.ts` содержит `cn()` — утилиту для tailwind-merge. Она не используется нигде в проекте (все компоненты на MUI sx). Мёртвый код.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/lib/utils.ts`

---

### F-023. Дублирование списка менеджеров

**Влияние:** Список менеджеров определён дважды: в `data/mock-managers.ts` и в `data/mock-deals.ts` (строки 39-45). При рассинхронизации данные будут некорректны.

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-managers.ts`
- `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-deals.ts`, строки 39-45

---

### F-024. Conversion badge не показывает значение для последнего этапа

**Влияние:** В таблице `Onboarding` не имеет значения конверсии (пустая ячейка). Это корректное поведение (последний этап), но нет визуального объяснения — почему пусто.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/conversion-badge.tsx`, строка 12

---

### F-025. `stale_threshold_days` различается по этапам, но нигде не объяснено

**Влияние:** В `mockStages` значение `stale_threshold_days` — 7, 7, 10, 12, 14, 7 для разных этапов. Но в UI нигде не объяснено, что считается «зависшей» сделкой. В `mock-deals.ts` используется фиксированное `> 10`, а не значение из stage.

**Файлы:**
- `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-stages.ts`
- `/Users/slvn/ai/kaiten/funnel_report/app/data/mock-deals.ts`, строка 144

---

### F-026. Нет tooltip на «Зависшие» чипе в таблице

**Влияние:** Пользователь видит число зависших сделок, но не понимает критерий (> N дней).

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-table.tsx`, строки 72-86

---

### F-027. Переключение view mode не сохраняется между сессиями

**Влияние:** По US 1.4 выбранный вид (график/таблица) должен сохраняться между сессиями. Текущая реализация использует `useState`, без localStorage.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/funnel-report.tsx`, строка 31

---

### F-028. Deprecated `InputProps` в MUI v7 TextField

**Влияние:** В `filters-sidebar.tsx` используется `InputProps` (строки 122, 150), который deprecated в MUI v7. Следует использовать `slotProps.input`.

**Файл:** `/Users/slvn/ai/kaiten/funnel_report/app/components/funnel/filters-sidebar.tsx`, строки 122, 150

---

## Открытые вопросы

1. **Как должен работать фильтр по дате при mock-данных?** Текущие mock-данные за июнь 2024, а фильтр по умолчанию — текущий месяц. Нужно либо актуализировать даты, либо фильтровать mock.

2. **Должна ли sidebar фильтров быть сворачиваемой?** На узких экранах (< 1024px) sidebar занимает 280px, оставляя мало места для графика.

3. **Что должно происходить при применении overrides из Setup Dialog?** Текущая реализация не перестраивает данные. Нужен механизм передачи overrides в data layer.

4. **Как валидировать минимум 2 этапа при отключении колонок в Setup Dialog?** Текущий UI позволяет отключить все колонки.

---

## Остаточные пробелы тестирования

1. Responsive-поведение на мобильных — не протестировано (нет доступа к resize viewport)
2. Кастомный диапазон дат (US 3.2) — не реализован
3. Экспорт (US 7.1-7.3) — не реализован
4. Сравнение периодов (US 4.1-4.3) — не реализован
5. Сохранение настроек между сессиями (US 6.10) — не реализовано
6. Drag-and-drop перестановка этапов (US 6.7) — не реализовано
