'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  TrendingUp,
  Percent,
  Package,
  Megaphone,
} from 'lucide-react';
import { DateRangeFilter } from '@/components/common/date-range-filter';
import { ChannelFilter } from '@/components/common/channel-filter';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';

const SalesTrendChart = dynamic(
  () => import('@/components/charts/dashboard-charts').then((m) => m.SalesTrendChart),
  { loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

const ChannelBarChart = dynamic(
  () => import('@/components/charts/dashboard-charts').then((m) => m.ChannelBarChart),
  { loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> },
);

const ProductRankChart = dynamic(
  () => import('@/components/charts/dashboard-charts').then((m) => m.ProductRankChart),
  { loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> },
);

type KPI = {
  totalSales: number;
  totalMargin: number;
  totalAdCost: number;
  avgMarginRate: number;
  totalOrders: number;
  calculableCount: number;
};

type PrevKPI = {
  totalSales: number;
  totalMargin: number;
  totalOrders: number;
} | null;

type DashboardData = {
  kpi: KPI;
  prevKpi?: PrevKPI;
  dailyData: { date: string; sales: number; margin: number; orders: number }[];
  channelData: { name: string; sales: number; margin: number; marginRate: number; orders: number; adCost?: number; roas?: number | null }[];
  productMarginRank: { name: string; optionInfo: string; label: string; sales: number; margin: number; marginRate: number; orders: number }[];
};

function calcChange(current: number, prev: number | undefined): { pct: number; direction: 'up' | 'down' | 'same' } | null {
  if (prev === undefined || prev === 0) return null;
  const pct = Math.round(((current - prev) / Math.abs(prev)) * 1000) / 10;
  return { pct, direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'same' };
}

export default function DashboardPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [channelId, setChannelId] = useState('');

  const { data, isLoading: loading } = useQuery<DashboardData>({
    queryKey: ['dashboard', from, to, channelId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (channelId) params.set('channelId', channelId);
      const res = await fetch(`/api/dashboard?${params}`);
      return res.json();
    },
  });

  const kpi = data?.kpi;
  const prevKpi = data?.prevKpi;
  const dailyData = data?.dailyData || [];

  const salesChange = kpi && prevKpi ? calcChange(kpi.totalSales, prevKpi.totalSales) : null;
  const marginChange = kpi && prevKpi ? calcChange(kpi.totalMargin, prevKpi.totalMargin) : null;
  const ordersChange = kpi && prevKpi ? calcChange(kpi.totalOrders, prevKpi.totalOrders) : null;

  const kpiCards = [
    {
      label: '총 매출',
      value: kpi ? `₩${kpi.totalSales.toLocaleString()}` : '-',
      icon: ShoppingCart,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      change: salesChange,
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
      change: marginChange,
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
      change: null,
    },
    {
      label: '총 광고비',
      value: kpi ? `₩${kpi.totalAdCost.toLocaleString()}` : '-',
      icon: Megaphone,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      change: null,
    },
    {
      label: '총 주문수',
      value: kpi ? `${kpi.totalOrders.toLocaleString()}건` : '-',
      icon: Package,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      change: ordersChange,
    },
  ];

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
        <ChannelFilter value={channelId} onChange={setChannelId} />
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
                  {card.change && (
                    <span className={`ml-2 text-xs font-medium ${
                      card.change.direction === 'up'
                        ? 'text-green-600 dark:text-green-400'
                        : card.change.direction === 'down'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                    }`}>
                      {card.change.direction === 'up' ? '▲' : card.change.direction === 'down' ? '▼' : ''}
                      {Math.abs(card.change.pct)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* 매출 추이 차트 */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">매출 추이</h2>
        {loading ? (
          <Skeleton className="mt-4 h-72 w-full rounded-lg" />
        ) : (
          <SalesTrendChart data={dailyData} />
        )}
      </div>

      {/* 하단 차트 영역 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">채널별 매출/마진</h2>
          {loading ? (
            <Skeleton className="mt-4 h-[300px] w-full rounded-lg" />
          ) : (
            <ChannelBarChart data={data?.channelData || []} />
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">상품별 출고 수량 Top 10</h2>
          {loading ? (
            <Skeleton className="mt-4 h-[300px] w-full rounded-lg" />
          ) : (
            <ProductRankChart data={data?.productMarginRank || []} />
          )}
        </div>
      </div>
    </div>
  );
}
