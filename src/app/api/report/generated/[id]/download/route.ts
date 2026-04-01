import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import type { ReportData } from '@/lib/services/report-generator';

// 생성된 리포트를 엑셀 파일로 다운로드
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const report = await prisma.generatedReport.findUnique({
    where: { id: params.id },
  });

  if (!report) {
    return NextResponse.json(
      { error: '리포트를 찾을 수 없습니다' },
      { status: 404 },
    );
  }

  const data = report.reportData as unknown as ReportData;
  const from = report.periodFrom.toISOString().split('T')[0];
  const to = report.periodTo.toISOString().split('T')[0];
  const typeLabel = report.type === 'weekly' ? '주간' : '월간';

  // CSV 형태로 엑셀 호환 파일 생성 (xlsx-populate 없이 간단하게)
  const BOM = '\uFEFF';
  let csv = BOM;

  // 요약 시트
  csv += `${typeLabel} 리포트 (${from} ~ ${to})\n\n`;
  csv += '항목,값\n';
  csv += `총 매출,${data.kpi.totalSales.toLocaleString()}\n`;
  csv += `총 원가,${data.kpi.totalCost.toLocaleString()}\n`;
  csv += `총 수수료,${data.kpi.totalFee.toLocaleString()}\n`;
  csv += `총 배송비,${data.kpi.totalShipping.toLocaleString()}\n`;
  csv += `총 마진,${data.kpi.totalMargin.toLocaleString()}\n`;
  csv += `평균 마진율,${data.kpi.avgMarginRate}%\n`;
  csv += `총 주문수,${data.kpi.totalOrders}\n`;
  csv += '\n';

  // 채널별 실적
  csv += '채널별 실적\n';
  csv += '채널,매출,원가,수수료,배송비,마진,마진율,주문수\n';
  for (const ch of data.channelData) {
    csv += `${ch.name},${ch.sales},${ch.cost},${ch.fee},${ch.shipping},${ch.margin},${ch.marginRate}%,${ch.orders}\n`;
  }
  csv += '\n';

  // 일별 매출
  csv += '일별 매출\n';
  csv += '날짜,매출,마진,주문수\n';
  for (const d of data.dailyData) {
    csv += `${d.date},${d.sales},${d.margin},${d.orders}\n`;
  }
  csv += '\n';

  // 상품별 실적
  csv += '상품별 실적\n';
  csv += '상품명,옵션,수량,매출,원가,수수료,배송비,마진,마진율\n';
  for (const p of data.productData) {
    const name = p.optionInfo ? `${p.name} (${p.optionInfo})` : p.name;
    csv += `"${name}",${p.quantity},${p.sales},${p.cost},${p.fee},${p.shipping},${p.margin},${p.marginRate}%\n`;
  }

  const fileName = `${typeLabel}_리포트_${from}_${to}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
