import {
  ShoppingCart,
  TrendingUp,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const kpiCards = [
  {
    label: '총 매출',
    value: '₩12,500,000',
    change: '+12.5%',
    isPositive: true,
    icon: ShoppingCart,
  },
  {
    label: '순 마진',
    value: '₩3,200,000',
    change: '+8.3%',
    isPositive: true,
    icon: TrendingUp,
  },
  {
    label: '마진율',
    value: '25.6%',
    change: '-2.1%',
    isPositive: false,
    icon: Percent,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">대시보드</h1>
        <p className="text-sm text-muted-foreground">
          매출 및 마진 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {card.label}
              </span>
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-3">
              <span className="font-mono text-2xl font-semibold">
                {card.value}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {card.isPositive ? (
                <ArrowUpRight className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-danger" />
              )}
              <span
                className={`text-sm font-medium ${card.isPositive ? 'text-success' : 'text-danger'}`}
              >
                {card.change}
              </span>
              <span className="text-sm text-muted-foreground">전월 대비</span>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Charts */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">매출 추이</h2>
        <div className="mt-4 flex h-64 items-center justify-center text-muted-foreground">
          차트 영역 (Phase 4에서 구현)
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">채널별 매출</h2>
          <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground">
            파이 차트 영역
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">상품별 마진 Top 10</h2>
          <div className="mt-4 flex h-48 items-center justify-center text-muted-foreground">
            바 차트 영역
          </div>
        </div>
      </div>
    </div>
  );
}
