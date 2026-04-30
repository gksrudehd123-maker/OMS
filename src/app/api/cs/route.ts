import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { writeAuditLog } from '@/lib/audit-log';
import { apiSuccess, apiError } from '@/lib/api-response';
import { parseDate } from '@/lib/helpers/date-utils';

// CS 목록 조회
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const month = searchParams.get('month'); // YYYY-MM
  const search = searchParams.get('search');

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (month) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 0));
    where.consultDate = { gte: from, lte: to };
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search } },
    ];
  }

  const records = await prisma.cSRecord.findMany({
    where,
    orderBy: [{ consultDate: 'desc' }, { status: 'asc' }],
  });

  // 같은 상담날짜 내에서 미처리 우선 정렬 (교환요청, 진행 중, 미입고, 연락처없음, 환불 → 안내완료)
  const statusOrder: Record<string, number> = {
    교환요청: 0,
    '진행 중': 1,
    미입고: 2,
    연락처없음: 3,
    환불: 4,
    안내완료: 5,
    완료: 6,
  };

  records.sort((a, b) => {
    const dateDiff =
      new Date(b.consultDate).getTime() - new Date(a.consultDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    const orderA = statusOrder[a.status] ?? 3;
    const orderB = statusOrder[b.status] ?? 3;
    return orderA - orderB;
  });

  return apiSuccess(records);
}

// CS 등록
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const { consultDate, customerName, productName } = body;

    if (!consultDate || !customerName || !productName) {
      return apiError('상담날짜, 고객명, 제품명은 필수입니다');
    }

    const record = await prisma.cSRecord.create({
      data: {
        consultDate: parseDate(consultDate),
        purchaseDate: body.purchaseDate ? parseDate(body.purchaseDate) : null,
        status: body.status || '안내완료',
        receivedDate: body.receivedDate ? parseDate(body.receivedDate) : null,
        customerName,
        productName,
        consultNote: body.consultNote || null,
        receivedProduct: body.receivedProduct || null,
        serviceProgress: body.serviceProgress || null,
        shippingDate: body.shippingDate ? parseDate(body.shippingDate) : null,
        customerAddress: body.customerAddress || null,
        customerPhone: body.customerPhone || '',
        chargeType: body.chargeType || '유상',
        repairCost: body.repairCost ? parseInt(body.repairCost) : null,
        trackingNumber: body.trackingNumber || null,
      },
    });

    writeAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      target: 'CSRecord',
      targetId: record.id,
      summary: `CS 등록 - ${customerName} / ${productName}`,
    });

    return apiSuccess(record);
  } catch (err) {
    console.error('CS create error:', err);
    return apiError('CS 등록 중 오류가 발생했습니다', 500);
  }
}
