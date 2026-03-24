'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Plus } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Toaster, toast } from 'sonner';

type Channel = {
  id: string;
  name: string;
  code: string;
  feeRate: string;
  isActive: boolean;
  _count: { orders: number; dailySales: number };
};

export default function ChannelsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [feeRate, setFeeRate] = useState('');

  // 편집 다이얼로그
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [editName, setEditName] = useState('');
  const [editFeeRate, setEditFeeRate] = useState('');

  const { data: channels = [], isLoading: loading } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await fetch('/api/channels');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; code: string; feeRate: number }) => {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '등록 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('채널이 등록되었습니다');
      setName('');
      setCode('');
      setFeeRate('');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/channels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('저장 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
    onError: () => {
      toast.error('처리 중 오류가 발생했습니다');
    },
  });

  const saving = updateMutation.isPending;

  const openEdit = (ch: Channel) => {
    setEditChannel(ch);
    setEditName(ch.name);
    setEditFeeRate(String(ch.feeRate));
  };

  const handleCreate = () => {
    if (!name || !code) {
      toast.error('채널명과 코드를 입력해주세요');
      return;
    }
    createMutation.mutate({
      name,
      code: code.toUpperCase(),
      feeRate: parseFloat(feeRate) || 0,
    });
  };

  const handleSave = () => {
    if (!editChannel) return;
    updateMutation.mutate(
      { id: editChannel.id, body: { name: editName, feeRate: parseFloat(editFeeRate) || 0 } },
      {
        onSuccess: () => {
          toast.success('채널 정보가 수정되었습니다');
          setEditChannel(null);
        },
      },
    );
  };

  const handleToggleActive = () => {
    if (!editChannel) return;
    updateMutation.mutate(
      { id: editChannel.id, body: { isActive: !editChannel.isActive } },
      {
        onSuccess: () => {
          toast.success(editChannel.isActive ? '채널이 비활성화되었습니다' : '채널이 활성화되었습니다');
          setEditChannel(null);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <ProgressBar loading={loading} />
      <Toaster richColors position="top-right" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">채널 관리</h1>
          <p className="text-sm text-muted-foreground">
            판매 채널을 등록하고 관리합니다. 카드를 클릭하여 정보를 수정하세요.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          채널 추가
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-lg font-semibold">새 채널 등록</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                placeholder="6.0"
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
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-4 w-32" />
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div>
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          ))
        ) : channels.length === 0 ? (
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
              onClick={() => openEdit(ch)}
              className="cursor-pointer rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
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
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">수수료율</span>
                  <p className="font-mono font-medium">{ch.feeRate}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">총 주문수</span>
                  <p className="font-mono font-medium">
                    {ch._count.orders + ch._count.dailySales}건
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 채널 편집 다이얼로그 */}
      <Dialog
        open={!!editChannel}
        onOpenChange={(open) => !open && setEditChannel(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>채널 정보 수정</DialogTitle>
          </DialogHeader>
          {editChannel && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">채널 코드</p>
                <p className="font-mono text-sm font-medium">
                  {editChannel.code}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">채널명</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">수수료율 (%)</label>
                <input
                  type="number"
                  value={editFeeRate}
                  onChange={(e) => setEditFeeRate(e.target.value)}
                  step="0.1"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">총 주문수: </span>
                <span className="font-mono font-medium">
                  {editChannel._count.orders + editChannel._count.dailySales}건
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleToggleActive}
                  disabled={saving}
                  className={`rounded-lg px-3 py-2 text-sm disabled:opacity-50 ${
                    editChannel.isActive
                      ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
                      : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950'
                  }`}
                >
                  {editChannel.isActive ? '비활성화' : '활성화'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditChannel(null)}
                    className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
