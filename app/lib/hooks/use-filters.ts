'use client';

import { useState, useCallback } from 'react';
import type { FunnelFilters, PeriodPreset } from '@/lib/types';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subQuarters,
  format,
} from 'date-fns';

function getDateRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

  switch (preset) {
    case 'this_week':
      return { from: fmt(startOfWeek(now, { weekStartsOn: 1 })), to: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case 'last_week': {
      const lw = subWeeks(now, 1);
      return { from: fmt(startOfWeek(lw, { weekStartsOn: 1 })), to: fmt(endOfWeek(lw, { weekStartsOn: 1 })) };
    }
    case 'this_month':
      return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { from: fmt(startOfMonth(lm)), to: fmt(endOfMonth(lm)) };
    }
    case 'this_quarter':
      return { from: fmt(startOfQuarter(now)), to: fmt(endOfQuarter(now)) };
    case 'last_quarter': {
      const lq = subQuarters(now, 1);
      return { from: fmt(startOfQuarter(lq)), to: fmt(endOfQuarter(lq)) };
    }
    case 'this_year':
      return { from: fmt(startOfYear(now)), to: fmt(endOfYear(now)) };
  }
}

export function useFilters() {
  const [filters, setFilters] = useState<FunnelFilters>(() => {
    const range = getDateRange('this_month');
    return {
      period: 'this_month',
      date_from: range.from,
      date_to: range.to,
      owner_ids: [],
    };
  });

  const setPeriod = useCallback((preset: PeriodPreset) => {
    const range = getDateRange(preset);
    setFilters((prev) => ({
      ...prev,
      period: preset,
      date_from: range.from,
      date_to: range.to,
    }));
  }, []);

  const setOwnerIds = useCallback((ids: number[]) => {
    setFilters((prev) => ({ ...prev, owner_ids: ids }));
  }, []);

  const resetFilters = useCallback(() => {
    const range = getDateRange('this_month');
    setFilters({
      period: 'this_month',
      date_from: range.from,
      date_to: range.to,
      owner_ids: [],
    });
  }, []);

  return { filters, setPeriod, setOwnerIds, resetFilters };
}
