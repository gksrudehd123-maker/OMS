'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface LoadingContextType {
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  startLoading: () => {},
  stopLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [manualCount, setManualCount] = useState(0);
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  const isLoading = isFetching > 0 || isMutating > 0 || manualCount > 0;

  const startLoading = useCallback(() => setManualCount((c) => c + 1), []);
  const stopLoading = useCallback(
    () => setManualCount((c) => Math.max(0, c - 1)),
    [],
  );

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              데이터를 불러오는 중...
            </p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
