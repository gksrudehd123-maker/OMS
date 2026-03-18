'use client';

import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Plus, Trash2, Megaphone } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';

type Channel = {
  id: string;
  name: string;
  code: string;
};

type AdCost = {
  id: string;
  date: string;
  cost: string;
  memo: string | null;
  channel: Channel;
};

export default function AdCostsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [adCosts, setAdCosts] = useState<AdCost[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  // 필터
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterChannel, setFilterChannel] = useState('');

  // 입력 폼
  const [formChannel, setFormChannel] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formMemo, setFormMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data) => {
        setChannels(data);
        if (data.length > 0) setFormChannel(data[0].id);
      });

    // 기본 필터: 이번 달
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setFilterFrom(firstDay.toISOString().split('T')[0]);
    setFilterTo(now.toISOString().split('T')[0]);
    setFormDate(now.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    fetchAdCosts();
  }, [filterFrom, filterTo, filterChannel]);

  const fetchAdCosts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    if (filterChannel) params.set('channelId', filterChannel);

    fetch(`/api/ad-costs?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setAdCosts(data.adCosts);
        setTotalCost(data.totalCost);
      })
      .finally(() => setLoading(false));
  };

  const handleSubmit = async () => {
    if (!formChannel || !formDate || !formCost) {
      toast.error('채널, 날짜, 광고비를 모두 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/ad-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: formChannel,
          date: formDate,
          cost: formCost,
          memo: formMemo || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || '저장 실패');
        return;
      }

      toast.success('광고비가 저장되었습니다');
      setFormCost('');
      setFormMemo('');
      fetchAdCosts();
    } catch {
      toast.error('저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 광고비 내역을 삭제하시겠습니까?')) return;

    const res = await fetch(`/api/ad-costs?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('삭제되었습니다');
      fetchAdCosts();
    } else {
      toast.error('삭제 실패');
    }
  };

  return (
    <div className="space-y-6">
      <ProgressBar loading={loading} />
      <Toaster richColors position="top-right" />
      <div>
        <h1 className="text-2xl font-semibold">광고비 관리</h1>
        <p className="text-sm text-muted-foreground">
          채널별 일일 광고비를 입력하면 마진 계산에 자동 반영됩니다
        </p>
      </div>

      {/* 광고비 입력 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">광고비 입력</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          같은 채널+날짜에 이미 등록된 광고비가 있으면 자동으로 수정됩니다
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              채널
            </label>
            <select
              value={formChannel}
              onChange={(e) => setFormChannel(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              날짜
            </label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              광고비 (원)
            </label>
            <input
              type="number"
              value={formCost}
              onChange={(e) => setFormCost(e.target.value)}
              placeholder="0"
              className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              메모 (선택)
            </label>
            <input
              type="text"
              value={formMemo}
              onChange={(e) => setFormMemo(e.target.value)}
              placeholder="네이버 검색광고 등"
              className="w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? '저장 중...' : '등록'}
          </button>
        </div>
      </div>

      {/* 광고비 내역 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">광고비 내역</h2>
          <div className="flex items-center gap-3">
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">전체 채널</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">~</span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* 합계 */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-orange-50 p-3 dark:bg-orange-950">
          <Megaphone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span className="text-sm font-medium">
            기간 총 광고비: ₩{totalCost.toLocaleString()}
          </span>
        </div>

        {/* 테이블 */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">날짜</th>
                <th className="px-4 py-3 text-left font-medium">채널</th>
                <th className="px-4 py-3 text-right font-medium">광고비</th>
                <th className="px-4 py-3 text-left font-medium">메모</th>
                <th className="px-4 py-3 text-center font-medium">삭제</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : adCosts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    등록된 광고비가 없습니다
                  </td>
                </tr>
              ) : (
                adCosts.map((ac) => (
                  <tr
                    key={ac.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {new Date(ac.date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">{ac.channel.name}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      ₩{Number(ac.cost).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ac.memo || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(ac.id)}
                        className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
