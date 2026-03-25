'use client';

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
  adCost?: number;
  roas?: number | null;
};

type ProductMargin = {
  name: string;
  label: string;
  sales: number;
  margin: number;
  orders: number;
};

const formatCurrency = (value: number) => {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억원`;
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만원`;
  return `${value.toLocaleString()}원`;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export function SalesTrendChart({ data }: { data: DailyData[] }) {
  if (data.length === 0) {
    return (
      <div className="mt-4 flex h-64 items-center justify-center text-muted-foreground">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
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
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" tick={{ fill: '#9CA3AF' }} />
            <YAxis tickFormatter={formatCurrency} className="text-xs" tick={{ fill: '#9CA3AF' }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-md">
                    <p className="text-xs text-muted-foreground mb-2">{label}</p>
                    {payload.map((entry) => (
                      <p key={entry.name} className="text-sm font-mono" style={{ color: entry.color }}>
                        {entry.name === 'sales' ? '매출' : '마진'}: ₩{Number(entry.value).toLocaleString()}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="sales" stroke="#3B82F6" fill="url(#salesGrad)" strokeWidth={2} name="sales" />
            <Area type="monotone" dataKey="margin" stroke="#22C55E" fill="url(#marginGrad)" strokeWidth={2} name="margin" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />매출
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />마진
        </div>
      </div>
    </>
  );
}

export function ChannelBarChart({ data }: { data: ChannelData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="mt-4 h-64 sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ChannelData;
              return (
                <div className="rounded-lg border border-border bg-card p-3 shadow-md">
                  <p className="text-sm font-medium">{d.name}</p>
                  <div className="mt-2 space-y-1 font-mono text-sm">
                    <p className="text-blue-500">매출: ₩{d.sales.toLocaleString()}</p>
                    <p className="text-green-500">마진: ₩{d.margin.toLocaleString()}</p>
                    <p className="text-muted-foreground">마진율: {d.marginRate.toFixed(1)}%</p>
                    <p className="text-muted-foreground">주문수: {d.orders}건</p>
                    {d.adCost !== undefined && d.adCost > 0 && (
                      <>
                        <p className="text-orange-500">광고비: ₩{d.adCost.toLocaleString()}</p>
                        <p className="text-orange-500">ROAS: {d.roas !== null && d.roas !== undefined ? `${d.roas.toFixed(2)}x` : '-'}</p>
                      </>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Legend formatter={(value: string) => (value === 'sales' ? '매출' : '마진')} />
          <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} name="sales" />
          <Bar dataKey="margin" fill="#22C55E" radius={[4, 4, 0, 0]} name="margin" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProductRankChart({ data }: { data: ProductMargin[] }) {
  const chartData = (() => {
    const grouped: Record<string, { name: string; orders: number; sales: number }> = {};
    for (const p of data) {
      if (p.orders <= 0) continue;
      if (!grouped[p.name]) grouped[p.name] = { name: p.name, orders: 0, sales: 0 };
      grouped[p.name].orders += p.orders;
      grouped[p.name].sales += p.sales;
    }
    return Object.values(grouped)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10)
      .map((p) => ({ ...p, label: p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name }));
  })();

  if (chartData.length === 0) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="mt-4 h-64 sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis type="category" dataKey="label" width={140} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { name: string; orders: number; sales: number };
              return (
                <div className="rounded-lg border border-border bg-card p-3 shadow-md max-w-[250px]">
                  <p className="text-xs font-medium truncate">{d.name}</p>
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
              <Cell key={index} fill={`hsl(217, 91%, ${50 + index * 3}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
