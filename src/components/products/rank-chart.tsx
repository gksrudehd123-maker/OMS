'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type RankHistory = {
  rank: number | null;
  page: number | null;
  date: string;
};

export function RankChart({ keywordId }: { keywordId: string }) {
  const { data: history = [], isLoading } = useQuery<RankHistory[]>({
    queryKey: ['keyword-history', keywordId],
    queryFn: async () => {
      const res = await fetch(`/api/keywords/${keywordId}/history`);
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">로딩 중...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        순위 데이터가 없습니다. 순위 조회 버튼을 클릭하여 데이터를 수집하세요.
      </div>
    );
  }

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    rank: h.rank,
  }));

  // Y축: 순위 반전 (1위가 위에 오도록)
  const ranks = history.filter((h) => h.rank !== null).map((h) => h.rank as number);
  const maxRank = ranks.length > 0 ? Math.max(...ranks) : 100;
  const yMax = Math.min(Math.ceil(maxRank / 10) * 10 + 10, 110);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis
            reversed
            domain={[1, yMax]}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            label={{ value: '순위', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 11 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border border-border bg-card p-2 shadow-md text-sm">
                  <p className="text-muted-foreground">{d.date}</p>
                  <p className="font-mono font-semibold text-blue-600">
                    {d.rank !== null ? `${d.rank}위` : '100위 밖'}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="rank"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3B82F6' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
