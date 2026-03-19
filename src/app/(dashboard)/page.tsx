'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  TrendingUp,
  Percent,
  Package,
  Megaphone,
} from 'lucide-react';
import { DateRangeFilter } from '@/components/common/date-range-filter';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

type KPI = {
  totalSales: number;
  totalMargin: number;
  totalAdCost: number;
  avgMarginRate: number;
  totalOrders: number;
  calculableCount: number;
};

type DailyData = {
  date: string;
  sales: number;
  margin: number;
  orders: number;
};

type ChannelData = {
  name: string;
  sales: number;
  margin: number;
  marginRate: number;
  orders: number;
};

type ProductMargin = {
  name: string;
  optionInfo: string;
  label: string;
  sales: number;
  margin: number;
  marginRate: number;
  orders: number;
};

type DashboardData = {
  kpi: KPI;
  dailyData: DailyData[];
  channelData: ChannelData[];
  productMarginRank: ProductMargin[];
};

export default function DashboardPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading: loading } = useQuery<DashboardData>({
    queryKey: ['dashboard', from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/dashboard?${params}`);
      return res.json();
    },
  });

  const kpi = data?.kpi;
  const dailyData = data?.dailyData || [];

  const kpiCards = [
    {
      label: '총 매출',
      value: kpi ? `₩${kpi.totalSales.toLocaleString()}` : '-',
      icon: ShoppingCart,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: '총 마진',
      value: kpi ? `₩${kpi.totalMargin.toLocaleString()}` : '-',
      icon: TrendingUp,
      color:
        kpi && kpi.totalMargin >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        kpi && kpi.totalMargin >= 0
          ? 'bg-green-50 dark:bg-green-950'
          : 'bg-red-50 dark:bg-red-950',
    },
    {
      label: '평균 마진율',
      value: kpi ? `${kpi.avgMarginRate.toFixed(1)}%` : '-',
      icon: Percent,
      color:
        kpi && kpi.avgMarginRate >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        kpi && kpi.avgMarginRate >= 0
          ? 'bg-green-50 dark:bg-green-950'
          : 'bg-red-50 dark:bg-red-950',
    },
    {
      label: '총 광고비',
      value: kpi ? `₩${kpi.totalAdCost.toLocaleString()}` : '-',
      icon: Megaphone,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      label: '총 주문수',
      value: kpi ? `${kpi.totalOrders.toLocaleString()}건` : '-',
      icon: Package,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
  ];

  const formatCurrency = (value: number) => {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억원`;
    if (value >= 10000) return `${(value / 10000).toFixed(0)}만원`;
    return `${value.toLocaleString()}원`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="space-y-6">
      <ProgressBar loading={loading} />
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold">대시보드</h1>
          <p className="text-sm text-muted-foreground">
            매출 및 마진 현황을 한눈에 확인하세요
          </p>
        </div>
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
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
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
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
                  <span className="font-mono text-2xl font-semibold">
                    {card.value}
                  </span>
                </div>
              </div>
            ))}
      </div>

      {/* 매출 추이 차트 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">매출 추이</h2>
        {loading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        ) : dailyData.length === 0 ? (
          <div className="mt-4 flex h-64 items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        ) : (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  className="text-xs"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  className="text-xs"
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-border bg-card p-3 shadow-md">
                        <p className="text-xs text-muted-foreground mb-2">
                          {label}
                        </p>
                        {payload.map((entry) => (
                          <p
                            key={entry.name}
                            className="text-sm font-mono"
                            style={{ color: entry.color }}
                          >
                            {entry.name === 'sales' ? '매출' : '마진'}: ₩
                            {Number(entry.value).toLocaleString()}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#3B82F6"
                  fill="url(#salesGrad)"
                  strokeWidth={2}
                  name="sales"
                />
                <Area
                  type="monotone"
                  dataKey="margin"
                  stroke="#22C55E"
                  fill="url(#marginGrad)"
                  strokeWidth={2}
                  name="margin"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            매출
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            마진
          </div>
        </div>
      </div>

      {/* 하단 차트 영역 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">채널별 매출/마진</h2>
          {loading ? (
            <Skeleton className="mt-4 h-[300px] w-full rounded-lg" />
          ) : data?.channelData && data.channelData.length > 0 ? (
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.channelData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as ChannelData;
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-md">
                          <p className="text-sm font-medium">{d.name}</p>
                          <div className="mt-2 space-y-1 font-mono text-sm">
                            <p className="text-blue-500">
                              매출: ₩{d.sales.toLocaleString()}
                            </p>
                            <p className="text-green-500">
                              마진: ₩{d.margin.toLocaleString()}
                            </p>
                            <p className="text-muted-foreground">
                              마진율: {d.marginRate.toFixed(1)}%
                            </p>
                            <p className="text-muted-foreground">
                              주문수: {d.orders}건
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === 'sales' ? '매출' : '마진'
                    }
                  />
                  <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} name="sales" />
                  <Bar dataKey="margin" fill="#22C55E" radius={[4, 4, 0, 0]} name="margin" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground text-sm">
              데이터가 없습니다
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">상품별 출고 수량 Top 10</h2>
          {loading ? (
            <Skeleton className="mt-4 h-[300px] w-full rounded-lg" />
          ) : data?.productMarginRank && data.productMarginRank.length > 0 ? (
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(() => {
                    const grouped: Record<string, { name: string; orders: number; sales: number }> = {};
                    for (const p of data.productMarginRank) {
                      if (p.orders <= 0) continue;
                      if (!grouped[p.name]) {
                        grouped[p.name] = { name: p.name, orders: 0, sales: 0 };
                      }
                      grouped[p.name].orders += p.orders;
                      grouped[p.name].sales += p.sales;
                    }
                    return Object.values(grouped)
                      .sort((a, b) => b.orders - a.orders)
                      .slice(0, 10)
                      .map((p) => ({
                        ...p,
                        label: p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name,
                      }));
                  })()}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={140}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { name: string; orders: number; sales: number };
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-md max-w-[250px]">
                          <p className="text-xs font-medium truncate">
                            {d.name}
                          </p>
                          <div className="mt-2 space-y-1 font-mono text-sm">
                            <p>출고 수량: {d.orders}개</p>
                            <p>매출: ₩{d.sales.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="orders" radius={[0, 4, 4, 0]}>
                    {Array.from({ length: 10 }).map((_, index) => (
                      <Cell
                        key={index}
                        fill={`hsl(217, 91%, ${50 + index * 3}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground text-sm">
              데이터가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
