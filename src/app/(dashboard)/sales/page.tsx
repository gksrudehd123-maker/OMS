'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const UploadZone = dynamic(
  () => import('@/components/sales/upload-zone').then((m) => m.UploadZone),
  { loading: () => <Skeleton className="h-40 w-full rounded-xl" /> },
);

const OrderTable = dynamic(
  () => import('@/components/sales/order-table').then((m) => m.OrderTable),
  { loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

const DailySalesTable = dynamic(
  () => import('@/components/sales/daily-sales-table').then((m) => m.DailySalesTable),
  { loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

type Channel = {
  id: string;
  name: string;
  code: string;
};

export default function SalesPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // API 동기화 state
  const [syncing, setSyncing] = useState(false);
  const [syncFrom, setSyncFrom] = useState('');
  const [syncTo, setSyncTo] = useState('');

  // RG 판매 날짜
  const [salesDate, setSalesDate] = useState('');

  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data) => {
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0].id);
      });

    // 기본 동기화 날짜: 어제 ~ 오늘
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    setSyncTo(formatDate(today));
    setSyncFrom(formatDate(yesterday));
    setSalesDate(formatDate(yesterday));
  }, []);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const selectedChannelCode =
    channels.find((ch) => ch.id === selectedChannel)?.code || '';
  const isRocketGrowth =
    selectedChannelCode.toLowerCase() === 'coupang_rocket_growth';

  const handleSync = async () => {
    if (!syncFrom || !syncTo) {
      toast.error('동기화 기간을 선택해주세요');
      return;
    }

    setSyncing(true);
    try {
      // 한국 시간대(+09:00) ISO 8601 형식 (네이버 API 요구사항)
      const from = `${syncFrom}T00:00:00.000+09:00`;
      const to = `${syncTo}T23:59:59.999+09:00`;

      const res = await fetch('/api/sync/smartstore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || '동기화 실패');
        return;
      }

      if (data.summary.total === 0) {
        toast.info(data.message);
      } else {
        toast.success(
          `${data.summary.success}건 동기화 완료 (중복: ${data.summary.duplicates}건, 신규상품: ${data.summary.newProducts || 0}건)`,
        );
        setRefreshKey((k) => k + 1);
      }
    } catch {
      toast.error('동기화 중 오류가 발생했습니다');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />
      <div>
        <h1 className="text-2xl font-semibold">매출 관리</h1>
        <p className="text-sm text-muted-foreground">
          엑셀 파일 업로드 또는 API 자동 동기화로 주문 데이터를 관리합니다
        </p>
      </div>

      {/* API 동기화 영역 (로컬 환경에서만 표시) */}
      {!process.env.NEXT_PUBLIC_HIDE_API_SYNC && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">스마트스토어 API 동기화</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            네이버 커머스 API로 주문 데이터를 자동으로 가져옵니다
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                시작일
              </label>
              <input
                type="date"
                value={syncFrom}
                onChange={(e) => setSyncFrom(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                종료일
              </label>
              <input
                type="date"
                value={syncTo}
                onChange={(e) => setSyncTo(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {syncing ? '동기화 중...' : 'API 동기화'}
            </button>
          </div>
        </div>
      )}

      {/* 엑셀 업로드 영역 */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <h2 className="text-lg font-semibold">엑셀 업로드</h2>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {channels.length === 0 && (
              <option value="">채널을 먼저 등록해주세요</option>
            )}
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
          {isRocketGrowth && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                판매 날짜
              </label>
              <input
                type="date"
                value={salesDate}
                onChange={(e) => setSalesDate(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
        <UploadZone
          channelId={selectedChannel}
          channelCode={selectedChannelCode}
          salesDate={isRocketGrowth ? salesDate : undefined}
          onUploadComplete={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      {/* 주문/판매 목록 */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {isRocketGrowth ? (
          <DailySalesTable channelId={selectedChannel} refreshKey={refreshKey} />
        ) : (
          <OrderTable channelId={selectedChannel} refreshKey={refreshKey} />
        )}
      </div>
    </div>
  );
}
