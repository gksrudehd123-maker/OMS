'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  TrendingUp,
  Megaphone,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';

const MonthlyDailyChart = dynamic(
  () =>
    import('@/components/charts/monthly-charts').then(
      (m) => m.MonthlyDailyChart,
    ),
  { loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

const ChannelSalesChart = dynamic(
  () =>
    import('@/components/charts/monthly-charts').then(
      (m) => m.ChannelSalesChart,
    ),
  { loading: () => <Skeleton className="h-[260px] w-full rounded-lg" /> },
);

const ChannelAdCostChart = dynamic(
  () =>
    import('@/components/charts/monthly-charts').then(
      (m) => m.ChannelAdCostChart,
    ),
  { loading: () => <Skeleton className="h-[260px] w-full rounded-lg" /> },
);

type BrandChannel = {
  channelName: string;
  total: number;
  categories: { category: string; quantity: number }[];
};

type BrandSales = {
  brand: string;
  total: number;
  channels: BrandChannel[];
};

type MonthlyData = {
  year: number;
  month: number;
  hasData: boolean;
  kpi: {
    totalSales: number;
    totalMargin?: number;
    totalAdCost?: number;
    totalOrders: number;
  };
  channelNames: string[];
  dailyData: (Record<string, unknown> & { date: string; day: number })[];
  channelSales: { name: string; sales: number; margin: number; marginRate: number; orders: number }[];
  channelAdCosts: { name: string; cost: number }[];
  brandSales: BrandSales[];
};

function getInitialMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function MonthlySalesTab() {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [autoFallback, setAutoFallback] = useState(false);

  const { data, isLoading: loading } = useQuery<MonthlyData>({
    queryKey: ['dashboard-monthly', selectedMonth.year, selectedMonth.month],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: String(selectedMonth.year),
        month: String(selectedMonth.month),
      });
      const res = await fetch(`/api/dashboard/monthly?${params}`);
      return res.json();
    },
  });

  // 당월 데이터가 없으면 전월로 자동 전환 (1회만)
  useEffect(() => {
    if (data && !data.hasData && !autoFallback) {
      setAutoFallback(true);
      const prev =
        selectedMonth.month === 1
          ? { year: selectedMonth.year - 1, month: 12 }
          : { year: selectedMonth.year, month: selectedMonth.month - 1 };
      setSelectedMonth(prev);
    }
  }, [data, autoFallback, selectedMonth]);

  const goToPrevMonth = () => {
    setAutoFallback(true);
    setSelectedMonth((prev) =>
      prev.month === 1
        ? { year: prev.year - 1, month: 12 }
        : { year: prev.year, month: prev.month - 1 },
    );
  };

  const goToNextMonth = () => {
    setAutoFallback(true);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    // 미래 월은 이동 불가
    if (
      selectedMonth.year === currentYear &&
      selectedMonth.month >= currentMonth
    )
      return;
    setSelectedMonth((prev) =>
      prev.month === 12
        ? { year: prev.year + 1, month: 1 }
        : { year: prev.year, month: prev.month + 1 },
    );
  };

  const isCurrentMonth = (() => {
    const now = new Date();
    return (
      selectedMonth.year === now.getFullYear() &&
      selectedMonth.month === now.getMonth() + 1
    );
  })();

  const kpi = data?.kpi;

  const kpiCards = [
    {
      label: '월 매출',
      value: kpi ? `₩${kpi.totalSales.toLocaleString()}` : '-',
      icon: ShoppingCart,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: '월 마진',
      value:
        kpi?.totalMargin !== undefined
          ? `₩${kpi.totalMargin.toLocaleString()}`
          : '-',
      icon: TrendingUp,
      color:
        kpi && kpi.totalMargin !== undefined && kpi.totalMargin >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        kpi && kpi.totalMargin !== undefined && kpi.totalMargin >= 0
          ? 'bg-green-50 dark:bg-green-950'
          : 'bg-red-50 dark:bg-red-950',
    },
    {
      label: '총 광고비',
      value:
        kpi?.totalAdCost !== undefined
          ? `₩${kpi.totalAdCost.toLocaleString()}`
          : '-',
      icon: Megaphone,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      label: '총 주문건수',
      value: kpi ? `${kpi.totalOrders.toLocaleString()}건` : '-',
      icon: Package,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
  ];

  return (
    <div className="space-y-6">
      <ProgressBar loading={loading} />

      {/* 월 선택기 */}
      <div className="flex items-center gap-3">
        <button
          onClick={goToPrevMonth}
          className="rounded-lg border border-border p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[120px] text-center text-lg font-semibold">
          {selectedMonth.year}년 {selectedMonth.month}월
        </span>
        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className="rounded-lg border border-border p-2 hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="mt-3 h-8 w-28" />
              </div>
            ))
          : kpiCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {card.label}
                  </span>
                  <div className={`rounded-lg p-2 ${card.bgColor}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-mono text-xl font-semibold sm:text-2xl">
                    {card.value}
                  </span>
                </div>
              </div>
            ))}
      </div>

      {/* 일별 매출 그래프 */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">일별 매출</h2>
        {loading ? (
          <Skeleton className="mt-4 h-72 w-full rounded-lg" />
        ) : (
          <MonthlyDailyChart
            data={data?.dailyData || []}
            channelNames={data?.channelNames || []}
          />
        )}
      </div>

      {/* 채널별 매출 + 채널별 광고비 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">채널별 매출</h2>
          {loading ? (
            <Skeleton className="mt-4 h-[260px] w-full rounded-lg" />
          ) : (
            <>
              <ChannelSalesChart data={data?.channelSales || []} />
              {(data?.channelSales?.length ?? 0) > 0 && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-2.5 text-left font-medium">채널</th>
                        <th className="px-4 py-2.5 text-right font-medium">매출</th>
                        <th className="px-4 py-2.5 text-right font-medium">마진</th>
                        <th className="px-4 py-2.5 text-center font-medium">마진율</th>
                        <th className="px-4 py-2.5 text-right font-medium">주문수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.channelSales.map((ch) => (
                        <tr key={ch.name} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-medium">{ch.name}</td>
                          <td className="px-4 py-2.5 text-right font-mono">₩{ch.sales.toLocaleString()}</td>
                          <td className={`px-4 py-2.5 text-right font-mono ${ch.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            ₩{ch.margin.toLocaleString()}
                          </td>
                          <td className={`px-4 py-2.5 text-center font-mono ${ch.marginRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {ch.marginRate.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">{ch.orders.toLocaleString()}건</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">채널별 광고비</h2>
          {loading ? (
            <Skeleton className="mt-4 h-[260px] w-full rounded-lg" />
          ) : (
            <ChannelAdCostChart data={data?.channelAdCosts || []} />
          )}
        </div>
      </div>

      {/* 브랜드별 판매 갯수 */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">브랜드별 판매 갯수</h2>
        {loading ? (
          <Skeleton className="mt-4 h-40 w-full rounded-lg" />
        ) : !data?.brandSales || data.brandSales.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            분류된 상품이 없습니다. 상품관리에서 브랜드 분류를 진행해주세요.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.brandSales.map((bs) => (
              <div
                key={bs.brand}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{bs.brand}</span>
                  <span className="font-mono text-lg font-bold text-primary">
                    {bs.total.toLocaleString()}개
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {bs.channels.map((ch) => (
                    <div key={ch.channelName}>
                      <div className="flex items-center justify-between text-sm font-medium border-b border-border pb-1 mb-1.5">
                        <span className="text-muted-foreground">
                          {ch.channelName}
                        </span>
                        <span className="font-mono">
                          {ch.total.toLocaleString()}개
                        </span>
                      </div>
                      <div className="space-y-1 pl-3">
                        {ch.categories.map((cat) => (
                          <div
                            key={cat.category}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {cat.category}
                            </span>
                            <span className="font-mono">
                              {cat.quantity.toLocaleString()}개
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 잡비용 (준비 중) */}
      <div className="rounded-xl border border-dashed border-border bg-card p-8 sm:p-10">
        <h2 className="text-lg font-semibold text-muted-foreground">
          잡비용 (마케팅 비용)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          문자 비용 등 외부 데이터 연동 - 준비 중
        </p>
      </div>
    </div>
  );
}
