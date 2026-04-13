'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, RefreshCw } from 'lucide-react';

type SmsLog = {
  id: string;
  recipient: string;
  sender: string;
  body: string;
  msgType: string;
  title: string | null;
  status: string;
  resultCode: string | null;
  resultMsg: string | null;
  testMode: boolean;
  userName: string | null;
  createdAt: string;
};

type Quota = { sms: number; lms: number; mms: number };

export default function SmsLogTab() {
  const [page, setPage] = useState(1);
  const [recipientFilter, setRecipientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const { data, isLoading, refetch } = useQuery<{
    data: SmsLog[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['sms-logs', page, recipientFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (recipientFilter) params.set('recipient', recipientFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/sms/logs?${params}`);
      return res.json();
    },
  });

  const { data: quota } = useQuery<Quota>({
    queryKey: ['sms-quota'],
    queryFn: async () => {
      const res = await fetch('/api/sms/quota');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    retry: false,
  });

  const logs = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={recipientFilter}
            onChange={(e) => {
              setPage(1);
              setRecipientFilter(e.target.value);
            }}
            placeholder="전화번호 검색"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">전체 상태</option>
            <option value="SUCCESS">성공</option>
            <option value="FAIL">실패</option>
          </select>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
        {quota && (
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              SMS 잔여 {quota.sms.toLocaleString()}
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              LMS 잔여 {quota.lms.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted text-left">
                <th className="px-4 py-3 font-semibold">발송일시</th>
                <th className="px-4 py-3 font-semibold">수신자</th>
                <th className="px-4 py-3 font-semibold">타입</th>
                <th className="px-4 py-3 font-semibold">내용</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">발송자</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    로딩 중...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <MessageSquare className="mx-auto mb-2 h-8 w-8" />
                    발송 이력이 없습니다
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">
                      {log.recipient}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          log.msgType === 'SMS'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                        }`}
                      >
                        {log.msgType}
                      </span>
                      {log.testMode && (
                        <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          TEST
                        </span>
                      )}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <div
                        className="line-clamp-2 whitespace-pre-wrap text-muted-foreground"
                        title={log.body}
                      >
                        {log.body}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}
                        title={log.resultMsg || ''}
                      >
                        {log.status === 'SUCCESS' ? '성공' : '실패'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {log.userName || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            전체 {meta.total}건 · {meta.page}/{meta.totalPages} 페이지
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              이전
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
