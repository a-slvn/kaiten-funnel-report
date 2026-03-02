# Verification Log

Дата прогона: `2026-03-02`

Локально были запущены следующие проверки.

## 1. Unit tests

Command:

```bash
cd app && npx vitest run
```

Result:

- `1` test file passed
- `12` tests passed
- статус: `PASS`

## 2. ESLint

Command:

```bash
cd app && npm run lint
```

Result:

- статус: `FAIL`
- `3` errors
- `8` warnings

Основные ошибки:

- `app/components/funnel/funnel-report.tsx:47` — `react-hooks/set-state-in-effect`
- `app/lib/hooks/use-best-guess.ts:11` — `react-hooks/refs`
- `app/lib/hooks/use-funnel-data.ts:16` — `react-hooks/set-state-in-effect`

## 3. Production build

Command:

```bash
cd app && npm run build
```

Result:

- статус: `PASS`
- production build собрался успешно
- маршрут `/reports/funnel` сгенерирован как static content

Примечание:

- Next.js показал warning про автоматически выбранный workspace root из-за нескольких lockfile, но сборку это не сломало.
