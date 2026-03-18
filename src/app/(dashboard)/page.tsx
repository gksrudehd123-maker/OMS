'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, TrendingUp, Percent, Package } from 'lucide-react';
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
} from 'recharts';

type KPI = {
  totalSales: number;
  totalMargin: number;
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
  productMarginRank: ProductMargin[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    fetch(`/api/dashboard?${params}`)
      .then((res) => res.json())
      .then(setData);
  }, [from, to]);

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
      label: '총 주문수',
      value: kpi ? `${kpi.totalOrders.toLocaleString()}건` : '-',
      icon: Package,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
  ];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `₩${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₩${(value / 1000).toFixed(0)}K`;
    return `₩${value}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">대시보드</h1>
          <p className="text-sm text-muted-foreground">
            매출 및 마진 현황을 한눈에 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {(from || to) && (
            <button
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
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
        {dailyData.length === 0 ? (
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
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
                            {entry.name === 'sales' ? '매출' : '마진'}:{' '}
                            ₩{Number(entry.value).toLocaleString()}
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
          <h2 className="text-lg font-semibold">채널별 매출</h2>
          <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground text-sm">
            채널 추가 시 활성화됩니다
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">상품별 마진 Top 10</h2>
          {data?.productMarginRank && data.productMarginRank.length > 0 ? (
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.productMarginRank}
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
                    tickFormatter={formatCurrency}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={140}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(value: string) =>
                      value.length > 18 ? value.slice(0, 18) + '...' : value
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as ProductMargin;
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-md max-w-[250px]">
                          <p className="text-xs font-medium truncate">
                            {d.name}
                          </p>
                          {d.optionInfo && (
                            <p className="text-xs text-muted-foreground truncate">
                              {d.optionInfo}
                            </p>
                          )}
                          <div className="mt-2 space-y-1 font-mono text-sm">
                            <p>
                              마진: ₩{d.margin.toLocaleString()}
                            </p>
                            <p>
                              매출: ₩{d.sales.toLocaleString()}
                            </p>
                            <p>
                              마진율: {d.marginRate.toFixed(1)}%
                            </p>
                            <p>
                              판매수량: {d.orders}개
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                    {data.productMarginRank.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.margin >= 0
                            ? `hsl(142, 71%, ${45 - index * 2}%)`
                            : 'hsl(0, 84%, 60%)'
                        }
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
