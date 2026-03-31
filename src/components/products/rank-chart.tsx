'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from 'recharts';

type RankHistory = {
  rank: number | null;
  page: number | null;
  date: string;
};

const COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export function RankChart({ keywordId, month }: { keywordId: string; month?: string }) {
  const { data: history = [], isLoading } = useQuery<RankHistory[]>({
    queryKey: ['keyword-history', keywordId, month],
    queryFn: async () => {
      const res = await fetch(`/api/keywords/${keywordId}/history`);
      return res.json();
    },
  });

  // 월 필터 적용
  const filtered = month
    ? history.filter((h) => h.date.startsWith(month))
    : history;

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">로딩 중...</div>;
  }

  if (filtered.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        {month ? `${month}월 순위 데이터가 없습니다` : '순위 데이터가 없습니다. 조회 버튼을 클릭해주세요.'}
      </div>
    );
  }

  const chartData = filtered.map((h) => ({
    date: new Date(h.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    rank: h.rank,
  }));

  const ranks = filtered.filter((h) => h.rank !== null).map((h) => h.rank as number);
  const maxRank = ranks.length > 0 ? Math.max(...ranks) : 100;
  const yMax = Math.min(Math.ceil(maxRank / 10) * 10 + 10, 110);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="rankGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.05} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.3} />
            </linearGradient>
          </defs>
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
                <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-sm">
                  <p className="text-muted-foreground text-xs">{d.date}</p>
                  <p className="font-mono font-bold text-blue-600 text-base">
                    {d.rank !== null ? `${d.rank}위` : '100위 밖'}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="rank"
            stroke="#3B82F6"
            strokeWidth={2.5}
            fill="url(#rankGradient)"
            baseValue={yMax}
            dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
            connectNulls={false}
          >
            <LabelList
              dataKey="rank"
              position="top"
              offset={10}
              style={{ fill: '#3B82F6', fontSize: 11, fontWeight: 700 }}
              formatter={(v: number | null) => (v !== null ? `${v}위` : '')}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 전체 키워드 추이 차트 (여러 키워드를 한 차트에)
 */
export function AllKeywordsChart({ keywords }: { keywords: { id: string; keyword: string }[] }) {
  // 모든 키워드의 히스토리를 병렬로 가져오기
  const { data: allData, isLoading } = useQuery({
    queryKey: ['all-keyword-history', keywords.map((k) => k.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        keywords.map(async (kw) => {
          const res = await fetch(`/api/keywords/${kw.id}/history`);
          const history: RankHistory[] = await res.json();
          return { keyword: kw.keyword, history };
        })
      );
      return results;
    },
    enabled: keywords.length > 0,
  });

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">로딩 중...</div>;
  }

  if (!allData || allData.every((d) => d.history.length === 0)) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        순위 데이터가 없습니다. 전체 조회 버튼을 클릭해주세요.
      </div>
    );
  }

  // 날짜별로 병합
  const dateMap = new Map<string, Record<string, number | null>>();
  for (const { keyword, history } of allData) {
    for (const h of history) {
      const dateKey = new Date(h.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, {});
      dateMap.get(dateKey)![keyword] = h.rank;
    }
  }

  const chartData = Array.from(dateMap.entries())
    .map(([date, ranks]) => ({ date, ...ranks }))
    .sort((a, b) => {
      // 날짜 정렬
      const aDate = allData.flatMap((d) => d.history).find((h) =>
        new Date(h.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) === a.date
      )?.date || '';
      const bDate = allData.flatMap((d) => d.history).find((h) =>
        new Date(h.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) === b.date
      )?.date || '';
      return aDate.localeCompare(bDate);
    });

  const allRanks = allData.flatMap((d) => d.history).filter((h) => h.rank !== null).map((h) => h.rank as number);
  const maxRank = allRanks.length > 0 ? Math.max(...allRanks) : 100;
  const yMax = Math.min(Math.ceil(maxRank / 10) * 10 + 10, 110);

  return (
    <div className="h-72">
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
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-border bg-card p-3 shadow-md">
                  <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
                  <div className="space-y-1">
                    {payload.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-muted-foreground">{p.name}</span>
                        <span className="font-mono font-bold ml-auto">
                          {p.value !== null ? `${p.value}위` : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
          <Legend
            formatter={(value: string) => <span className="text-xs">{value}</span>}
          />
          {allData.map((d, i) => (
            <Line
              key={d.keyword}
              type="monotone"
              dataKey={d.keyword}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS[i % COLORS.length], strokeWidth: 1.5, stroke: '#fff' }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
