'use client';

import { useEffect, useState } from 'react';
import { UploadZone } from '@/components/sales/upload-zone';
import { OrderTable } from '@/components/sales/order-table';
import { Toaster } from 'sonner';

type Channel = {
  id: string;
  name: string;
  code: string;
};

export default function SalesPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data) => {
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0].id);
      });
  }, []);

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />
      <div>
        <h1 className="text-2xl font-semibold">매출 관리</h1>
        <p className="text-sm text-muted-foreground">
          엑셀 파일을 업로드하여 주문 데이터를 관리합니다
        </p>
      </div>

      {/* 업로드 영역 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-4">
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
        </div>
        <UploadZone
          channelId={selectedChannel}
          onUploadComplete={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      {/* 주문 목록 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <OrderTable refreshKey={refreshKey} />
      </div>
    </div>
  );
}
