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
