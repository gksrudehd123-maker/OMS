import XlsxPopulate from 'xlsx-populate';
import {
  COUPANG_WING_COLUMNS,
  COUPANG_WING_PREFIX_COLUMNS,
  COUPANG_WING_REQUIRED_COLUMNS,
} from './column-map';
import { generateProductKey } from '../helpers/product-key';

export type ParsedCoupangWingMetrics = {
  optionId: string;
  registeredProductId: string | null;
  optionName: string;
  productName: string;
  categoryName: string | null;
  salesMethod: string | null;
  salesAmount: number;
  orderCount: number;
  salesQuantity: number;
  visitors: number | null;
  views: number | null;
  cart: number | null;
  conversionRate: number | null;
  itemWinnerRate: number | null;
  totalAmount: number | null;
  totalQuantity: number | null;
  cancelAmount: number | null;
  cancelQuantity: number | null;
  immediateCancelQuantity: number | null;
  productKey: string;
};

export type CWParseResult = {
  metrics: ParsedCoupangWingMetrics[];
  errors: { row: number; message: string }[];
};

export async function parseCoupangWingExcel(
  buffer: Buffer,
): Promise<CWParseResult> {
  let workbook;
  try {
    workbook = await XlsxPopulate.fromDataAsync(buffer, { password: '1234' });
  } catch {
    workbook = await XlsxPopulate.fromDataAsync(buffer);
  }

  const sheet = workbook.sheet(0);
  const usedRange = sheet.usedRange();

  if (!usedRange) {
    return { metrics: [], errors: [{ row: 0, message: '빈 시트입니다' }] };
  }

  const rows = usedRange.value() as (string | number | null)[][];
  if (rows.length < 2) {
    return { metrics: [], errors: [{ row: 0, message: '데이터가 없습니다' }] };
  }

  // 헤더 매핑
  const headers = rows[0].map((h) => (h ? String(h).trim() : ''));
  const columnIndexMap: Record<string, number> = {};

  headers.forEach((header, idx) => {
    // 정확 일치
    if (COUPANG_WING_COLUMNS[header]) {
      columnIndexMap[COUPANG_WING_COLUMNS[header]] = idx;
      return;
    }
    // startsWith 매칭 (긴 prefix 우선 매칭을 위해 정렬)
    const prefixEntries = Object.entries(COUPANG_WING_PREFIX_COLUMNS).sort(
      (a, b) => b[0].length - a[0].length,
    );
    for (const [prefix, field] of prefixEntries) {
      if (header.startsWith(prefix) && !columnIndexMap[field]) {
        columnIndexMap[field] = idx;
        return;
      }
    }
  });

  // 필수 컬럼 체크
  const missingColumns = COUPANG_WING_REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col),
  );
  if (missingColumns.length > 0) {
    return {
      metrics: [],
      errors: [
        { row: 0, message: `필수 컬럼 누락: ${missingColumns.join(', ')}` },
      ],
    };
  }

  const metrics: ParsedCoupangWingMetrics[] = [];
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

      const getNumber = (field: string): number | null => {
        const val = getValue(field);
        if (val === null || val === '') return null;
        const num = Number(val.replace(/,/g, ''));
        return isNaN(num) ? null : num;
      };

      const optionId = getValue('optionId');
      const optionName = getValue('optionName');
      const productName = getValue('productName');

      if (!optionId || !optionName || !productName) {
        errors.push({
          row: i + 1,
          message: '필수 값 누락 (옵션 ID/옵션명/상품명)',
        });
        continue;
      }

      // 아이템위너 비율 파싱 (예: "100" 또는 "7.5%")
      let itemWinnerRate: number | null = null;
      const rateRaw = getValue('itemWinnerRate');
      if (rateRaw) {
        const parsed = parseFloat(rateRaw.replace('%', ''));
        if (!isNaN(parsed)) itemWinnerRate = parsed;
      }

      // 구매전환율 파싱 (예: "2.56%")
      let conversionRate: number | null = null;
      const crRaw = getValue('conversionRate');
      if (crRaw) {
        const parsed = parseFloat(crRaw.replace('%', ''));
        if (!isNaN(parsed)) conversionRate = parsed;
      }

      const salesAmount = getNumber('salesAmount') ?? 0;
      const salesQuantity = getNumber('salesQuantity') ?? 0;

      const productKey = generateProductKey(optionName, '');

      metrics.push({
        optionId,
        registeredProductId: getValue('registeredProductId'),
        optionName,
        productName,
        categoryName: getValue('categoryName'),
        salesMethod: getValue('salesMethod'),
        salesAmount,
        orderCount: Math.round(getNumber('orderCount') ?? 0),
        salesQuantity: Math.round(salesQuantity),
        visitors:
          getNumber('visitors') !== null
            ? Math.round(getNumber('visitors')!)
            : null,
        views:
          getNumber('views') !== null ? Math.round(getNumber('views')!) : null,
        cart:
          getNumber('cart') !== null ? Math.round(getNumber('cart')!) : null,
        conversionRate,
        itemWinnerRate,
        totalAmount: getNumber('totalAmount'),
        totalQuantity:
          getNumber('totalQuantity') !== null
            ? Math.round(getNumber('totalQuantity')!)
            : null,
        cancelAmount: getNumber('cancelAmount'),
        cancelQuantity:
          getNumber('cancelQuantity') !== null
            ? Math.round(getNumber('cancelQuantity')!)
            : null,
        immediateCancelQuantity:
          getNumber('immediateCancelQuantity') !== null
            ? Math.round(getNumber('immediateCancelQuantity')!)
            : null,
        productKey,
      });
    } catch (err) {
      errors.push({
        row: i + 1,
        message: `파싱 오류: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { metrics, errors };
}
