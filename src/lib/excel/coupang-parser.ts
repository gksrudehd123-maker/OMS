import XlsxPopulate from 'xlsx-populate';
import { COUPANG_COLUMNS, COUPANG_REQUIRED_COLUMNS } from './column-map';
import { generateProductKey } from '../helpers/product-key';
import { normalizeDeliveryAttribute } from '../helpers/status-map';
import { toKSTDate } from '../helpers/date-utils';
import type { ParsedOrder, ParseResult } from './smartstore-parser';

/**
 * 쿠팡 윙 주문 상태 추론
 * 쿠팡 엑셀(DeliveryList)에는 주문상태 컬럼이 없음
 * → 배송완료일, 구매확정일자, 출고일 등으로 상태 추론
 */
function inferOrderStatus(row: {
  purchaseDecidedDate: string | null;
  deliveryDate: string | null;
  shipDate: string | null;
}): string {
  if (row.purchaseDecidedDate) return 'PURCHASE_DECIDED';
  if (row.deliveryDate) return 'DELIVERED';
  if (row.shipDate) return 'DELIVERING';
  return 'PAYED';
}

export async function parseCoupangExcel(buffer: Buffer): Promise<ParseResult> {
  let workbook;
  try {
    workbook = await XlsxPopulate.fromDataAsync(buffer, { password: '1234' });
  } catch {
    workbook = await XlsxPopulate.fromDataAsync(buffer);
  }

  const sheet = workbook.sheet(0);
  const usedRange = sheet.usedRange();

  if (!usedRange) {
    return { orders: [], errors: [{ row: 0, message: '빈 시트입니다' }] };
  }

  const rows = usedRange.value() as (string | number | null)[][];
  if (rows.length < 2) {
    return {
      orders: [],
      errors: [{ row: 0, message: '데이터가 없습니다' }],
    };
  }

  // 헤더 매핑
  const headers = rows[0].map((h) => (h ? String(h).trim() : ''));
  const columnIndexMap: Record<string, number> = {};
  headers.forEach((header, idx) => {
    if (COUPANG_COLUMNS[header]) {
      columnIndexMap[COUPANG_COLUMNS[header]] = idx;
    }
  });

  // 필수 컬럼 체크
  const missingColumns = COUPANG_REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col),
  );
  if (missingColumns.length > 0) {
    return {
      orders: [],
      errors: [
        {
          row: 0,
          message: `필수 컬럼 누락: ${missingColumns.join(', ')}`,
        },
      ],
    };
  }

  const orders: ParsedOrder[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    try {
      const getValue = (field: string): string | null => {
        const idx = columnIndexMap[field];
        if (idx === undefined) return null;
        const val = row[idx];
        return val != null ? String(val).trim() : null;
      };

      const orderNumber = getValue('orderNumber');
      const productOrderNumber = getValue('productOrderNumber');
      const orderDateRaw = getValue('orderDate');
      const productName = getValue('productName');
      const quantityRaw = getValue('quantity');

      if (
        !orderNumber ||
        !productOrderNumber ||
        !orderDateRaw ||
        !productName ||
        !quantityRaw
      ) {
        errors.push({ row: i + 1, message: '필수 값 누락' });
        continue;
      }

      // 날짜 파싱
      let rawDate: Date;
      const num = Number(orderDateRaw);
      if (!isNaN(num) && num > 10000) {
        const utcDays = Math.floor(num - 25569);
        const utcMs = utcDays * 86400000;
        const timeFraction = num - Math.floor(num);
        const timeMs = Math.round(timeFraction * 86400000);
        rawDate = new Date(utcMs + timeMs);
      } else {
        rawDate = new Date(orderDateRaw);
      }
      if (isNaN(rawDate.getTime())) {
        errors.push({
          row: i + 1,
          message: `날짜 파싱 오류: ${orderDateRaw}`,
        });
        continue;
      }
      const orderDate = toKSTDate(rawDate);

      const quantity = parseInt(quantityRaw, 10);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ row: i + 1, message: `수량 오류: ${quantityRaw}` });
        continue;
      }

      const optionInfo = getValue('optionInfo') || '';
      const productKey = generateProductKey(productName, optionInfo);

      // 주문 상태 추론 (쿠팡 엑셀에는 주문상태 컬럼 없음)
      const orderStatus = inferOrderStatus({
        purchaseDecidedDate: getValue('purchaseDecidedDate'),
        deliveryDate: getValue('deliveryDate'),
        shipDate: getValue('shipDate'),
      });

      orders.push({
        productOrderNumber,
        orderNumber,
        orderDate,
        orderStatus,
        deliveryAttribute: normalizeDeliveryAttribute(
          getValue('deliveryAttribute'),
        ),
        fulfillmentCompany: getValue('fulfillmentCompany'),
        claimStatus: null,
        quantityClaim: null,
        channelProductId: getValue('channelProductId'),
        productName,
        optionInfo,
        quantity,
        buyerName: getValue('buyerName'),
        buyerId: null,
        recipientName: getValue('recipientName'),
        subscriptionRound: null,
        subscriptionSeq: null,
        productKey,
      });
    } catch (err) {
      errors.push({
        row: i + 1,
        message: `파싱 오류: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { orders, errors };
}
