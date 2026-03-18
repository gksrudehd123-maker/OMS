'use client';

import { useEffect, useState } from 'react';
import { Store, Plus } from 'lucide-react';
import { Toaster, toast } from 'sonner';

type Channel = {
  id: string;
  name: string;
  code: string;
  feeRate: string;
  isActive: boolean;
  _count: { orders: number };
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [feeRate, setFeeRate] = useState('');

  const fetchChannels = () => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then(setChannels);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleCreate = async () => {
    if (!name || !code) {
      toast.error('채널명과 코드를 입력해주세요');
      return;
    }

    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        code: code.toUpperCase(),
        feeRate: parseFloat(feeRate) || 0,
      }),
    });

    if (res.ok) {
      toast.success('채널이 등록되었습니다');
      setName('');
      setCode('');
      setFeeRate('');
      setShowForm(false);
      fetchChannels();
    } else {
      const err = await res.json();
      toast.error(err.error || '등록 실패');
    }
  };

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">채널 관리</h1>
          <p className="text-sm text-muted-foreground">
            판매 채널을 등록하고 관리합니다
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          채널 추가
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">새 채널 등록</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">채널명</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="스마트스토어"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">코드</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SMARTSTORE"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                수수료율 (%)
              </label>
              <input
                type="number"
                value={feeRate}
                onChange={(e) => setFeeRate(e.target.value)}
                placeholder="5.5"
                step="0.1"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              등록
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center">
            <Store className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              등록된 채널이 없습니다. 채널을 추가해주세요.
            </p>
          </div>
        ) : (
          channels.map((ch) => (
            <div
              key={ch.id}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{ch.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    ch.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {ch.isActive ? '활성' : '비활성'}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ch.code}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">수수료율</span>
                  <p className="font-mono font-medium">{ch.feeRate}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">총 주문수</span>
                  <p className="font-mono font-medium">{ch._count.orders}건</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
