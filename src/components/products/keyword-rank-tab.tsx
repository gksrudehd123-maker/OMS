'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Minus, Loader2, ExternalLink } from 'lucide-react';
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

type KeywordsResponse = {
  product: {
    name: string;
    thumbnailUrl: string | null;
  };
  keywords: KeywordData[];
};

function RankBadge({ rank, change }: { rank: number | null; change: number | null }) {
  if (rank === null) {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        100위 밖
      </span>
    );
  }

  const bgColor = rank <= 10
    ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
    : rank <= 30
      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
      : rank <= 50
        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-3 py-1 text-sm font-mono font-bold ${bgColor}`}>
        {rank}위
      </span>
      {change !== null && change !== 0 && (
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${
          change > 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        }`}>
          {change > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {change > 0 ? `+${change}` : change}
        </span>
      )}
      {change === 0 && (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
          <Minus className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

export function KeywordRankTab() {
  const queryClient = useQueryClient();

  // 스마트스토어 상품만 가져오기
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['keyword-products'],
    queryFn: async () => {
      const chRes = await fetch('/api/channels');
      const channels = await chRes.json();
      const ssChannel = channels.find((ch: { code: string }) =>
        ch.code === 'SMARTSTORE' || ch.code === 'smartstore'
      );
      if (!ssChannel) return [];

      const res = await fetch(`/api/products?channelId=${ssChannel.id}&limit=500`);
      const data = await res.json();
      const raw = (data.products || []) as { id: string; name: string }[];

      const seen = new Map<string, Product>();
      for (const p of raw) {
        if (!seen.has(p.name)) seen.set(p.name, { id: p.id, name: p.name });
      }
      return Array.from(seen.values());
    },
  });

  const [selectedProductId, setSelectedProductId] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  // 키워드 목록 + 상품 정보
  const { data: keywordsData, isLoading } = useQuery<KeywordsResponse>({
    queryKey: ['keywords', selectedProductId],
    queryFn: async () => {
      const res = await fetch(`/api/keywords?productId=${selectedProductId}`);
      return res.json();
    },
    enabled: !!selectedProductId,
  });

  const productInfo = keywordsData?.product;
  const keywords = keywordsData?.keywords ?? [];

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
    onError: (err: Error) => toast.error(err.message),
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

  // 개별 순위 조회
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

  // 전체 순위 조회
  const checkAllRanks = async () => {
    setCheckingAll(true);
    for (const kw of keywords) {
      await checkRank(kw.id);
    }
    setCheckingAll(false);
  };

  return (
    <div className="space-y-5">
      {/* 상품 선택 */}
      <select
        value={selectedProductId}
        onChange={(e) => {
          setSelectedProductId(e.target.value);
          setSelectedKeywordId(null);
        }}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">상품을 선택하세요</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {selectedProductId && (
        <>
          {/* 상품 카드 (썸네일 + 상품명) */}
          {productInfo && (
            <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
              {productInfo.thumbnailUrl ? (
                <img
                  src={productInfo.thumbnailUrl}
                  alt={productInfo.name}
                  className="h-16 w-16 rounded-lg object-cover border border-border"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted border border-border">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{productInfo.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  등록 키워드 {keywords.length}개
                  {keywords.filter((k) => k.latestRank !== null).length > 0 &&
                    ` · 순위 확인 ${keywords.filter((k) => k.latestRank !== null).length}개`
                  }
                </p>
              </div>
              {keywords.length > 0 && (
                <button
                  onClick={checkAllRanks}
                  disabled={checkingAll || checkingId !== null}
                  className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
                >
                  {checkingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  전체 조회
                </button>
              )}
            </div>
          )}

          {/* 키워드 추가 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newKeyword.trim() && addMutation.mutate()}
              placeholder="추적할 키워드 입력 (예: 온열복대, 허리찜질기)"
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

          {/* 키워드 순위 목록 */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : keywords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium">등록된 키워드가 없습니다</p>
              <p className="mt-1 text-xs text-muted-foreground">
                키워드를 추가하면 네이버 쇼핑 검색 순위를 추적할 수 있습니다
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  className={`group flex items-center justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                    selectedKeywordId === kw.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30 hover:bg-muted/30'
                  }`}
                  onClick={() => setSelectedKeywordId(kw.id === selectedKeywordId ? null : kw.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{kw.keyword}</p>
                      {kw.latestDate && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(kw.latestDate).toLocaleDateString('ko-KR')} 기준
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {kw.latestDate ? (
                      <RankBadge rank={kw.latestRank} change={kw.change} />
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        미조회
                      </span>
                    )}

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                </div>
              ))}
            </div>
          )}

          {/* 순위 추이 차트 */}
          {selectedKeywordId && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  순위 추이 — {keywords.find((k) => k.id === selectedKeywordId)?.keyword}
                </h3>
                <a
                  href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keywords.find((k) => k.id === selectedKeywordId)?.keyword || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  네이버 쇼핑에서 보기
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <RankChart keywordId={selectedKeywordId} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
