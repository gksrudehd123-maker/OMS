import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateReportData } from '@/lib/services/report-generator';

/**
 * GET /api/report/auto
 * 스케줄러에서 호출 — 설정에 따라 주간/월간 리포트 자동 생성
 */
export async function GET() {
  try {
    // 설정에서 자동 리포트 주기 확인
    const setting = await prisma.setting.findUnique({
      where: { key: 'autoReportSchedule' },
    });

    const schedule = setting?.value || 'off'; // "weekly" | "monthly" | "off"

    if (schedule === 'off') {
      return NextResponse.json({
        message: '자동 리포트가 비활성화되어 있습니다',
      });
    }

    // KST 기준 현재 날짜
    const now = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    let from: string;
    let to: string;
    let type: string;

    if (schedule === 'weekly') {
      // 지난주 월~일
      const lastSunday = new Date(now);
      lastSunday.setUTCDate(now.getUTCDate() - now.getUTCDay());
      const lastMonday = new Date(lastSunday);
      lastMonday.setUTCDate(lastSunday.getUTCDate() - 6);

      from = lastMonday.toISOString().split('T')[0];
      to = lastSunday.toISOString().split('T')[0];
      type = 'weekly';
    } else {
      // 지난달 1일~말일
      const lastMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      );
      const lastDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0),
      );

      from = lastMonth.toISOString().split('T')[0];
      to = lastDay.toISOString().split('T')[0];
      type = 'monthly';
    }

    // 같은 기간 리포트가 이미 있는지 확인 (중복 방지)
    const existing = await prisma.generatedReport.findFirst({
      where: {
        type,
        periodFrom: new Date(from),
        periodTo: new Date(to),
      },
    });

    if (existing) {
      return NextResponse.json({
        message: `이미 생성된 ${type === 'weekly' ? '주간' : '월간'} 리포트가 있습니다`,
        reportId: existing.id,
      });
    }

    // 리포트 데이터 생성
    const reportData = await generateReportData(from, to);

    // DB에 저장
    const report = await prisma.generatedReport.create({
      data: {
        type,
        periodFrom: new Date(from),
        periodTo: new Date(to),
        reportData: JSON.parse(JSON.stringify(reportData)),
      },
    });

    return NextResponse.json({
      message: `${type === 'weekly' ? '주간' : '월간'} 리포트가 생성되었습니다`,
      reportId: report.id,
      period: { from, to },
      kpi: reportData.kpi,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '자동 리포트 생성 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
