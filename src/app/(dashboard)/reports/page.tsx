'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';
import { DateRangeFilter } from '@/components/common/date-range-filter';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type ReportKPI = {
  totalSales: number;
  totalCost: number;
  totalFee: number;
  totalShipping: number;
  totalMargin: number;
  avgMarginRate: number;
  totalOrders: number;
};

type DailyRow = {
  date: string;
  sales: number;
  margin: number;
  orders: number;
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

type ChannelRow = {
  name: string;
  sales: number;
};

type ReportData = {
  period: { from: string; to: string };
  kpi: ReportKPI;
  channelData: ChannelRow[];
  dailyData: DailyRow[];
  productData: ProductRow[];
};

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    if (!from || !to) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/report?from=${from}&to=${to}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!data) return;
    setExcelLoading(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // --- 요약 시트 ---
      const summaryRows = [
        ['기간', `${data.period.from} ~ ${data.period.to}`],
        [],
        ['총 매출', data.kpi.totalSales],
        ['총 원가', data.kpi.totalCost],
        ['총 수수료', data.kpi.totalFee],
        ['총 배송비', data.kpi.totalShipping],
        ['총 마진', data.kpi.totalMargin],
        ['평균 마진율(%)', Math.round(data.kpi.avgMarginRate * 10) / 10],
        ['총 주문수', data.kpi.totalOrders],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
      summaryWs['!cols'] = [{ wch: 15 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, '요약');

      // --- 일별 시트 ---
      const dailyRows = [
        ['날짜', '매출', '마진', '주문수'],
        ...data.dailyData.map((r) => [r.date, r.sales, r.margin, r.orders]),
      ];
      const dailyWs = XLSX.utils.aoa_to_sheet(dailyRows);
      dailyWs['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, dailyWs, '일별 매출');

      // --- 상품별 시트 ---
      const productRows = [
        ['상품명', '옵션', '수량', '매출', '원가', '수수료', '배송비', '마진', '마진율(%)'],
        ...data.productData.map((r) => [
          r.name,
          r.optionInfo,
          r.quantity,
          r.sales,
          r.cost,
          r.fee,
          r.shipping,
          r.margin,
          Math.round(r.marginRate * 10) / 10,
        ]),
      ];
      const productWs = XLSX.utils.aoa_to_sheet(productRows);
      productWs['!cols'] = [
        { wch: 25 }, { wch: 20 }, { wch: 8 }, { wch: 15 },
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, productWs, '상품별 실적');

      XLSX.writeFile(wb, `리포트_${data.period.from}_${data.period.to}.xlsx`);
    } finally {
      setExcelLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!data || !reportRef.current) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { default: jsPDF } = await import('jspdf');

      const pdfWidth = 297;
      const pdfHeight = 210;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // 캡처용 너비 설정 (가로 A4 비율에 맞게)
      const captureWidth = 1200;
      const el = reportRef.current;
      const originalWidth = el.style.width;
      el.style.width = `${captureWidth}px`;

      // 섹션별 캡처 (data-pdf-section 속성으로 식별)
      const sections = el.querySelectorAll('[data-pdf-section]');
      let isFirstPage = true;

      for (const section of Array.from(sections)) {
        const canvas = await html2canvas(section as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: captureWidth,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const sectionHeight = (imgHeight * contentWidth) / imgWidth;

        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        // 섹션이 한 페이지보다 긴 경우 (테이블 등)
        const pageContentHeight = pdfHeight - margin * 2;
        if (sectionHeight <= pageContentHeight) {
          doc.addImage(imgData, 'PNG', margin, margin, contentWidth, sectionHeight);
        } else {
          let remainingHeight = sectionHeight;
          let yOffset = 0;
          let first = true;
          while (remainingHeight > 0) {
            if (!first) doc.addPage();
            first = false;
            doc.addImage(imgData, 'PNG', margin, margin - yOffset, contentWidth, sectionHeight);
            remainingHeight -= pageContentHeight;
            yOffset += pageContentHeight;
          }
        }
      }

      // 원래 너비 복원
      el.style.width = originalWidth;

      doc.save(`리포트_${data.period.from}_${data.period.to}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  const fmt = (n: number) => `₩${n.toLocaleString()}`;

  const formatCurrency = (value: number) => {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억원`;
    if (value >= 10000) return `${(value / 10000).toFixed(0)}만원`;
    return `${value.toLocaleString()}원`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const PIE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#EC4899'];

  const channelBreakdown = data
    ? data.channelData.filter((ch) => ch.sales > 0).map((ch) => ({ name: ch.name, value: ch.sales }))
    : [];

  return (
    <div className="space-y-6">
      <ProgressBar loading={loading} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">리포트</h1>
          <p className="text-sm text-muted-foreground">
            기간별 리포트를 생성하고 다운로드합니다
          </p>
        </div>
      </div>

      {/* 기간 선택 + 조회 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          <button
            onClick={fetchReport}
            disabled={!from || !to || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            조회
          </button>
        </div>
      </div>

      {/* 로딩 스켈레톤 */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* 결과 미리보기 + 다운로드 */}
      {data && (
        <>
          {/* 다운로드 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={downloadExcel}
              disabled={excelLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900"
            >
              {excelLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              엑셀 다운로드
            </button>
            <button
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF 다운로드
            </button>
          </div>

          {/* PDF 캡처 영역 */}
          <div ref={reportRef} className="space-y-6">
          {/* KPI 요약 + 매출/마진 추이 차트 */}
          <div data-pdf-section className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">KPI 요약</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: '총 매출', value: fmt(data.kpi.totalSales) },
                { label: '총 원가', value: fmt(data.kpi.totalCost) },
                { label: '총 수수료', value: fmt(data.kpi.totalFee) },
                { label: '총 배송비', value: fmt(data.kpi.totalShipping) },
                {
                  label: '총 마진',
                  value: fmt(data.kpi.totalMargin),
                  highlight: true,
                },
                {
                  label: '평균 마진율',
                  value: `${(Math.round(data.kpi.avgMarginRate * 10) / 10).toFixed(1)}%`,
                },
                { label: '총 주문수', value: `${data.kpi.totalOrders}건` },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg border p-4 ${
                    item.highlight
                      ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                      : 'border-border'
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 font-mono text-lg font-semibold">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 매출/마진 추이 차트 */}
          {data.dailyData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">매출/마진 추이</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyData}>
                    <defs>
                      <linearGradient id="rptSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rptMarginGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis tickFormatter={formatCurrency} tick={{ fill: '#6b7280', fontSize: 12 }} />
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
                    <Area type="monotone" dataKey="sales" stroke="#3B82F6" fill="url(#rptSalesGrad)" strokeWidth={2} name="sales" />
                    <Area type="monotone" dataKey="margin" stroke="#22C55E" fill="url(#rptMarginGrad)" strokeWidth={2} name="margin" />
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
            </div>
          )}
          </div>

          {/* 채널별 매출 비율 + 상품별 출고 수량 + 일별 매출 */}
          <div data-pdf-section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* 매출 구성 비율 (파이 차트) */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">채널별 매출 비율</h2>
              <div className="mt-4 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {channelBreakdown.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`₩${value.toLocaleString()}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {channelBreakdown.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-mono">{fmt(item.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-medium">
                  <span>총 매출</span>
                  <span className="font-mono">{fmt(data.kpi.totalSales)}</span>
                </div>
              </div>
            </div>

            {/* 상품별 출고 수량 Top 5 */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">상품별 출고 수량 Top 5</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(() => {
                      const grouped: Record<string, { name: string; quantity: number; sales: number }> = {};
                      for (const p of data.productData) {
                        if (p.quantity <= 0) continue;
                        if (!grouped[p.name]) {
                          grouped[p.name] = { name: p.name, quantity: 0, sales: 0 };
                        }
                        grouped[p.name].quantity += p.quantity;
                        grouped[p.name].sales += p.sales;
                      }
                      return Object.values(grouped)
                        .sort((a, b) => b.quantity - a.quantity)
                        .slice(0, 5)
                        .map((p) => ({
                          ...p,
                          label: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name,
                        }));
                    })()}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { name: string; quantity: number; sales: number; label: string };
                        return (
                          <div className="rounded-lg border border-border bg-card p-3 shadow-md max-w-[250px]">
                            <p className="text-xs font-medium truncate">{d.name}</p>
                            <div className="mt-2 space-y-1 font-mono text-sm">
                              <p>출고 수량: {d.quantity}개</p>
                              <p>매출: ₩{d.sales.toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                      {Array.from({ length: 5 }).map((_, index) => (
                          <Cell key={index} fill={`hsl(217, 91%, ${50 + index * 5}%)`} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 일별 매출 테이블 */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">일별 매출</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">날짜</th>
                    <th className="pb-2 text-right font-medium">매출</th>
                    <th className="pb-2 text-right font-medium">마진</th>
                    <th className="pb-2 text-right font-medium">주문수</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyData.map((row) => (
                    <tr key={row.date} className="border-b border-border/50">
                      <td className="py-2">{row.date}</td>
                      <td className="py-2 text-right font-mono">
                        {fmt(row.sales)}
                      </td>
                      <td
                        className={`py-2 text-right font-mono ${row.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {fmt(row.margin)}
                      </td>
                      <td className="py-2 text-right">{row.orders}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>

          {/* 상품별 실적 테이블 */}
          <div data-pdf-section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">상품별 실적</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">상품명</th>
                    <th className="pb-2 font-medium">옵션</th>
                    <th className="pb-2 text-right font-medium">수량</th>
                    <th className="pb-2 text-right font-medium">매출</th>
                    <th className="pb-2 text-right font-medium">원가</th>
                    <th className="pb-2 text-right font-medium">수수료</th>
                    <th className="pb-2 text-right font-medium">배송비</th>
                    <th className="pb-2 text-right font-medium">마진</th>
                    <th className="pb-2 text-right font-medium">마진율</th>
                  </tr>
                </thead>
                <tbody>
                  {data.productData.filter((r) => r.quantity > 0).map((row, i) => (
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
                        className={`py-2 text-right font-mono ${row.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {fmt(row.margin)}
                      </td>
                      <td
                        className={`py-2 text-right ${row.marginRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {(Math.round(row.marginRate * 10) / 10).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Download className="h-8 w-8" />
            <p className="text-sm">기간을 선택하고 조회 버튼을 눌러주세요</p>
          </div>
        </div>
      )}
    </div>
  );
}
