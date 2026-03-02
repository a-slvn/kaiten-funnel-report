'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SpaceBoard, BestGuessResult } from '@/lib/types';
import { runBestGuess } from '@/lib/best-guess';

export function useBestGuess(boards: SpaceBoard[]) {
  const [result, setResult] = useState<BestGuessResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const boardsRef = useRef(boards);
  boardsRef.current = boards;

  const run = useCallback(() => {
    setIsLoading(true);
    // Simulate async (future API call)
    const timer = setTimeout(() => {
      setResult(runBestGuess(boardsRef.current));
      setIsLoading(false);
    }, 100);
    return timer;
  }, []);

  // Clean up legacy localStorage keys from the old setup-screen implementation
  useEffect(() => {
    try {
      localStorage.removeItem('funnel-setup-config');
      localStorage.removeItem('funnel-config');
    } catch {
      // SSR or restricted storage — ignore
    }
  }, []);

  useEffect(() => {
    const timer = run();
    return () => clearTimeout(timer);
  }, [run]);

  const rerun = useCallback(() => {
    run();
  }, [run]);

  return { result, isLoading, rerun };
}
