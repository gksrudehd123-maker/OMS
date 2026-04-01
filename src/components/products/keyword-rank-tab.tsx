'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Loader2,
  ExternalLink,
  Crown,
  Trophy,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const RankChart = dynamic(
  () => import('./rank-chart').then((m) => m.RankChart),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> },
);

const AllKeywordsChart = dynamic(
  () => import('./rank-chart').then((m) => m.AllKeywordsChart),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> },
);

type Product = { id: string; name: string };

type KeywordData = {
  id: string;
  keyword: string;
  isMain: boolean;
  latestRank: number | null;
  latestPage: number | null;
  latestDate: string | null;
  change: number | null;
  createdAt: string;
};

type KeywordsResponse = {
  product: { name: string; thumbnailUrl: string | null };
  keywords: KeywordData[];
};

// 순위에 따른 색상/스타일
function getRankStyle(rank: number | null) {
  if (rank === null)
    return {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-400',
      label: '100위 밖',
    };
  if (rank <= 10)
    return {
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      label: 'TOP 10',
    };
  if (rank <= 30)
    return {
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      label: 'TOP 30',
    };
  if (rank <= 50)
    return {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30',
      text: 'text-green-600 dark:text-green-400',
      label: 'TOP 50',
    };
  return {
    bg: 'bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50',
    text: 'text-gray-500 dark:text-gray-400',
    label: '',
  };
}

function RankCard({
  kw,
  selected,
  checking,
  onClick,
  onCheck,
  onDelete,
  onSetMain,
}: {
  kw: KeywordData;
  selected: boolean;
  checking: boolean;
  onClick: () => void;
  onCheck: () => void;
  onDelete: () => void;
  onSetMain: () => void;
}) {
  const style = getRankStyle(kw.latestRank);
  const pct = kw.latestRank !== null ? Math.max(0, 100 - kw.latestRank) : 0;

  return (
    <div
      className={`group relative rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
        selected
          ? 'border-primary shadow-md'
          : 'border-transparent hover:border-primary/20'
      } ${style.bg}`}
      onClick={onClick}
    >
      {/* 상단: 키워드명 + 액션 */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetMain();
              }}
              className={`rounded p-0.5 transition-colors ${
                kw.isMain
                  ? 'text-yellow-500'
                  : 'text-gray-300 hover:text-yellow-400 dark:text-gray-600 dark:hover:text-yellow-400'
              }`}
              title={kw.isMain ? '메인 키워드 해제' : '메인 키워드로 설정'}
            >
              <Star
                className={`h-4 w-4 ${kw.isMain ? 'fill-yellow-500' : ''}`}
              />
            </button>
            <p className="text-sm font-semibold truncate">{kw.keyword}</p>
          </div>
          {kw.latestDate && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(kw.latestDate).toLocaleDateString('ko-KR')} 기준
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCheck();
            }}
            disabled={checking}
            className="rounded-lg p-1.5 bg-white/70 dark:bg-white/10 text-foreground hover:bg-white dark:hover:bg-white/20 disabled:opacity-50 border border-border/50"
            title="순위 조회"
          >
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-lg p-1.5 bg-white/70 dark:bg-white/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 border border-border/50"
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 중앙: 순위 크게 */}
      <div className="mt-3 flex items-end gap-2">
        {kw.latestRank !== null ? (
          <>
            {kw.latestRank <= 10 && (
              <Crown className={`h-5 w-5 ${style.text}`} />
            )}
            <span
              className={`font-mono text-3xl font-bold leading-none ${style.text}`}
            >
              {kw.latestRank}
            </span>
            <span className="text-sm text-muted-foreground mb-0.5">위</span>
          </>
        ) : kw.latestDate ? (
          <span className="text-lg font-medium text-muted-foreground">
            100위 밖
          </span>
        ) : (
          <span className="text-lg font-medium text-muted-foreground">
            미조회
          </span>
        )}

        {/* 변동 */}
        {kw.change !== null && kw.change !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-sm font-bold ml-auto mb-0.5 ${
              kw.change > 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {kw.change > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {kw.change > 0 ? `+${kw.change}` : kw.change}
          </span>
        )}
      </div>

      {/* 하단: 순위 바 */}
      {kw.latestRank !== null && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                kw.latestRank <= 10
                  ? 'bg-yellow-500'
                  : kw.latestRank <= 30
                    ? 'bg-blue-500'
                    : kw.latestRank <= 50
                      ? 'bg-green-500'
                      : 'bg-gray-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function KeywordRankTab() {
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['keyword-products'],
    queryFn: async () => {
      const chRes = await fetch('/api/channels');
      const channels = await chRes.json();
      const ssChannel = channels.find(
        (ch: { code: string }) =>
          ch.code === 'SMARTSTORE' || ch.code === 'smartstore',
      );
      if (!ssChannel) return [];
      const res = await fetch(
        `/api/products?channelId=${ssChannel.id}&limit=500`,
      );
      const data = await res.json();
      const raw = (data.data || []) as { id: string; name: string }[];
      const seen = new Map<string, Product>();
      for (const p of raw) {
        if (!seen.has(p.name)) seen.set(p.name, { id: p.id, name: p.name });
      }
      return Array.from(seen.values());
    },
  });

  const [selectedProductId, setSelectedProductId] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(
    null,
  );
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

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

  // 요약 통계
  const rankedKeywords = keywords.filter((k) => k.latestRank !== null);
  const avgRank =
    rankedKeywords.length > 0
      ? Math.round(
          rankedKeywords.reduce((sum, k) => sum + (k.latestRank ?? 0), 0) /
            rankedKeywords.length,
        )
      : null;
  const bestKeyword =
    rankedKeywords.length > 0
      ? rankedKeywords.reduce((best, k) =>
          (k.latestRank ?? 999) < (best.latestRank ?? 999) ? k : best,
        )
      : null;

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          keyword: newKeyword.trim(),
        }),
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
      queryClient.invalidateQueries({
        queryKey: ['keywords', selectedProductId],
      });
      queryClient.invalidateQueries({ queryKey: ['keyword-history'] });
      queryClient.invalidateQueries({ queryKey: ['all-keyword-history'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setMainMutation = useMutation({
    mutationFn: async ({ id, isMain }: { id: string; isMain: boolean }) => {
      const res = await fetch(`/api/keywords/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMain }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '설정 실패');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.isMain
          ? '메인 키워드로 설정되었습니다'
          : '메인 키워드가 해제되었습니다',
      );
      queryClient.invalidateQueries({
        queryKey: ['keywords', selectedProductId],
      });
      queryClient.invalidateQueries({ queryKey: ['ad-budgets'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/keywords/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('키워드가 삭제되었습니다');
      setSelectedKeywordId(null);
      queryClient.invalidateQueries({
        queryKey: ['keywords', selectedProductId],
      });
      queryClient.invalidateQueries({ queryKey: ['keyword-history'] });
      queryClient.invalidateQueries({ queryKey: ['all-keyword-history'] });
    },
  });

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
      toast.success(
        data.rank
          ? `${data.rank}위 (${data.page}페이지)`
          : '100위 안에 없습니다',
      );
      queryClient.invalidateQueries({
        queryKey: ['keywords', selectedProductId],
      });
      queryClient.invalidateQueries({ queryKey: ['keyword-history'] });
      queryClient.invalidateQueries({ queryKey: ['all-keyword-history'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '조회 실패');
    } finally {
      setCheckingId(null);
    }
  };

  const checkAllRanks = async () => {
    setCheckingAll(true);
    for (const kw of keywords) {
      setCheckingId(kw.id);
      try {
        const res = await fetch('/api/keywords/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: kw.id }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(
            `"${kw.keyword}" ${data.rank ? `${data.rank}위` : '100위 밖'}`,
          );
        }
      } catch {
        /* skip */
      }
      setCheckingId(null);
    }
    queryClient.invalidateQueries({
      queryKey: ['keywords', selectedProductId],
    });
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
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {selectedProductId && (
        <>
          {/* 상품 카드 — 썸네일 + 요약 정보 */}
          {productInfo && (
            <div className="flex gap-4 rounded-xl border border-border bg-gradient-to-r from-card to-muted/30 p-5">
              {productInfo.thumbnailUrl ? (
                <img
                  src={productInfo.thumbnailUrl}
                  alt={productInfo.name}
                  className="h-20 w-20 rounded-xl object-cover border border-border shadow-sm shrink-0"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted border border-border shrink-0">
                  <Search className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate">
                  {productInfo.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    키워드{' '}
                    <span className="font-mono font-bold text-foreground">
                      {keywords.length}
                    </span>
                    개
                  </span>
                  {avgRank !== null && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      평균 순위{' '}
                      <span className="font-mono font-bold text-foreground">
                        {avgRank}
                      </span>
                      위
                    </span>
                  )}
                  {bestKeyword && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Trophy className="h-3 w-3 text-yellow-500" />
                      최고{' '}
                      <span className="font-medium text-foreground">
                        &quot;{bestKeyword.keyword}&quot;
                      </span>
                      <span className="font-mono font-bold text-yellow-600 dark:text-yellow-400">
                        {bestKeyword.latestRank}위
                      </span>
                    </span>
                  )}
                </div>
              </div>
              {keywords.length > 0 && (
                <button
                  onClick={checkAllRanks}
                  disabled={checkingAll || checkingId !== null}
                  className="flex items-center gap-1.5 self-start rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0"
                >
                  {checkingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
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
              onKeyDown={(e) =>
                e.key === 'Enter' && newKeyword.trim() && addMutation.mutate()
              }
              placeholder="추적할 키워드 입력 (예: 온열복대, 허리찜질기)"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => addMutation.mutate()}
              disabled={!newKeyword.trim() || addMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>

          {/* 키워드 카드 그리드 */}
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : keywords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-5">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium">등록된 키워드가 없습니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                키워드를 추가하고 네이버 쇼핑 검색 순위를 추적하세요
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {keywords.map((kw) => (
                <RankCard
                  key={kw.id}
                  kw={kw}
                  selected={selectedKeywordId === kw.id}
                  checking={checkingId === kw.id}
                  onClick={() =>
                    setSelectedKeywordId(
                      kw.id === selectedKeywordId ? null : kw.id,
                    )
                  }
                  onCheck={() => checkRank(kw.id)}
                  onSetMain={() =>
                    setMainMutation.mutate({ id: kw.id, isMain: !kw.isMain })
                  }
                  onDelete={() => {
                    if (confirm(`"${kw.keyword}" 키워드를 삭제하시겠습니까?`))
                      deleteMutation.mutate(kw.id);
                  }}
                />
              ))}
            </div>
          )}

          {/* 전체 키워드 추이 차트 (항상 표시) */}
          {keywords.length > 0 && rankedKeywords.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">전체 키워드 순위 추이</h3>
                <span className="text-xs text-muted-foreground">최근 30일</span>
              </div>
              <AllKeywordsChart
                keywords={keywords.map((k) => ({
                  id: k.id,
                  keyword: k.keyword,
                }))}
              />
            </div>
          )}

          {/* 선택된 키워드 상세 차트 */}
          {selectedKeywordId && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  &quot;
                  {keywords.find((k) => k.id === selectedKeywordId)?.keyword}
                  &quot; 순위 추이
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
