'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Search, Trophy, Trash2, TrendingUp, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';

const RankChart = dynamic(
  () => import('@/components/products/rank-chart').then((m) => m.RankChart),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> },
);

const AllKeywordsChart = dynamic(
  () => import('@/components/products/rank-chart').then((m) => m.AllKeywordsChart),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> },
);

type KeywordRank = {
  id: string;
  rank: number | null;
  page: number | null;
  date: string;
};

type Keyword = {
  id: string;
  keyword: string;
  isMain: boolean;
  ranks: KeywordRank[];
};

type BudgetProduct = {
  id: string;
  name: string;
  optionInfo: string;
  costPrice: string | null;
  sellingPrice: string | null;
  feeRate: string | null;
  shippingCost: string;
  thumbnailUrl: string | null;
  keywords: Keyword[];
};

type BudgetChannel = {
  id: string;
  name: string;
  code: string;
  feeRate: string;
};

type AdBudget = {
  id: string;
  month: string;
  adCost: string;
  memo: string | null;
  channelId: string;
  productId: string;
  channel: BudgetChannel;
  product: BudgetProduct;
  actualQuantity: number;
};

function calculateUnitMargin(product: BudgetProduct, channel: BudgetChannel): number {
  const sellingPrice = Number(product.sellingPrice) || 0;
  const costPrice = Number(product.costPrice) || 0;
  const feeRate = Number(product.feeRate) || Number(channel.feeRate) || 0;
  if (!sellingPrice || !costPrice) return 0;
  const fee = Math.round(sellingPrice * (feeRate / 100));
  return sellingPrice - costPrice - fee;
}

function getAchievementColor(rate: number): string {
  if (rate >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 70) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

// 상품별로 예산 데이터 그룹화
function groupByProduct(budgets: AdBudget[]): Map<string, AdBudget[]> {
  const map = new Map<string, AdBudget[]>();
  for (const b of budgets) {
    const key = `${b.productId}_${b.channelId}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  return map;
}

function ProductCard({
  budgets,
  month,
  onDelete,
}: {
  budgets: AdBudget[];
  month: string;
  onDelete: (id: string) => void;
}) {
  const [keywordOpen, setKeywordOpen] = useState(false);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);

  const latest = budgets[0];
  const product = latest.product;
  const channel = latest.channel;
  const keywords = product.keywords;

  // 메인 키워드
  const mainKeyword = keywords.find((k) => k.isMain);

  // 키워드 요약 통계
  const rankedKeywords = keywords.filter((k) => {
    const latestRank = k.ranks[0];
    return latestRank?.rank !== null && latestRank?.rank !== undefined;
  });
  const avgRank = rankedKeywords.length > 0
    ? Math.round(
        rankedKeywords.reduce((sum, k) => sum + (k.ranks[0]?.rank ?? 0), 0) / rankedKeywords.length,
      )
    : null;
  const bestKeyword = rankedKeywords.length > 0
    ? rankedKeywords.reduce((best, k) =>
        (k.ranks[0]?.rank ?? 999) < (best.ranks[0]?.rank ?? 999) ? k : best,
      )
    : null;

  // 광고비 / 달성률 계산
  const adCost = Number(latest.adCost);
  const unitMargin = calculateUnitMargin(product, channel);
  const breakEvenQty = unitMargin > 0 ? Math.ceil(adCost / unitMargin) : 0;
  const achievementRate = breakEvenQty > 0
    ? Math.round((latest.actualQuantity / breakEvenQty) * 1000) / 10
    : 0;
  const progressPct = Math.min(achievementRate, 100);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* 상품 카드 헤더 */}
      <div className="flex gap-5 p-6">
        {product.thumbnailUrl ? (
          <img
            src={product.thumbnailUrl}
            alt={product.name}
            className="h-24 w-24 rounded-xl object-cover border border-border shadow-sm shrink-0"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-muted border border-border shrink-0">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg truncate">{product.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{channel.name}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              키워드 <span className="font-mono font-bold text-foreground">{keywords.length}</span>개
            </span>
            {avgRank !== null && (
              <span className="flex items-center gap-1 text-muted-foreground">
                평균 순위 <span className="font-mono font-bold text-foreground">{avgRank}</span>위
              </span>
            )}
            {bestKeyword && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Trophy className="h-4 w-4 text-yellow-500" />
                최고 <span className="font-medium text-foreground">"{bestKeyword.keyword}"</span>
                <span className="font-mono font-bold text-yellow-600 dark:text-yellow-400">
                  {bestKeyword.ranks[0]?.rank}위
                </span>
              </span>
            )}
          </div>
        </div>

        {/* 광고비 + 달성률 */}
        <div className="shrink-0 text-right min-w-[140px]">
          <button
            onClick={() => onDelete(latest.id)}
            className="mb-1 ml-auto block rounded p-1 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <p className="text-xs text-muted-foreground">광고비</p>
          <p className="text-2xl font-bold font-mono">₩{adCost.toLocaleString()}</p>
          {breakEvenQty > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">달성률</span>
                <span className={`font-bold ${getAchievementColor(achievementRate)}`}>
                  {achievementRate}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    achievementRate >= 100
                      ? 'bg-emerald-500'
                      : achievementRate >= 70
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground text-right">
                {latest.actualQuantity}개 / {breakEvenQty}개
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 지표 카드 */}
      {unitMargin > 0 && (
        <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
          <div className="bg-card px-4 py-3 text-center">
            <p className="text-[10px] font-medium text-muted-foreground">개당 순이익</p>
            <p className="mt-0.5 text-lg font-bold font-mono text-primary">
              ₩{unitMargin.toLocaleString()}
            </p>
          </div>
          <div className="bg-card px-4 py-3 text-center">
            <p className="text-[10px] font-medium text-muted-foreground">손익분기</p>
            <p className="mt-0.5 text-lg font-bold font-mono text-orange-600 dark:text-orange-400">
              {breakEvenQty.toLocaleString()}개
            </p>
          </div>
          <div className="bg-card px-4 py-3 text-center">
            <p className="text-[10px] font-medium text-muted-foreground">실제 판매</p>
            <p className={`mt-0.5 text-lg font-bold font-mono ${getAchievementColor(achievementRate)}`}>
              {latest.actualQuantity.toLocaleString()}개
            </p>
          </div>
        </div>
      )}

      {/* 메인 키워드 월별 순위 차트 */}
      {mainKeyword && (
        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            <h4 className="text-sm font-semibold">"{mainKeyword.keyword}" {month} 순위 추이</h4>
          </div>
          <RankChart keywordId={mainKeyword.id} month={month} />
        </div>
      )}

      {/* 드롭다운 2: 키워드 순위 추적 */}
      <div className="border-t border-border">
        <button
          onClick={() => setKeywordOpen(!keywordOpen)}
          className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <span>키워드 순위 추적</span>
          {keywordOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {keywordOpen && (
          <div className="px-5 pb-4 space-y-4">
            {keywords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  등록된 키워드가 없습니다
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  상품 관리 &gt; 키워드 순위에서 키워드를 추가해주세요
                </p>
              </div>
            ) : (
              <>
                {/* 전체 키워드 추이 차트 */}
                {rankedKeywords.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">전체 키워드 순위 추이</h4>
                      <span className="text-xs text-muted-foreground">최근 30일</span>
                    </div>
                    <AllKeywordsChart
                      keywords={keywords.map((k) => ({ id: k.id, keyword: k.keyword }))}
                    />
                  </div>
                )}

                {/* 개별 키워드 목록 */}
                <div className="space-y-2">
                  {keywords.map((kw) => {
                    const latestRank = kw.ranks[0]?.rank;
                    const isSelected = selectedKeywordId === kw.id;

                    return (
                      <div key={kw.id}>
                        <button
                          onClick={() => setSelectedKeywordId(isSelected ? null : kw.id)}
                          className={`flex w-full items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Search className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{kw.keyword}</span>
                          </div>
                          <span className="font-mono font-bold">
                            {latestRank !== null && latestRank !== undefined
                              ? `${latestRank}위`
                              : '미조회'}
                          </span>
                        </button>
                        {isSelected && (
                          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4">
                            <RankChart keywordId={kw.id} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdBudgetTab() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );

  const { data, isLoading } = useQuery<{ success: boolean; data: AdBudget[] }>({
    queryKey: ['ad-budgets', selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams({ month: selectedMonth });
      const res = await fetch(`/api/ad-budgets?${params}`);
      return res.json();
    },
  });

  const budgets = data?.data ?? [];
  const grouped = useMemo(() => groupByProduct(budgets), [budgets]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ad-budgets?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
    },
    onSuccess: () => {
      toast.success('삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['ad-budgets'] });
    },
    onError: () => {
      toast.error('삭제 실패');
    },
  });

  const handleDelete = (id: string) => {
    if (!confirm('이 광고 예산을 삭제하시겠습니까?')) return;
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-5">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="mt-4 font-medium">{selectedMonth}월 등록된 광고 예산이 없습니다</p>
          <p className="mt-1 text-sm text-muted-foreground">
            광고비 관리 &gt; 손익분기 계산기에서 상품을 추가해주세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 월 선택기 */}
      <div className="flex items-center gap-3">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {Array.from(grouped.entries()).map(([key, productBudgets]) => (
        <ProductCard
          key={key}
          budgets={productBudgets}
          month={selectedMonth}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
