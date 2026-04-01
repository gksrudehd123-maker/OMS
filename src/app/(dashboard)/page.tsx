'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const MonthlySalesTab = dynamic(
  () =>
    import('@/components/dashboard/monthly-sales-tab').then(
      (m) => m.MonthlySalesTab,
    ),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> },
);

const SalesDashboardTab = dynamic(
  () =>
    import('@/components/dashboard/sales-dashboard-tab').then(
      (m) => m.SalesDashboardTab,
    ),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> },
);

const AdBudgetTab = dynamic(
  () =>
    import('@/components/dashboard/ad-budget-tab').then((m) => m.AdBudgetTab),
  { loading: () => <Skeleton className="h-64 w-full rounded-lg" /> },
);

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<
    'monthly' | 'dashboard' | 'ad-budget'
  >('monthly');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">대시보드</h1>
        <p className="text-sm text-muted-foreground">
          매출 및 마진 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          월별 매출 데이터
        </button>
        <button
          onClick={() => setActiveTab('ad-budget')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'ad-budget'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          광고 손익분기
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          매출 대시보드
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'monthly' && <MonthlySalesTab />}
      {activeTab === 'dashboard' && <SalesDashboardTab />}
      {activeTab === 'ad-budget' && <AdBudgetTab />}
    </div>
  );
}
