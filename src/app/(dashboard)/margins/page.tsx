export default function MarginsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">마진 분석</h1>
        <p className="text-sm text-muted-foreground">
          상품별, 채널별 마진율을 분석합니다
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          마진 분석 차트 및 테이블 (Phase 5에서 구현)
        </div>
      </div>
    </div>
  );
}
