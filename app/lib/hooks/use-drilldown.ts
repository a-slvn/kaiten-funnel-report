'use client';

import { useState, useCallback, useMemo } from 'react';
import type { FunnelStageData, FunnelDealItem, DrilldownState, SortOrder } from '@/lib/types';
import { getDealsByStage } from '@/data/mock-funnel-data';
import { DEFAULT_PER_PAGE } from '@/lib/constants';

export function useDrilldown(allDeals: FunnelDealItem[]) {
  const [state, setState] = useState<DrilldownState>({
    isOpen: false,
    stage: null,
    deals: [],
    sortBy: 'entered_at',
    sortOrder: 'desc',
    page: 1,
  });

  const openDrilldown = useCallback(
    (stage: FunnelStageData) => {
      const deals = getDealsByStage(stage.stage_column_id, allDeals);
      setState({
        isOpen: true,
        stage,
        deals,
        sortBy: 'entered_at',
        sortOrder: 'desc',
        page: 1,
      });
    },
    [allDeals]
  );

  const closeDrilldown = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setSort = useCallback((sortBy: string) => {
    setState((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const sortedDeals = useMemo(() => {
    const deals = [...state.deals];
    const dir = state.sortOrder === 'asc' ? 1 : -1;

    deals.sort((a, b) => {
      switch (state.sortBy) {
        case 'deal_amount':
          return ((a.deal_amount ?? 0) - (b.deal_amount ?? 0)) * dir;
        case 'duration_days':
          return (a.duration_days - b.duration_days) * dir;
        case 'title':
          return a.card_title.localeCompare(b.card_title, 'ru') * dir;
        case 'responsible_name':
          return (a.responsible?.full_name ?? '').localeCompare(b.responsible?.full_name ?? '', 'ru') * dir;
        case 'entered_at':
        default:
          return (new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime()) * dir;
      }
    });
    return deals;
  }, [state.deals, state.sortBy, state.sortOrder]);

  const paginatedDeals = useMemo(() => {
    const start = (state.page - 1) * DEFAULT_PER_PAGE;
    return sortedDeals.slice(start, start + DEFAULT_PER_PAGE);
  }, [sortedDeals, state.page]);

  const totalPages = Math.max(1, Math.ceil(state.deals.length / DEFAULT_PER_PAGE));

  return {
    ...state,
    sortedDeals,
    paginatedDeals,
    totalPages,
    openDrilldown,
    closeDrilldown,
    setSort,
    setPage,
  };
}
