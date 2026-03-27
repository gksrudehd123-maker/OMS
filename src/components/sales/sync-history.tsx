'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Upload, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type SyncLog = {
  id: string;
  action: 'API_SYNC' | 'EXCEL_UPLOAD';
  summary: string;
  userName: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  createdAt: string;
};

const PAGE_SIZE = 5;

export function SyncHistory({ refreshKey }: { refreshKey: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data: logs, isLoading } = useQuery<SyncLog[]>({
    queryKey: ['sync-history', refreshKey],
    queryFn: async () => {
      const res = await fetch('/api/audit-logs/sales?limit=30');
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">최근 데이터 수집 이력</h2>
        <p className="mt-2 text-sm text-muted-foreground">아직 수집 이력이 없습니다.</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  };

  const visibleLogs = expanded ? logs : logs.slice(0, PAGE_SIZE);
  const hasMore = logs.length > PAGE_SIZE;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">최근 데이터 수집 이력</h2>
      </div>
      <div className="space-y-2">
        {visibleLogs.map((log) => {
          const isSync = log.action === 'API_SYNC';
          const changes = log.changes as Record<string, { from: unknown; to: unknown }> | null;
          const channel = changes?.channel?.to as string || '-';
          const dateFrom = changes?.dateRange?.from as string | null;
          const dateTo = changes?.dateRange?.to as string | null;
          const successCount = changes?.successCount?.to as number ?? 0;
          const errorCount = changes?.errorCount?.to as number ?? 0;
          const duplicateCount = changes?.duplicateCount?.to as number ?? 0;

          return (
            <div
              key={log.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                isSync ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {isSync ? <RefreshCw className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                    isSync ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isSync ? 'API 동기화' : '엑셀 업로드'}
                  </span>
                  <span className="truncate font-medium">{channel}</span>
                  {isSync && dateFrom && dateTo && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {dateFrom === dateTo ? dateFrom.slice(5) : `${dateFrom.slice(5)} ~ ${dateTo.slice(5)}`}
                    </span>
                  )}
                  <span className="shrink-0 text-muted-foreground">
                    {successCount}건
                    {duplicateCount > 0 && <span className="text-yellow-600"> (중복 {duplicateCount})</span>}
                    {errorCount > 0 && <span className="text-red-500"> (오류 {errorCount})</span>}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(log.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {expanded ? (
            <>접기 <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>이전 이력 더보기 ({logs.length - PAGE_SIZE}건) <ChevronDown className="h-4 w-4" /></>
          )}
        </button>
      )}
    </div>
  );
}
