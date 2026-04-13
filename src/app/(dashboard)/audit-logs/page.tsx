'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type AuditLog = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  target: string;
  targetId: string | null;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  createdAt: string;
};

const ACTION_STYLES: Record<string, { label: string; color: string }> = {
  CREATE: {
    label: '생성',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  UPDATE: {
    label: '수정',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  DELETE: {
    label: '삭제',
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
};

const TARGET_LABELS: Record<string, string> = {
  Product: '상품',
  Channel: '채널',
  User: '사용자',
  Upload: '업로드',
  AdCost: '광고비',
  CSRecord: 'CS',
  SmsLog: 'SMS',
  Setting: '설정',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filterTarget, setFilterTarget] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 30;

  const { data, isLoading } = useQuery<{
    data: AuditLog[];
    meta: { total: number };
  }>({
    queryKey: ['audit-logs', page, filterTarget, filterAction],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filterTarget) params.set('target', filterTarget);
      if (filterAction) params.set('action', filterAction);
      const res = await fetch(`/api/audit-logs?${params}`);
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
  });

  const logs = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">감사 로그</h1>
        <p className="text-sm text-muted-foreground">
          데이터 변경 이력을 확인합니다.
        </p>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterTarget}
          onChange={(e) => {
            setFilterTarget(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">전체 대상</option>
          {Object.entries(TARGET_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">전체 행동</option>
          <option value="CREATE">생성</option>
          <option value="UPDATE">수정</option>
          <option value="DELETE">삭제</option>
        </select>
        <span className="self-center text-sm text-muted-foreground">
          총 {total}건
        </span>
      </div>

      {/* 로그 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                시간
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                사용자
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                행동
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                대상
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                내용
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-14" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-48" />
                  </td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <ScrollText className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    기록된 로그가 없습니다.
                  </p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                    className={`border-b border-border transition-colors hover:bg-muted/50 ${log.changes ? 'cursor-pointer' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {log.userName || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[log.action]?.color}`}
                      >
                        {ACTION_STYLES[log.action]?.label || log.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {TARGET_LABELS[log.target] || log.target}
                    </td>
                    <td className="px-4 py-3">{log.summary}</td>
                  </tr>
                  {expandedId === log.id && log.changes && (
                    <tr
                      key={`${log.id}-detail`}
                      className="border-b border-border"
                    >
                      <td colSpan={5} className="bg-muted/30 px-6 py-3">
                        <div className="space-y-1 text-xs">
                          {Object.entries(log.changes).map(
                            ([field, { from, to }]) => (
                              <div key={field} className="flex gap-2">
                                <span className="font-medium text-muted-foreground w-32">
                                  {field}
                                </span>
                                <span className="text-red-500 line-through">
                                  {formatValue(from)}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-green-600 dark:text-green-400">
                                  {formatValue(to)}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border p-2 transition-colors hover:bg-muted disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border p-2 transition-colors hover:bg-muted disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
