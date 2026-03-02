'use client';

import { useState, useEffect } from 'react';
import type { FunnelFilters, FunnelReportData, MetricMode } from '@/lib/types';
import { getFunnelData } from '@/data/mock-funnel-data';

export function useFunnelData(
  filters: FunnelFilters,
  metricMode: MetricMode,
  boardIds?: number[],
) {
  const [data, setData] = useState<FunnelReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Simulate async loading
    const timer = setTimeout(() => {
      const result = getFunnelData(filters, metricMode, boardIds);
      setData(result);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, metricMode, boardIds]);

  return { data, isLoading };
}
