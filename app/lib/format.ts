const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const shortCurrencyFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('ru-RU');

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return currencyFormatter.format(value);
}

export function formatCurrencyShort(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  if (Math.abs(value) >= 1_000_000) {
    return `${shortCurrencyFormatter.format(value / 1_000_000)} M \u20BD`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${shortCurrencyFormatter.format(value / 1_000)} K \u20BD`;
  }
  return `${numberFormatter.format(value)} \u20BD`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDays(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return `${value.toFixed(1)} дн.`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return numberFormatter.format(value);
}

export function formatCurrencyPerDay(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return `${numberFormatter.format(Math.round(value))} \u20BD/день`;
}
