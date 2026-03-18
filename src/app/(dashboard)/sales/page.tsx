export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">매출 관리</h1>
        <p className="text-sm text-muted-foreground">
          매출 데이터를 조회하고 관리합니다
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          매출 데이터 테이블 (Phase 3에서 구현)
        </div>
      </div>
    </div>
  );
}
