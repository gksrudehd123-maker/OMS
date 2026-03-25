'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const RankChart = dynamic(
  () => import('./rank-chart').then((m) => m.RankChart),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> },
);

type Product = {
  id: string;
  name: string;
  optionInfo: string;
};

type KeywordData = {
  id: string;
  keyword: string;
  latestRank: number | null;
  latestPage: number | null;
  latestDate: string | null;
  change: number | null;
  createdAt: string;
};

export function KeywordRankTab({ products }: { products: Product[] }) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // 키워드 목록
  const { data: keywords = [], isLoading } = useQuery<KeywordData[]>({
    queryKey: ['keywords', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const res = await fetch(`/api/keywords?productId=${selectedProductId}`);
      return res.json();
    },
    enabled: !!selectedProductId,
  });

  // 키워드 추가
  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId, keyword: newKeyword.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '등록 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('키워드가 등록되었습니다');
      setNewKeyword('');
      queryClient.invalidateQueries({ queryKey: ['keywords', selectedProductId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // 키워드 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/keywords/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('키워드가 삭제되었습니다');
      if (selectedKeywordId) setSelectedKeywordId(null);
      queryClient.invalidateQueries({ queryKey: ['keywords', selectedProductId] });
    },
  });

  // 순위 조회
  const checkRank = async (keywordId: string) => {
    setCheckingId(keywordId);
    try {
      const res = await fetch('/api/keywords/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.rank) {
        toast.success(`${data.rank}위 (${data.page}페이지)`);
      } else {
        toast.info('100위 안에 없습니다');
      }
      queryClient.invalidateQueries({ queryKey: ['keywords', selectedProductId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '조회 실패');
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 상품 선택 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={selectedProductId}
          onChange={(e) => {
            setSelectedProductId(e.target.value);
            setSelectedKeywordId(null);
          }}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">상품을 선택하세요</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.optionInfo ? ` (${p.optionInfo})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedProductId && (
        <>
          {/* 키워드 추가 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newKeyword.trim() && addMutation.mutate()}
              placeholder="추적할 키워드 입력 (예: 남성 반팔티)"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => addMutation.mutate()}
              disabled={!newKeyword.trim() || addMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>

          {/* 키워드 목록 + 순위 */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : keywords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                등록된 키워드가 없습니다
              </p>
              <p className="text-xs text-muted-foreground">
                키워드를 추가하면 네이버 쇼핑 검색 순위를 추적할 수 있습니다
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors cursor-pointer ${
                    selectedKeywordId === kw.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedKeywordId(kw.id === selectedKeywordId ? null : kw.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{kw.keyword}</span>
                    {kw.latestRank !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-mono font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {kw.latestRank}위
                        </span>
                        {kw.change !== null && kw.change !== 0 && (
                          <span className={`flex items-center text-xs font-medium ${
                            kw.change > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {kw.change > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                            {kw.change > 0 ? `▲${kw.change}` : `▼${Math.abs(kw.change)}`}
                          </span>
                        )}
                        {kw.change === 0 && (
                          <span className="flex items-center text-xs text-muted-foreground">
                            <Minus className="h-3 w-3 mr-0.5" />변동없음
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {kw.latestDate ? '100위 밖' : '미조회'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); checkRank(kw.id); }}
                      disabled={checkingId === kw.id}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                      title="순위 조회"
                    >
                      {checkingId === kw.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`"${kw.keyword}" 키워드를 삭제하시겠습니까?`)) {
                          deleteMutation.mutate(kw.id);
                        }
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                      title="키워드 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 순위 추이 차트 */}
          {selectedKeywordId && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-2">순위 추이 (최근 30일)</h3>
              <RankChart keywordId={selectedKeywordId} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
