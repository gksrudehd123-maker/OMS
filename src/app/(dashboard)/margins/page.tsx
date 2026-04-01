'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { DateRangeFilter } from '@/components/common/date-range-filter';
import { ChannelFilter } from '@/components/common/channel-filter';
import { TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

type KPI = {
  totalSales: number;
  totalCost: number;
  totalFee: number;
  totalShipping: number;
  totalMargin: number;
  avgMarginRate: number;
  totalOrders: number;
};

type ProductRow = {
  name: string;
  optionInfo: string;
  quantity: number;
  sales: number;
  cost: number;
  fee: number;
  shipping: number;
  margin: number;
  marginRate: number;
};

type ReportData = {
  kpi: KPI;
  productData: ProductRow[];
};

type SortKey = 'margin' | 'marginRate' | 'sales' | 'quantity';

export default function MarginsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [channelId, setChannelId] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('margin');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!from || !to) return;
    const params = new URLSearchParams({ from, to });
    if (channelId) params.set('channelId', channelId);
    fetch(`/api/report?${params}`)
      .then((res) => res.json())
      .then(setData);
  }, [from, to, channelId]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortedProducts = data
    ? [...data.productData].sort((a, b) => {
        const diff = a[sortKey] - b[sortKey];
        return sortAsc ? diff : -diff;
      })
    : [];

  const fmt = (n: number) => `₩${n.toLocaleString()}`;

  const formatCurrency = (value: number) => {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억원`;
    if (value >= 10000) return `${(value / 10000).toFixed(0)}만원`;
    return `${value.toLocaleString()}원`;
  };

  // 마진율 분포 데이터 (5% 단위 구간)
  const marginDistribution = (() => {
    if (!data) return [];
    const buckets: Record<string, number> = {};
    for (const p of data.productData) {
      const rate = Math.floor(p.marginRate / 5) * 5;
      const label = `${rate}~${rate + 5}%`;
      buckets[label] = (buckets[label] || 0) + 1;
    }
    return Object.entries(buckets)
      .map(([range, count]) => ({ range, count }))
      .sort((a, b) => {
        const aNum = parseInt(a.range);
        const bNum = parseInt(b.range);
        return aNum - bNum;
      });
  })();

  // 매출 vs 마진율 산점도 데이터
  const scatterData = data
    ? data.productData.map((p) => ({
        name: p.name,
        optionInfo: p.optionInfo,
        sales: p.sales,
        marginRate: Math.round(p.marginRate * 10) / 10,
        margin: p.margin,
        quantity: p.quantity,
      }))
    : [];

  const kpiItems = data
    ? [
        {
          label: '총 매출',
          value: fmt(data.kpi.totalSales),
          sub: `${data.kpi.totalOrders}건`,
        },
        {
          label: '총 원가',
          value: fmt(data.kpi.totalCost),
          sub: `매출 대비 ${data.kpi.totalSales > 0 ? ((data.kpi.totalCost / data.kpi.totalSales) * 100).toFixed(1) : 0}%`,
        },
        {
          label: '총 수수료 + 배송비',
          value: fmt(data.kpi.totalFee + data.kpi.totalShipping),
          sub: `수수료 ${fmt(data.kpi.totalFee)} / 배송 ${fmt(data.kpi.totalShipping)}`,
        },
        {
          label: '순마진',
          value: fmt(data.kpi.totalMargin),
          sub: `마진율 ${(Math.round(data.kpi.avgMarginRate * 10) / 10).toFixed(1)}%`,
          highlight: true,
          positive: data.kpi.totalMargin >= 0,
        },
      ]
    : [];

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="cursor-pointer pb-2 text-right font-medium select-none hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${sortKey === field ? 'text-primary' : ''}`}
        />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold">마진 분석</h1>
          <p className="text-sm text-muted-foreground">
            상품별 마진율을 분석하고 수익 구조를 파악합니다
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

      {!from || !to ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
            기간을 선택하면 마진 분석 데이터가 표시됩니다
          </div>
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
            데이터를 불러오는 중...
          </div>
        </div>
      ) : (
        <>
          {/* KPI 카드 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpiItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${
                  item.highlight
                    ? item.positive
                      ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                      : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                  {item.highlight &&
                    (item.positive ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ))}
                </div>
                <p className="mt-2 font-mono text-xl font-semibold sm:text-2xl">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* 차트 영역 */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* 마진율 분포 차트 */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">마진율 분포</h2>
              <p className="text-xs text-muted-foreground">
                상품별 마진율 구간 분포 (5% 단위)
              </p>
              {marginDistribution.length > 0 ? (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={marginDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="range"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-border bg-card p-3 shadow-md">
                              <p className="text-sm font-medium">{d.range}</p>
                              <p className="text-sm font-mono">
                                {d.count}개 상품
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {marginDistribution.map((entry, index) => {
                          const rate = parseInt(entry.range);
                          let color = '#3B82F6';
                          if (rate < 10) color = '#EF4444';
                          else if (rate < 20) color = '#F59E0B';
                          else if (rate < 30) color = '#3B82F6';
                          else color = '#22C55E';
                          return <Cell key={index} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-4 flex h-64 items-center justify-center text-sm text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </div>

            {/* 매출 vs 마진율 산점도 */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">매출 vs 마진율</h2>
              <p className="text-xs text-muted-foreground">
                매출이 크고 마진율이 높을수록 우상단에 위치
              </p>
              {scatterData.length > 0 ? (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="sales"
                        name="매출"
                        tickFormatter={formatCurrency}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="marginRate"
                        name="마진율"
                        unit="%"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                      />
                      <ZAxis
                        dataKey="quantity"
                        range={[40, 400]}
                        name="판매수량"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
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
                                <p>매출: {fmt(d.sales)}</p>
                                <p>마진율: {d.marginRate}%</p>
                                <p>마진: {fmt(d.margin)}</p>
                                <p>수량: {d.quantity}개</p>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Scatter data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={
                              entry.marginRate >= 30
                                ? '#22C55E'
                                : entry.marginRate >= 20
                                  ? '#3B82F6'
                                  : entry.marginRate >= 10
                                    ? '#F59E0B'
                                    : '#EF4444'
                            }
                            fillOpacity={0.7}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-4 flex h-64 items-center justify-center text-sm text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  30%+
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  20~30%
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  10~20%
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  10% 미만
                </div>
              </div>
            </div>
          </div>

          {/* 상품별 마진 테이블 */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold">상품별 마진 상세</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">상품명</th>
                    <th className="pb-2 font-medium">옵션</th>
                    <SortHeader label="수량" field="quantity" />
                    <SortHeader label="매출" field="sales" />
                    <th className="pb-2 text-right font-medium">원가</th>
                    <th className="pb-2 text-right font-medium">수수료</th>
                    <th className="pb-2 text-right font-medium">배송비</th>
                    <SortHeader label="마진" field="margin" />
                    <SortHeader label="마진율" field="marginRate" />
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="max-w-[200px] truncate py-2">
                        {row.name}
                      </td>
                      <td className="max-w-[150px] truncate py-2 text-muted-foreground">
                        {row.optionInfo}
                      </td>
                      <td className="py-2 text-right">{row.quantity}</td>
                      <td className="py-2 text-right font-mono">
                        {fmt(row.sales)}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {fmt(row.cost)}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {fmt(row.fee)}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {fmt(row.shipping)}
                      </td>
                      <td
                        className={`py-2 text-right font-mono font-medium ${row.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {fmt(row.margin)}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.marginRate >= 30
                              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                              : row.marginRate >= 20
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                : row.marginRate >= 10
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                          }`}
                        >
                          {(Math.round(row.marginRate * 10) / 10).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
