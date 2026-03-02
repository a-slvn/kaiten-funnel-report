import type { PeriodPreset } from './types';

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'this_week', label: 'Текущая неделя' },
  { value: 'last_week', label: 'Прошлая неделя' },
  { value: 'this_month', label: 'Текущий месяц' },
  { value: 'last_month', label: 'Прошлый месяц' },
  { value: 'this_quarter', label: 'Текущий квартал' },
  { value: 'last_quarter', label: 'Прошлый квартал' },
  { value: 'this_year', label: 'Текущий год' },
];

export const CONVERSION_THRESHOLDS = {
  good: 0.7,
  warning: 0.4,
} as const;

export const DEFAULT_PER_PAGE = 25;

export const STALE_THRESHOLD_DAYS = 14;

export const DEFAULT_SPACE = {
  id: 100,
  name: 'CRM-пространство',
};

export const ALERT_CODES = {
  NO_BOARDS: 'NO_BOARDS',
  ALL_COLUMNS_DONE: 'ALL_COLUMNS_DONE',
  NO_DONE_COLUMNS: 'NO_DONE_COLUMNS',
  SINGLE_DONE_COLUMN: 'SINGLE_DONE_COLUMN',
  MULTIPLE_DONE_COLUMNS: 'MULTIPLE_DONE_COLUMNS',
  NO_AMOUNT_FIELD: 'NO_AMOUNT_FIELD',
  MULTIPLE_AMOUNT_FIELDS: 'MULTIPLE_AMOUNT_FIELDS',
  DIFFERENT_AMOUNT_FIELDS: 'DIFFERENT_AMOUNT_FIELDS',
  PARTIAL_AMOUNT_FIELDS: 'PARTIAL_AMOUNT_FIELDS',
} as const;
