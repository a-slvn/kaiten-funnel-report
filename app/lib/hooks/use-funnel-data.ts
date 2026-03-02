'use client';

import { useState, useEffect } from 'react';
import type { FunnelFilters, FunnelReportData, FunnelStageData, MetricMode } from '@/lib/types';
import type { MockDeal } from '@/data/mock-deals';
import { getFunnelData } from '@/data/mock-funnel-data';
import type { ActiveFunnelColumn } from '@/lib/funnel-columns';

export function useFunnelData(
  filters: FunnelFilters,
  metricMode: MetricMode,
  boardIds?: number[],
  customStages?: FunnelStageData[],
  customDeals?: MockDeal[],
  activeColumns?: ActiveFunnelColumn[],
) {
  const [data, setData] = useState<FunnelReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stable reference for boardIds array
  const boardIdsKey = boardIds?.join(',') ?? '';

  useEffect(() => {
    setIsLoading(true);
    // Simulate async loading
    const timer = setTimeout(() => {
      const result = getFunnelData(filters, metricMode, boardIds, customStages, customDeals, activeColumns);
      setData(result);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, metricMode, boardIdsKey, customStages, customDeals, activeColumns]);

  return { data, isLoading };
}
