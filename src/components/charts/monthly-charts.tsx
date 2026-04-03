'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getChannelColor } from '@/lib/helpers/channel-colors';

type DailyData = Record<string, unknown> & {
  date: string;
  day: number;
};

type ChannelSales = {
  name: string;
  sales: number;
  orders: number;
};

type ChannelAdCost = {
  name: string;
  cost: number;
};

const formatCurrency = (value: number) => {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억원`;
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만원`;
  return `${value.toLocaleString()}원`;
};

export function MonthlyDailyChart({
  data,
  channelNames,
}: {
  data: DailyData[];
  channelNames: string[];
}) {
  const hasAnyData = data.some((d) =>
    channelNames.some((ch) => d[ch] !== null && d[ch] !== undefined),
  );

  if (!hasAnyData) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              interval={0}
              tickFormatter={(v) =>
                v % 5 === 1 || v === data.length ? `${v}` : ''
              }
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DailyData;
                const total = channelNames.reduce(
                  (sum, ch) => sum + (Number(d[ch]) || 0),
                  0,
                );
                return (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-md">
                    <p className="text-xs text-muted-foreground mb-2">
                      {d.date}
                    </p>
                    {channelNames.map((ch, i) => {
                      const val = d[ch];
                      if (val === null || val === undefined) return null;
                      return (
                        <p
                          key={ch}
                          className="text-sm font-mono"
                          style={{ color: getChannelColor(ch) }}
                        >
                          {ch}: ₩{Number(val).toLocaleString()}
                        </p>
                      );
                    })}
                    {channelNames.length > 1 && total > 0 && (
                      <p className="mt-1 text-sm font-mono font-semibold border-t border-border pt-1">
                        합계: ₩{total.toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {channelNames.map((ch, i) => (
              <Bar
                key={ch}
                dataKey={ch}
                stackId="sales"
                fill={getChannelColor(ch)}
                radius={
                  i === channelNames.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {channelNames.map((ch, i) => (
          <div key={ch} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getChannelColor(ch) }}
            />
            {ch}
          </div>
        ))}
      </div>
    </>
  );
}

export function ChannelSalesChart({ data }: { data: ChannelSales[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="mt-4 h-56 sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            vertical={false}
          />
          <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ChannelSales;
              return (
                <div className="rounded-lg border border-border bg-card p-3 shadow-md">
                  <p className="text-sm font-medium">{d.name}</p>
                  <div className="mt-2 space-y-1 font-mono text-sm">
                    <p className="text-blue-500">
                      매출: ₩{d.sales.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground">
                      주문수: {d.orders}건
                    </p>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={getChannelColor(d.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChannelAdCostChart({ data }: { data: ChannelAdCost[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="mt-4 h-56 sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            vertical={false}
          />
          <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ChannelAdCost;
              return (
                <div className="rounded-lg border border-border bg-card p-3 shadow-md">
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="mt-1 font-mono text-sm text-orange-500">
                    광고비: ₩{d.cost.toLocaleString()}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={getChannelColor(d.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
