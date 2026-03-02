# Дизайн-спецификация: Воронка продаж — MUI реализация

**Источник:** скриншот `/Users/slvn/Library/Containers/com.wiheads.paste/Data/tmp/images/Google Chrome 2026-02-25 14.02.15.png`
**Текущий стек:** Next.js 15 / shadcn/ui / Tailwind CSS v4 / Recharts
**Целевой стек:** Material UI (MUI) v6+, Recharts (сохранить), React 19
**Дата:** 2026-02-25

---

## 1. Общая структура интерфейса

### 1.1 Хост-приложение Kaiten

Скриншот показывает отчёт **внутри** полноценного приложения Kaiten. Левая навигационная панель и верхняя строка — это Kaiten shell, а не часть самого отчёта. Это критически важно для понимания области ответственности компонента.

```
┌─────────────────────────────────────────────────────────────────┐
│  TopBar (Kaiten shell) — высота ~40px, тёмно-серый фон          │
├────────────┬────────────────────────────────────────────────────┤
│            │  Breadcrumb + Controls row                          │
│  Left Nav  ├────────────────────────────────────────────────────┤
│  ~220px    │  Report Content Area (max-width ~860px)             │
│  тёмная    │                                                     │
│  тема      │    ┌─ Section: Конверсия по этапам ──────────────┐ │
│            │    │  Bar Chart (≈400px высота)                   │ │
│            │    └─────────────────────────────────────────────┘ │
│            │    ┌─ Ключевые результаты (4 карточки) ──────────┐ │
│            │    └─────────────────────────────────────────────┘ │
│            │    ┌─ По сотрудникам (expandable rows) ──────────┐ │
│            │    └─────────────────────────────────────────────┘ │
│            │                                    ┌──────────────┐ │
│            │                                    │ Filter Panel │ │
│            │                                    │   ~280px     │ │
│            │                                    └──────────────┘ │
└────────────┴────────────────────────────────────────────────────┘
```

### 1.2 Лейаут области отчёта

Отчёт занимает правую часть экрана и имеет **двухколоночный лейаут**:
- **Основная область контента:** flex-grow, максимум ~860px
- **Правая панель фильтров:** фиксированная ширина ~280px, прилипает к правому краю

В текущей shadcn реализации фильтры расположены **горизонтально сверху** (inline). Скриншот показывает иную UX-концепцию с **вертикальной боковой панелью фильтров**, что ближе к интерфейсу самого Kaiten. Спецификация покрывает **оба варианта**.

---

## 2. Дизайн-токены и тема

### 2.1 Цветовая палитра

Интерфейс работает в **тёмной теме** (dark mode first).

#### Семантические цвета (MUI theme tokens)

| Назначение | Цвет (HEX) | MUI token | Tailwind эквивалент |
|---|---|---|---|
| Background страницы | `#1a1a1a` | `background.default` | `bg-background` (oklch 0.145) |
| Background карточек | `#292929` | `background.paper` | `bg-card` (oklch 0.205) |
| Background панели фильтров | `#242424` | `background.paper` (variant) | `bg-sidebar` |
| Основной текст | `#f5f5f5` | `text.primary` | `text-foreground` |
| Вторичный текст / метки | `#a1a1aa` | `text.secondary` | `text-muted-foreground` |
| Border / разделитель | `rgba(255,255,255,0.10)` | `divider` | `border-border` |
| Hover строки | `rgba(255,255,255,0.04)` | `action.hover` | `hover:bg-muted/50` |

#### Акцентные цвета

| Назначение | Цвет (HEX) | Компонент |
|---|---|---|
| Синий (бар чарта, топ градиент) | `#60a5fa` | chart bars top |
| Синий (бар чарта, низ градиента) | `#2563eb` | chart bars bottom |
| Зелёный (оплачено/выиграно) | `#34d399` / `#10b981` | badges won, KPI conversion |
| Красный (потеряно) | `#f87171` / `#ef4444` | badges lost, destructive |
| Фиолетовый (суммы/amounts) | `#a78bfa` | violet accent, velocity KPI |
| Жёлтый / амбер (зависшие, предупреждение) | `#fbbf24` | stale deal badges |
| Синий приглушённый (pipeline/объём) | `#60a5fa` | KPI pipeline card |
| Зелёный конверсия (хорошая >= 70%) | `rgba(52,211,153,0.15)` bg + `#34d399` text | ConversionBadge |
| Амбер конверсия (средняя >= 40%) | `rgba(251,191,36,0.15)` bg + `#fbbf24` text | ConversionBadge |
| Красный конверсия (плохая < 40%) | `rgba(248,113,113,0.15)` bg + `#f87171` text | ConversionBadge |

### 2.2 MUI Theme конфигурация

```tsx
import { createTheme } from '@mui/material/styles';

export const kaitenTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#1a1a1a',
      paper: '#292929',
    },
    primary: {
      main: '#60a5fa',        // синий акцент
      dark: '#2563eb',
    },
    success: {
      main: '#34d399',
      dark: '#10b981',
    },
    error: {
      main: '#f87171',
      dark: '#ef4444',
    },
    warning: {
      main: '#fbbf24',
    },
    secondary: {
      main: '#a78bfa',        // фиолетовый
    },
    text: {
      primary: '#f5f5f5',
      secondary: '#a1a1aa',
    },
    divider: 'rgba(255, 255, 255, 0.10)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    // см. раздел 3
  },
  shape: {
    borderRadius: 10,         // ~0.625rem = 10px (shadcn --radius)
  },
  components: {
    // см. раздел 8
  },
});
```

---

## 3. Типографика

### 3.1 Шрифт

**Inter** с поддержкой кириллицы. Загрузка через Google Fonts или локально:

```tsx
// next/font
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin', 'cyrillic'] });
```

### 3.2 Размеры и веса

| Элемент | Font Size | Font Weight | Line Height | MUI variant |
|---|---|---|---|---|
| Заголовок страницы "Воронка продаж" | 24px / 1.5rem | 700 | 1.3 | `h4` или кастомный `h1` |
| Подзаголовок (имя конфига · доска) | 13px / 0.813rem | 400 | 1.4 | `body2` / `caption` |
| Заголовок секции ("Конверсия по этапам") | 16px / 1rem | 600 | 1.4 | `h6` |
| KPI: главное значение | 24px / 1.5rem | 700 | 1.2 | `h5` кастом |
| KPI: подпись карточки | 13px / 0.813rem | 500 | 1.4 | `subtitle2` |
| KPI: вспомогательный текст | 12px / 0.75rem | 400 | 1.4 | `caption` |
| Метки осей чарта | 11-12px | 400 | 1 | кастом SVG |
| Числа внутри баров | 14px | 700 | 1 | кастом SVG |
| Текст в таблице | 13-14px | 400 / 500 | 1.4 | `body2` |
| Заголовки таблицы | 11-12px | 600 | 1 | `caption` + uppercase |
| Badge текст | 11-12px | 600 | 1 | кастом |
| Кнопки | 13px | 500 | 1 | `button` стандарт |
| Метка фильтра | 12px | 600 | 1 | `overline` / label |

### 3.3 MUI Typography переопределение

```tsx
typography: {
  fontFamily: '"Inter", sans-serif',
  h4: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
  h5: { fontSize: '1.25rem', fontWeight: 700 },
  h6: { fontSize: '1rem', fontWeight: 600 },
  subtitle1: { fontSize: '0.875rem', fontWeight: 500 },
  subtitle2: { fontSize: '0.8125rem', fontWeight: 500, color: 'text.secondary' },
  body1: { fontSize: '0.875rem', fontWeight: 400 },
  body2: { fontSize: '0.8125rem', fontWeight: 400 },
  caption: { fontSize: '0.75rem', fontWeight: 400 },
  overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
},
```

---

## 4. Лейаут страницы

### 4.1 Контейнер

```tsx
// Страница отчёта монтируется внутри Kaiten shell
// Компонент получает пространство правее от боковой навигации

<Box
  sx={{
    display: 'flex',
    gap: 3,                    // 24px между контентом и фильтрами
    maxWidth: 1200,
    mx: 'auto',
    px: { xs: 2, sm: 3, lg: 4 },
    py: 3,
  }}
>
  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
    {/* Основной контент */}
  </Box>
  <Box sx={{ width: 280, flexShrink: 0 }}>
    {/* Панель фильтров (правая колонка) */}
  </Box>
</Box>
```

### 4.2 Хедер секции отчёта

Breadcrumb + кнопка настройки расположены в строке над заголовком — это Kaiten shell. Внутри отчёта:

```
┌──────────────────────────────────────────────────┐
│ Воронка продаж                    [График][Табл.] │  ← row 1
│ Основная воронка B2B · Продажи B2B                │  ← row 2 (muted)
└──────────────────────────────────────────────────┘
```

```tsx
<Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
  <Box>
    <Typography variant="h4" component="h1">
      Воронка продаж
    </Typography>
    <Typography variant="body2" color="text.secondary" mt={0.5}>
      {config.name} · {config.board_name}
    </Typography>
  </Box>
  <Box display="flex" gap={1} alignItems="center">
    <ViewSwitcher />
    <ConfigButton />
  </Box>
</Stack>
```

---

## 5. Панель фильтров (правая боковая панель)

### 5.1 Визуальная спецификация

Из скриншота правая панель имеет:
- Заголовок "Фильтр" жирным, с кнопкой закрытия
- Строка "Выбранные даты" — label группы
- Два date picker поля: начало и конец периода
- Строка "Ответственный" — label группы
- Dropdown/Select для выбора ответственного
- Цвет фона чуть светлее основного, `#242424`
- Скруглённые углы 10px, без внешней тени
- Padding 16px

### 5.2 Вариант 1: Inline фильтры (текущая реализация)

```tsx
// Горизонтальный ряд над чартом — простой вариант
<Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center" mb={2}>
  <FormControl size="small" sx={{ minWidth: 200 }}>
    <Select value={period} onChange={handlePeriod}>
      <MenuItem value="this_week">Текущая неделя</MenuItem>
      <MenuItem value="last_week">Прошлая неделя</MenuItem>
      <MenuItem value="this_month">Текущий месяц</MenuItem>
      <MenuItem value="last_month">Прошлый месяц</MenuItem>
      <MenuItem value="this_quarter">Текущий квартал</MenuItem>
      <MenuItem value="last_quarter">Прошлый квартал</MenuItem>
      <MenuItem value="this_year">Текущий год</MenuItem>
    </Select>
  </FormControl>

  <FormControl size="small" sx={{ minWidth: 220 }}>
    <Select
      multiple
      value={ownerIds}
      onChange={handleOwners}
      renderValue={(selected) =>
        selected.length === 0 ? 'Все ответственные' : `Выбрано: ${selected.length}`
      }
    >
      {managers.map((m) => (
        <MenuItem key={m.id} value={m.id}>
          <Checkbox checked={ownerIds.includes(m.id)} size="small" />
          <ListItemText primary={m.full_name} />
        </MenuItem>
      ))}
    </Select>
  </FormControl>

  {hasActiveFilters && (
    <Button
      variant="text"
      size="small"
      startIcon={<RefreshIcon />}
      onClick={onReset}
      sx={{ color: 'text.secondary' }}
    >
      Сбросить
    </Button>
  )}
</Stack>
```

### 5.3 Вариант 2: Правая боковая панель (как в Kaiten)

```tsx
<Paper
  elevation={0}
  sx={{
    width: 280,
    p: 2,
    bgcolor: '#242424',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2.5,
    position: 'sticky',
    top: 16,
    alignSelf: 'flex-start',
  }}
>
  {/* Header */}
  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
    <Typography variant="subtitle1" fontWeight={600}>
      Фильтр
    </Typography>
    <IconButton size="small" onClick={onClose}>
      <CloseIcon fontSize="small" />
    </IconButton>
  </Stack>

  {/* Date section */}
  <Typography variant="overline" color="text.secondary" display="block" mb={1}>
    Выбранные даты
  </Typography>

  <Stack spacing={1} mb={2}>
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <DatePicker
        label="Начало"
        value={dateFrom}
        onChange={setDateFrom}
        slotProps={{ textField: { size: 'small', fullWidth: true } }}
      />
      <DatePicker
        label="Конец"
        value={dateTo}
        onChange={setDateTo}
        slotProps={{ textField: { size: 'small', fullWidth: true } }}
      />
    </LocalizationProvider>
  </Stack>

  {/* Owner section */}
  <Typography variant="overline" color="text.secondary" display="block" mb={1}>
    Ответственный
  </Typography>

  <FormControl size="small" fullWidth>
    <Select
      multiple
      value={ownerIds}
      onChange={handleOwners}
      renderValue={(selected) =>
        selected.length === 0 ? 'Все' : `Выбрано: ${selected.length}`
      }
    >
      {managers.map((m) => (
        <MenuItem key={m.id} value={m.id}>
          <Checkbox checked={ownerIds.includes(m.id)} size="small" />
          <ListItemText primary={m.full_name} />
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Paper>
```

### 5.4 Стили MUI-компонентов для фильтров

**Select / TextField (size="small"):**
- Background: `rgba(255,255,255,0.06)`
- Border: `1px solid rgba(255,255,255,0.12)`
- Border-radius: 8px
- Высота: 36px
- Placeholder цвет: `#a1a1aa`

```tsx
// В MUI theme components
MuiOutlinedInput: {
  styleOverrides: {
    root: {
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.06)',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(255,255,255,0.12)',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(255,255,255,0.25)',
      },
    },
  },
},
```

---

## 6. Чарт воронки

### 6.1 Структура

Чарт состоит из двух частей:
1. **Recharts BarChart** — вертикальные бары (не горизонтальные!)
2. **Строка под чартом** — суммы + стрелки + ConversionBadge

Из скриншота хорошо видно, что это **вертикальный BarChart** с убывающими столбцами слева направо, симулирующий воронку.

### 6.2 BarChart параметры

```tsx
<BarChart
  data={data}
  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
  barCategoryGap="20%"
>
  <defs>
    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#60a5fa" />   {/* синий светлый */}
      <stop offset="100%" stopColor="#2563eb" />  {/* синий тёмный */}
    </linearGradient>
  </defs>

  <CartesianGrid
    strokeDasharray="3 3"
    vertical={false}
    stroke="rgba(255,255,255,0.08)"
  />

  <XAxis
    dataKey="name"
    tick={{ fill: '#a1a1aa', fontSize: 12, fontFamily: 'Inter' }}
    tickLine={false}
    axisLine={false}
  />

  <YAxis
    tick={{ fill: '#a1a1aa', fontSize: 12, fontFamily: 'Inter' }}
    tickLine={false}
    axisLine={false}
    domain={[0, 'dataMax + 15%']}
  />

  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />

  <Bar
    dataKey="deals_entered"
    fill="url(#barGradient)"
    radius={[8, 8, 0, 0]}    // скруглены только верхние углы
    maxBarSize={80}
    cursor="pointer"
  >
    <LabelList dataKey="deals_entered" content={<CustomBarLabel />} />
  </Bar>
</BarChart>
```

### 6.3 CustomBarLabel

Числа внутри баров / над малыми барами:

```tsx
function CustomBarLabel({ x, y, width, height, value }) {
  const isSmall = height < 30;
  return (
    <text
      x={x + width / 2}
      y={isSmall ? y - 8 : y + height / 2}
      textAnchor="middle"
      dominantBaseline={isSmall ? 'auto' : 'central'}
      fill={isSmall ? '#a1a1aa' : '#ffffff'}
      fontWeight={700}
      fontSize={14}
      fontFamily="Inter"
    >
      {value}
    </text>
  );
}
```

### 6.4 CustomTooltip

```tsx
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const stage = payload[0].payload;

  return (
    <Paper
      elevation={8}
      sx={{
        px: 1.5,
        py: 1,
        bgcolor: '#2d2d2d',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 1.5,
        minWidth: 160,
      }}
    >
      <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
        {stage.stage_name}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Сделок: <b style={{ color: '#f5f5f5' }}>{stage.deals_entered}</b>
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Сумма: <b style={{ color: '#f5f5f5' }}>{formatCurrencyShort(stage.total_amount)}</b>
      </Typography>
      {stage.avg_duration_days != null && (
        <Typography variant="caption" color="text.secondary" display="block">
          Ср. время: <b style={{ color: '#f5f5f5' }}>{stage.avg_duration_days.toFixed(1)} дн.</b>
        </Typography>
      )}
    </Paper>
  );
}
```

### 6.5 Строка конверсий под чартом

```
[1,000K ₽]  →  [CR 56%]  [850K ₽]  →  [CR 82%]  [320K ₽]  →  ...
```

```tsx
<Box display="flex" alignItems="center" justifyContent="space-around" px={1.5} mt={0}>
  {stages.map((stage, i) => (
    <Box key={stage.stage_column_id} display="flex" alignItems="center" gap={0.5}>
      <Box textAlign="center" minWidth={60}>
        <Typography variant="caption" color="text.secondary">
          {formatCurrencyShort(stage.total_amount)}
        </Typography>
      </Box>
      {i < stages.length - 1 && (
        <Box display="flex" alignItems="center" gap={0.5}>
          <Typography color="text.secondary" sx={{ fontSize: 16, lineHeight: 1 }}>
            →
          </Typography>
          <ConversionBadge value={stage.conversion_to_next} />
        </Box>
      )}
    </Box>
  ))}
</Box>
```

### 6.6 ConversionBadge MUI-компонент

```tsx
function ConversionBadge({ value }) {
  if (value == null) return null;

  const isGood    = value >= 0.70;
  const isWarning = value >= 0.40;

  const styles = isGood
    ? { bgcolor: 'rgba(52,211,153,0.15)',  color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
    : isWarning
    ? { bgcolor: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }
    : { bgcolor: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' };

  return (
    <Box
      component="span"
      sx={{
        ...styles,
        display: 'inline-flex',
        alignItems: 'center',
        px: 0.75,
        py: 0.125,
        borderRadius: 999,
        fontSize: '0.6875rem',
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {formatPercent(value)}
    </Box>
  );
}
```

---

## 7. Карточки ключевых результатов (KPI Cards)

### 7.1 Визуальная структура

```
┌─────────────────────────────────────────────────────────────────┐
│  [10]              [1,000,000 ₽]      [2]          [88 000 ₽]  │
│  сделок всего      65.4 дн.           источника     сотрудника   │
│                    средняя длит.                                  │
│                    сделки                                        │
└─────────────────────────────────────────────────────────────────┘
```

Из скриншота:
- 4 карточки в 1 ряд на десктопе
- Каждая карточка имеет: иконку + заголовок (строка 1), большое число (строка 2), подпись (строка 3)
- Иконки: `TrendingUpIcon` (зелёная), `DollarSign` (синяя), `Gauge` (фиолетовая), `AccessTimeIcon` (янтарная)
- Ни одна карточка не имеет бордера с акцентным цветом (все нейтральные)
- Высота карточки ~110-120px

### 7.2 MUI-компонент

```tsx
const kpiCards = [
  {
    title: 'Общая конверсия',
    value: formatPercent(summary.overall_conversion),
    subtitle: `${summary.total_won} из ${summary.total_entered} сделок`,
    Icon: TrendingUpIcon,
    iconColor: '#34d399',       // emerald
  },
  {
    title: 'Объём воронки',
    value: formatCurrencyShort(summary.pipeline_value),
    subtitle: `${summary.pipeline_deals_count} активных сделок`,
    Icon: MonetizationOnIcon,
    iconColor: '#60a5fa',       // blue
  },
  {
    title: 'Скорость воронки',
    value: formatCurrencyPerDay(summary.velocity_per_day),
    subtitle: 'Выручка в день',
    Icon: SpeedIcon,
    iconColor: '#a78bfa',       // violet
  },
  {
    title: 'Цикл сделки',
    value: formatDays(summary.avg_sales_cycle_days),
    subtitle: `Медиана: ${formatDays(summary.median_sales_cycle_days)}`,
    Icon: AccessTimeIcon,
    iconColor: '#fbbf24',       // amber
  },
];

function KpiCards({ summary }) {
  return (
    <Grid container spacing={2}>
      {kpiCards.map((card) => (
        <Grid item xs={12} sm={6} lg={3} key={card.title}>
          <Card
            elevation={0}
            sx={{
              bgcolor: 'background.paper',    // #292929
              border: '1px solid',
              borderColor: 'divider',          // rgba(255,255,255,0.10)
              borderRadius: 2.5,
              p: 2,
              height: '100%',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={500}
                sx={{ fontSize: '0.8125rem' }}
              >
                {card.title}
              </Typography>
              <card.Icon sx={{ fontSize: 16, color: card.iconColor }} />
            </Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ fontSize: '1.5rem', lineHeight: 1.2, mb: 0.5 }}
            >
              {card.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {card.subtitle}
            </Typography>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
```

---

## 8. Секция "По сотрудникам"

### 8.1 Визуальная спецификация

Из скриншота секция показывает:

```
┌─────────────────────────────────────────────────────────────────┐
│ По сотрудникам                                    Подробнее ▼   │
├─────────────┬────────────┬────────────┬────────────────────────┤
│ [аватар]    │ сделок 2   │ отказов 2  │ конверс. 0            │
│ Андрей      │            │            │                        │
│ Семёнов     ├────────────┴────────────┴────────────────────────┤
│             │ КП Готово  [зелёный tag]                         │
│             │ КП Готово  [зелёный tag]                         │
│             │ КП Базовое [синий tag]                           │
│             │ КП Базовое [красный tag]                         │
└─────────────┴──────────────────────────────────────────────────┘
                                               [ПОКАЗАТЬ ЕЩЁ]
```

**Детали из скриншота:**
- Аватар круглый, ~40px, цветной (инициалы или фото)
- Имя: полное имя, жирный, 14px
- Метрики в 3 колонках: "сделок", "отказов", "конверсия"
- Развёрнутый список сделок — плоский список строк
- Каждая сделка: название сделки слева + цветной статус-чип справа
- Статусы: зелёный (выиграно), красный (проиграно), синий (в работе)
- Кнопка "ПОКАЗАТЬ ЕЩЁ" — outlined, нижний центр

### 8.2 Цвета статус-чипов сотрудников

| Статус | Текст | Цвет фона | Цвет текста |
|---|---|---|---|
| `won` (Выиграно) | зелёный | `rgba(52,211,153,0.15)` | `#34d399` |
| `lost` (Проиграно) | красный | `rgba(248,113,113,0.15)` | `#f87171` |
| `in_progress` (В работе) | синий | `rgba(96,165,250,0.15)` | `#60a5fa` |

### 8.3 Код компонента

```tsx
function EmployeeSection({ managers, deals }) {
  return (
    <Box>
      <Typography variant="h6" mb={2}>
        По сотрудникам
      </Typography>

      {managers.map((manager) => (
        <ManagerRow key={manager.id} manager={manager} deals={dealsByManager[manager.id]} />
      ))}

      <Box textAlign="center" mt={2}>
        <Button variant="outlined" size="small" sx={{ borderRadius: 1.5, px: 3 }}>
          Показать ещё
        </Button>
      </Box>
    </Box>
  );
}

function ManagerRow({ manager, deals }) {
  const [expanded, setExpanded] = useState(false);

  const won       = deals.filter(d => d.outcome === 'won').length;
  const lost      = deals.filter(d => d.outcome === 'lost').length;
  const convRate  = deals.length > 0 ? won / deals.length : 0;

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <Box
        display="flex"
        alignItems="center"
        gap={2}
        p={2}
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <Avatar
          src={manager.avatar_url}
          sx={{
            width: 40,
            height: 40,
            fontSize: '0.875rem',
            fontWeight: 600,
            bgcolor: stringToColor(manager.full_name),   // детерминированный цвет
          }}
        >
          {getInitials(manager.full_name)}
        </Avatar>

        {/* Name */}
        <Box flex={1} minWidth={0}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {manager.full_name}
          </Typography>
        </Box>

        {/* Stats */}
        <Stack direction="row" spacing={3}>
          <StatCell label="сделок" value={deals.length} />
          <StatCell label="отказов" value={lost} />
          <StatCell label="конверсия" value={formatPercent(convRate)} />
        </Stack>

        {/* Expand icon */}
        <ExpandMoreIcon
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: 'text.secondary',
            fontSize: 18,
          }}
        />
      </Box>

      {/* Expandable deal list */}
      <Collapse in={expanded}>
        <Divider />
        <Box px={2} pb={1}>
          {deals.map((deal) => (
            <Box
              key={deal.card_id}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              py={0.75}
              sx={{
                '&:not(:last-child)': {
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
              }}
            >
              <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                {deal.card_title}
              </Typography>
              <OutcomeChip outcome={deal.outcome} />
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

function StatCell({ label, value }) {
  return (
    <Box textAlign="center" minWidth={56}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}

function OutcomeChip({ outcome }) {
  const map = {
    won:         { label: 'Выиграно',  bgcolor: 'rgba(52,211,153,0.15)',  color: '#34d399' },
    lost:        { label: 'Проиграно', bgcolor: 'rgba(248,113,113,0.15)', color: '#f87171' },
    in_progress: { label: 'В работе',  bgcolor: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
  };
  const s = map[outcome];
  return (
    <Box
      component="span"
      sx={{
        bgcolor: s.bgcolor,
        color: s.color,
        border: `1px solid ${s.color}33`,
        borderRadius: 999,
        px: 1,
        py: 0.25,
        fontSize: '0.6875rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </Box>
  );
}
```

### 8.4 Утилита для цвета аватара

```ts
// Детерминированный цвет из имени (не случайный)
function stringToColor(name: string): string {
  const palette = [
    '#7c3aed', '#2563eb', '#0891b2', '#059669',
    '#d97706', '#dc2626', '#c026d3', '#4f46e5',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
}
```

---

## 9. Таблица этапов воронки (альтернативный вид)

### 9.1 Спецификация

| Колонка | Выравнивание | Тип данных |
|---|---|---|
| Этап | left | строка, жирный |
| Сделок | right | число |
| Сумма | right | валюта короткая |
| Ср. чек | right | валюта короткая |
| Конверсия | center | ConversionBadge |
| Ср. время | right | дни |
| Зависшие | right | число (янтарный если > 0) |

### 9.2 MUI Table

```tsx
<TableContainer
  component={Paper}
  elevation={0}
  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
>
  <Table size="small">
    <TableHead>
      <TableRow sx={{ '& th': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
        <TableCell>Этап</TableCell>
        <TableCell align="right">Сделок</TableCell>
        <TableCell align="right">Сумма</TableCell>
        <TableCell align="right">Ср. чек</TableCell>
        <TableCell align="center">Конверсия</TableCell>
        <TableCell align="right">Ср. время</TableCell>
        <TableCell align="right">Зависшие</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {stages.map((stage) => (
        <TableRow
          key={stage.stage_column_id}
          hover
          onClick={() => onStageClick(stage)}
          sx={{ cursor: 'pointer' }}
        >
          <TableCell>
            <Typography variant="body2" fontWeight={500}>
              {stage.stage_name}
            </Typography>
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2">{formatNumber(stage.deals_entered)}</Typography>
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2">{formatCurrencyShort(stage.total_amount)}</Typography>
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2">{formatCurrencyShort(stage.avg_amount)}</Typography>
          </TableCell>
          <TableCell align="center">
            <ConversionBadge value={stage.conversion_to_next} />
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2">{formatDays(stage.avg_duration_days)}</Typography>
          </TableCell>
          <TableCell align="right">
            <Typography
              variant="body2"
              sx={{ color: stage.stale_deals_count > 0 ? '#fbbf24' : 'text.secondary' }}
            >
              {stage.stale_deals_count}
            </Typography>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

---

## 10. Дроллдаун (боковая панель деталей этапа)

### 10.1 MUI Drawer (вместо shadcn Sheet)

```tsx
<Drawer
  anchor="right"
  open={isOpen}
  onClose={onClose}
  PaperProps={{
    sx: {
      width: { xs: '100%', sm: 540 },
      bgcolor: 'background.paper',
      p: 0,
    },
  }}
>
  <Box display="flex" flexDirection="column" height="100%">
    {/* Header */}
    <Box px={3} pt={3} pb={2} borderBottom="1px solid" borderColor="divider">
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h6">{stage.stage_name}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {formatNumber(totalDeals)} сделок · {formatCurrencyShort(stage.total_amount)}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Stack>
    </Box>

    {/* Table */}
    <Box flex={1} overflow="auto" px={2} py={2}>
      <DrilldownTable deals={deals} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
    </Box>

    {/* Pagination */}
    {totalPages > 1 && (
      <Box px={2} py={1.5} borderTop="1px solid" borderColor="divider">
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, p) => onPageChange(p)}
          size="small"
          sx={{ '& .MuiPagination-ul': { justifyContent: 'center' } }}
        />
      </Box>
    )}
  </Box>
</Drawer>
```

---

## 11. ViewSwitcher (Переключатель вид/таблица)

### 11.1 ToggleButtonGroup MUI

```tsx
<ToggleButtonGroup
  value={viewMode}
  exclusive
  onChange={(_, v) => v && onViewChange(v)}
  size="small"
  sx={{
    '& .MuiToggleButton-root': {
      px: 1.5,
      py: 0.5,
      gap: 0.75,
      fontSize: '0.8125rem',
      textTransform: 'none',
      border: '1px solid',
      borderColor: 'divider',
      color: 'text.secondary',
      '&.Mui-selected': {
        bgcolor: 'rgba(255,255,255,0.08)',
        color: 'text.primary',
      },
    },
  }}
>
  <ToggleButton value="chart">
    <BarChartIcon fontSize="small" />
    График
  </ToggleButton>
  <ToggleButton value="table">
    <TableChartIcon fontSize="small" />
    Таблица
  </ToggleButton>
</ToggleButtonGroup>
```

---

## 12. Состояния загрузки и пустых данных

### 12.1 Skeleton

```tsx
// Используем MUI Skeleton
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
  {/* Header */}
  <Box display="flex" justifyContent="space-between">
    <Box>
      <Skeleton variant="text" width={200} height={32} />
      <Skeleton variant="text" width={280} height={20} sx={{ mt: 0.5 }} />
    </Box>
    <Skeleton variant="rounded" width={140} height={36} />
  </Box>

  {/* Filters */}
  <Skeleton variant="rounded" height={36} sx={{ maxWidth: 440 }} />

  {/* KPI cards */}
  <Grid container spacing={2}>
    {[...Array(4)].map((_, i) => (
      <Grid item xs={12} sm={6} lg={3} key={i}>
        <Skeleton variant="rounded" height={112} />
      </Grid>
    ))}
  </Grid>

  {/* Chart */}
  <Skeleton variant="rounded" height={400} />
</Box>
```

### 12.2 Empty state

```tsx
<Box
  display="flex"
  flexDirection="column"
  alignItems="center"
  justifyContent="center"
  py={10}
  gap={2}
>
  <BarChartIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4 }} />
  <Typography variant="h6" color="text.secondary">
    Нет данных для отображения
  </Typography>
  <Typography variant="body2" color="text.secondary">
    Измените фильтры или добавьте сделки на доску
  </Typography>
</Box>
```

---

## 13. MUI Theme компонентов — глобальные переопределения

```tsx
components: {
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backgroundImage: 'none',    // убирает MUI светлый оверлей в dark mode
      },
    },
  },

  MuiCard: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        border: '1px solid rgba(255,255,255,0.10)',
      },
    },
  },

  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        borderRadius: 8,
        fontWeight: 500,
        fontSize: '0.8125rem',
      },
      sizeSmall: {
        padding: '4px 12px',
        fontSize: '0.75rem',
      },
    },
  },

  MuiToggleButton: {
    styleOverrides: {
      root: { textTransform: 'none', fontSize: '0.8125rem' },
    },
  },

  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-root': {
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#a1a1aa',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          paddingTop: 10,
          paddingBottom: 10,
        },
      },
    },
  },

  MuiTableBody: {
    styleOverrides: {
      root: {
        '& .MuiTableRow-root': {
          '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
        },
        '& .MuiTableCell-root': {
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.8125rem',
          padding: '10px 16px',
        },
      },
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(255,255,255,0.12)',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(255,255,255,0.28)',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#60a5fa',
          borderWidth: 1,
        },
      },
      input: {
        fontSize: '0.8125rem',
        padding: '8px 12px',
      },
    },
  },

  MuiSelect: {
    styleOverrides: {
      select: {
        fontSize: '0.8125rem',
        padding: '8px 12px',
      },
    },
  },

  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontSize: '0.8125rem',
        minHeight: 36,
        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
        '&.Mui-selected': {
          bgcolor: 'rgba(96,165,250,0.15)',
          '&:hover': { bgcolor: 'rgba(96,165,250,0.20)' },
        },
      },
    },
  },

  MuiDivider: {
    styleOverrides: {
      root: { borderColor: 'rgba(255,255,255,0.10)' },
    },
  },

  MuiAvatar: {
    styleOverrides: {
      root: {
        width: 40,
        height: 40,
        fontSize: '0.875rem',
        fontWeight: 600,
      },
    },
  },

  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundImage: 'none',
        bgcolor: '#292929',
      },
    },
  },
},
```

---

## 14. Иерархия компонентов

```
FunnelReportPage
└── FunnelReport
    ├── Box (layout wrapper — flex row)
    │   ├── Box (main content — flex col)
    │   │   ├── ReportHeader
    │   │   │   ├── Typography h4 "Воронка продаж"
    │   │   │   ├── Typography body2 (config name)
    │   │   │   └── ViewSwitcher (ToggleButtonGroup)
    │   │   │
    │   │   ├── Divider
    │   │   │
    │   │   ├── KpiCards
    │   │   │   └── Grid container (4 cols)
    │   │   │       └── Grid item × 4
    │   │   │           └── Card
    │   │   │               ├── Icon (MUI icon)
    │   │   │               ├── Typography caption (title)
    │   │   │               ├── Typography h5 (value)
    │   │   │               └── Typography caption (subtitle)
    │   │   │
    │   │   ├── Typography h6 "Конверсия по этапам"
    │   │   │
    │   │   ├── FunnelChart  [если viewMode === 'chart']
    │   │   │   ├── ResponsiveContainer
    │   │   │   │   └── BarChart (Recharts)
    │   │   │   │       ├── defs > linearGradient
    │   │   │   │       ├── CartesianGrid
    │   │   │   │       ├── XAxis / YAxis
    │   │   │   │       ├── Tooltip (кастомный Paper)
    │   │   │   │       └── Bar > LabelList
    │   │   │   └── Box (строка конверсий)
    │   │   │       └── ConversionBadge × N
    │   │   │
    │   │   ├── FunnelTable  [если viewMode === 'table']
    │   │   │   └── TableContainer > Table
    │   │   │
    │   │   ├── Divider
    │   │   │
    │   │   └── EmployeeSection
    │   │       ├── Typography h6 "По сотрудникам"
    │   │       ├── ManagerRow × N
    │   │       │   ├── Box (header: avatar + stats + expand icon)
    │   │       │   └── Collapse
    │   │       │       └── Box (deal list rows with OutcomeChip)
    │   │       └── Button "Показать ещё"
    │   │
    │   └── FiltersPanel (Paper — sticky, right column)
    │       ├── Typography "Фильтр" + IconButton close
    │       ├── Typography overline "Выбранные даты"
    │       ├── DatePicker × 2  (MUI X DatePicker)
    │       ├── Typography overline "Ответственный"
    │       └── Select (multiple с Checkbox)
    │
    └── StageDrilldown (Drawer anchor="right")
        ├── Box header (stage name + totals + close)
        ├── DrilldownTable (TableContainer)
        └── Pagination
```

---

## 15. Зависимости для установки

```bash
# MUI core + icons
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled

# MUI X Date Pickers (для DatePicker в фильтрах)
npm install @mui/x-date-pickers date-fns

# Recharts (оставить как есть)
# npm install recharts  # уже установлен
```

---

## 16. Pixel-perfect checklist

- [ ] Шрифт Inter загружен с кириллическим subset
- [ ] `<html>` не имеет класса `dark` — тема управляется через `ThemeProvider`
- [ ] `backgroundImage: 'none'` выставлен глобально для `Paper` и `Card`
- [ ] Градиент баров использует HEX цвета, не CSS var / hsl (не рендерятся в SVG)
- [ ] `ResponsiveContainer` не обёрнут вторично — Recharts добавляет его сам
- [ ] Все числа в формате ru-RU: `Intl.NumberFormat('ru-RU')`
- [ ] ConversionBadge использует `border-radius: 999px` (pill)
- [ ] Hover строк таблицы: `rgba(255,255,255,0.04)` — не слишком яркий
- [ ] `textTransform: 'none'` на всех Button и ToggleButton
- [ ] Drawer не имеет `elevation` / `boxShadow` поверх контента
- [ ] MUI Tooltip (если используется) имеет кастомные стили совпадающие с темой
- [ ] `stringToColor()` детерминирован — один и тот же цвет при перерендере
