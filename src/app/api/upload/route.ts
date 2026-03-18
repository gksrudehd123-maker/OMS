import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSmartstoreExcel } from '@/lib/excel/smartstore-parser';
import { generateProductKey } from '@/lib/helpers/product-key';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const channelId = formData.get('channelId') as string | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    }
    if (!channelId) {
      return NextResponse.json(
        { error: '채널을 선택해주세요' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { orders: parsedOrders, errors } = await parseSmartstoreExcel(buffer);

    // Upload 레코드 생성
    const upload = await prisma.upload.create({
      data: {
        fileName: file.name,
        channelId,
        totalRows: parsedOrders.length + errors.length,
        successRows: 0,
        errorRows: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

    let successCount = 0;
    const uploadErrors = [...errors];
    const newProductIds = new Set<string>();

    for (const order of parsedOrders) {
      try {
        // 상품 조회 후 없으면 생성 (신규 상품 추적용)
        let product = await prisma.product.findUnique({
          where: { productKey: order.productKey },
        });
        const isNew = !product;
        if (!product) {
          product = await prisma.product.create({
            data: {
              name: order.productName,
              optionInfo: order.optionInfo,
              productKey: order.productKey,
            },
          });
        }
        if (isNew) {
          newProductIds.add(product.id);
        }

        // 주문 생성 (중복 무시)
        await prisma.order.create({
          data: {
            productOrderNumber: order.productOrderNumber,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            orderStatus: order.orderStatus,
            deliveryAttribute: order.deliveryAttribute,
            fulfillmentCompany: order.fulfillmentCompany,
            claimStatus: order.claimStatus,
            quantityClaim: order.quantityClaim,
            channelProductId: order.channelProductId,
            productName: order.productName,
            optionInfo: order.optionInfo,
            quantity: order.quantity,
            buyerName: order.buyerName,
            buyerId: order.buyerId,
            recipientName: order.recipientName,
            subscriptionRound: order.subscriptionRound,
            subscriptionSeq: order.subscriptionSeq,
            productId: product.id,
            channelId,
            uploadId: upload.id,
          },
        });
        successCount++;
      } catch (err: unknown) {
        const prismaError = err as { code?: string };
        if (prismaError.code === 'P2002') {
          // 중복 주문 - 건너뛰기
          uploadErrors.push({
            row: 0,
            message: `중복 주문: ${order.productOrderNumber}`,
          });
        } else {
          uploadErrors.push({
            row: 0,
            message: `저장 오류: ${order.productOrderNumber}`,
          });
        }
      }
    }

    // Upload 결과 업데이트
    const updatedUpload = await prisma.upload.update({
      where: { id: upload.id },
      data: {
        successRows: successCount,
        errorRows: uploadErrors.length,
        errors: uploadErrors.length > 0 ? uploadErrors : undefined,
      },
    });

    // 신규 상품 목록 조회 (가격 미설정 상품)
    const newProducts =
      newProductIds.size > 0
        ? await prisma.product.findMany({
            where: { id: { in: [...newProductIds] } },
            select: {
              id: true,
              name: true,
              optionInfo: true,
              sellingPrice: true,
              costPrice: true,
              shippingCost: true,
              freeShippingMin: true,
            },
          })
        : [];

    return NextResponse.json({
      upload: updatedUpload,
      summary: {
        total: parsedOrders.length + errors.length,
        success: successCount,
        errors: uploadErrors.length,
        duplicates: uploadErrors.filter((e) => e.message.startsWith('중복'))
          .length,
      },
      newProducts,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: '파일 처리 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const [uploads, total] = await Promise.all([
    prisma.upload.findMany({
      include: { channel: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.upload.count(),
  ]);

  return NextResponse.json({ uploads, total, page, limit });
}
