# Findings Review

Режим: `Findings Review`

Объект ревью:

- `app/app/reports/funnel/page.tsx`
- `app/components/funnel/*`
- `app/lib/hooks/*`
- `app/data/mock-funnel-data.ts`

Источники контекста:

- реализация UI и вычислений
- локальный прогон `vitest`
- локальный прогон `eslint`
- локальный прогон `next build`

## Findings

### 1. High — пользовательские фильтры в сайдбаре фактически не работают

Impact:

- пользователь не может задать свой диапазон дат;
- фильтр по ответственному не закрепляется в UI и не попадает в фактические фильтры;
- кнопка `Показать` создает ожидание применения фильтра, но ничего не делает.

Reproduction / reasoning:

1. `FiltersSidebar` рендерит контролы как controlled-компоненты от `filters.date_from`, `filters.date_to` и `filters.owner_ids`.
2. В `FunnelReport` обработчики этих контролов пишут не в `filters`, а в отдельные локальные состояния `localDateFrom`, `localDateTo` и `ownerIds`.
3. `handleFilterApply` пустой, поэтому даже накопленные локальные значения никуда не применяются.
4. В результате поле даты возвращает старое значение из `filters`, а мультиселект по ответственному опирается на неизмененный `filters.owner_ids`.

Evidence:

- `app/components/funnel/funnel-report.tsx:34-36`
- `app/components/funnel/funnel-report.tsx:73-81`
- `app/components/funnel/funnel-report.tsx:229-237`
- `app/components/funnel/filters-sidebar.tsx:36`
- `app/components/funnel/filters-sidebar.tsx:114-120`
- `app/components/funnel/filters-sidebar.tsx:142-147`
- `app/components/funnel/filters-sidebar.tsx:172-181`
- `app/components/funnel/filters-sidebar.tsx:203-220`

Missing acceptance criterion:

- должно быть явно определено, какие фильтры применяются мгновенно, а какие только по кнопке;
- все отображаемые значения фильтров должны совпадать с реально примененными значениями.

### 2. High — период и диапазон дат не влияют на данные отчета

Impact:

- экран выглядит как отфильтрованный по периоду, хотя расчет остается по полному набору данных;
- пользователь может принять неверное решение, считая цифры ограниченными выбранным периодом.

Reproduction / reasoning:

1. `useFilters` хранит `period`, `date_from`, `date_to`.
2. `useFunnelData` получает объект `filters` и пересчитывает отчет при его изменении.
3. Но `getFunnelData` использует из `filters` только `owner_ids`; поля `date_from` и `date_to` в расчетах вообще не участвуют.

Evidence:

- `app/lib/hooks/use-filters.ts:42-83`
- `app/lib/hooks/use-funnel-data.ts:15-24`
- `app/data/mock-funnel-data.ts:122-139`

Missing acceptance criterion:

- должно быть определено, по какому событию сделка входит в период: `entered_at`, `exited_at`, оплата или другое бизнес-событие;
- должно быть определено поведение при частичном попадании сделки в период.

### 3. High — диалог "Настроить воронку" обещает пересборку логики, но applied overrides не участвуют в расчете

Impact:

- пользователь меняет этапы, `won/lost` роли и поле суммы, но отчет не перестраивается в соответствии с этими настройками;
- экран вводит в заблуждение: UI создает ощущение сохраненной кастомной конфигурации, а фактически меняется только `metricMode`.

Reproduction / reasoning:

1. `FunnelSetupDialog` собирает полноценный объект `FunnelOverrides`.
2. `handleSetupApply` сохраняет `overrides`, но дальше использует только `newOverrides.metric_mode`.
3. `useFunnelData` вызывается без `overrides`.
4. `getFunnelData` строит расчет от статических `mockStages` и `mockDeals`, а не от пользовательской конфигурации.
5. Поэтому изменение ролей колонок и выбор поля суммы не меняют состав этапов, правила выигрыша/проигрыша и источник сумм.

Evidence:

- `app/components/funnel/funnel-setup-dialog.tsx:128-179`
- `app/components/funnel/funnel-report.tsx:56-61`
- `app/components/funnel/funnel-report.tsx:88-95`
- `app/components/funnel/funnel-report.tsx:240-248`
- `app/data/mock-funnel-data.ts:34-97`
- `app/data/mock-funnel-data.ts:122-217`

Missing acceptance criterion:

- должно быть явно определено, какие части отчета обязаны пересчитываться после `Применить`;
- должно быть явно определено, должна ли конфигурация влиять только на текущую сессию или сохраняться между сессиями.

### 4. Medium — drilldown не соответствует значениям воронки и KPI по этапу

Impact:

- пользователь кликает на этап и видит количество сделок, которое не совпадает с цифрой на баре/в строке таблицы;
- доверие к аналитике падает, потому что detail-view не подтверждает summary.

Reproduction / reasoning:

1. Метрика этапа `deals_entered` считается как все сделки, дошедшие до этапа или дальше.
2. Drilldown открывается через `getDealsByStage`, который отбирает только сделки, находящиеся на текущем `stage_column_id`.
3. Заголовок drawer показывает `totalDeals`, но сумма в заголовке берется из `stage.total_amount`, то есть из stage-summary, а не из реально показанного списка.

Evidence:

- `app/data/mock-funnel-data.ts:38-50`
- `app/data/mock-funnel-data.ts:59-66`
- `app/data/mock-funnel-data.ts:219-225`
- `app/lib/hooks/use-drilldown.ts:18-31`
- `app/components/funnel/stage-drilldown.tsx:73-79`

Missing acceptance criterion:

- должно быть определено, что именно открывает drilldown: сделки, вошедшие в этап; сделки, находящиеся на этапе; сделки, выбывшие на этапе; или несколько режимов.

### 5. Medium — инженерный quality gate уже красный: `eslint` падает на React hooks-правилах

Impact:

- проект не проходит базовую статическую проверку;
- это сигнал о рисках каскадных ререндеров и нестабильной логики обновления состояния;
- при включенном CI по lint изменения будут блокироваться.

Reproduction / reasoning:

Локальный `npm run lint` завершился с ошибками:

- `react-hooks/set-state-in-effect` в `funnel-report.tsx`
- `react-hooks/refs` в `use-best-guess.ts`
- `react-hooks/set-state-in-effect` в `use-funnel-data.ts`

Evidence:

- `app/components/funnel/funnel-report.tsx:45-49`
- `app/lib/hooks/use-best-guess.ts:10-18`
- `app/lib/hooks/use-funnel-data.ts:15-23`
- см. также `qa_codex/verification-log.md`

Missing acceptance criterion:

- для проекта стоит зафиксировать, является ли `eslint` обязательным gate перед merge.

## Open Questions

- Фильтры должны применяться по кнопке `Показать` или сразу при изменении контрола?
- Какой бизнес-смысл у периода: вход в этап, закрытие сделки, дата оплаты или дата нахождения в этапе?
- Что должен показывать drilldown по клику на этап: входы, текущий остаток, потери или успешные исходы?
- Должна ли настройка воронки менять только фронтовую визуализацию mock-данных или будущий API-запрос тоже?

## Residual Testing Gaps

- В этом прогоне не было браузерного e2e-прохода; Playwright/Cypress в проекте не настроены.
- Нет отдельного покрытия на empty/error/permission-denied состояния.
- Не подтверждена мобильная адаптация в живом браузере, хотя layout сейчас выглядит слабо готовым к узким экранам.
- Отчет пока питается mock-данными, поэтому интеграционные риски с реальным API остаются непроверенными.
