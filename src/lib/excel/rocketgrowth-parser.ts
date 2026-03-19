import XlsxPopulate from 'xlsx-populate';
import {
  ROCKETGROWTH_COLUMNS,
  ROCKETGROWTH_PREFIX_COLUMNS,
  ROCKETGROWTH_REQUIRED_COLUMNS,
} from './column-map';
import { generateProductKey } from '../helpers/product-key';

export type ParsedDailySales = {
  optionId: string;
  exposureProductId: string | null;
  optionName: string;
  productType: string | null;
  categoryName: string | null;
  itemWinnerRate: number | null;
  salesAmount: number;
  salesQuantity: number;
  totalAmount: number | null;
  totalQuantity: number | null;
  cancelAmount: number | null;
  cancelQuantity: number | null;
  immediateCancelQuantity: number | null;
  productKey: string;
};

export type RGParseResult = {
  sales: ParsedDailySales[];
  errors: { row: number; message: string }[];
};

export async function parseRocketGrowthExcel(
  buffer: Buffer,
): Promise<RGParseResult> {
  let workbook;
  try {
    workbook = await XlsxPopulate.fromDataAsync(buffer, { password: '1234' });
  } catch {
    workbook = await XlsxPopulate.fromDataAsync(buffer);
  }

  const sheet = workbook.sheet(0);
  const usedRange = sheet.usedRange();

  if (!usedRange) {
    return { sales: [], errors: [{ row: 0, message: '빈 시트입니다' }] };
  }

  const rows = usedRange.value() as (string | number | null)[][];
  if (rows.length < 2) {
    return { sales: [], errors: [{ row: 0, message: '데이터가 없습니다' }] };
  }

  // 헤더 매핑
  const headers = rows[0].map((h) => (h ? String(h).trim() : ''));
  const columnIndexMap: Record<string, number> = {};

  headers.forEach((header, idx) => {
    // 정확 일치
    if (ROCKETGROWTH_COLUMNS[header]) {
      columnIndexMap[ROCKETGROWTH_COLUMNS[header]] = idx;
      return;
    }
    // startsWith 매칭
    for (const [prefix, field] of Object.entries(ROCKETGROWTH_PREFIX_COLUMNS)) {
      if (header.startsWith(prefix)) {
        columnIndexMap[field] = idx;
        return;
      }
    }
  });

  // 필수 컬럼 체크
  const missingColumns = ROCKETGROWTH_REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col),
  );
  if (missingColumns.length > 0) {
    return {
      sales: [],
      errors: [
        { row: 0, message: `필수 컬럼 누락: ${missingColumns.join(', ')}` },
      ],
    };
  }

  const sales: ParsedDailySales[] = [];
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

      const exposureProductId = getValue('exposureProductId');

      // TOTAL 행 스킵
      if (exposureProductId === 'TOTAL') continue;

      const optionId = getValue('optionId');
      const optionName = getValue('optionName');

      if (!optionId || !optionName) {
        errors.push({ row: i + 1, message: '필수 값 누락 (옵션ID/옵션명)' });
        continue;
      }

      // 아이템위너 비율 파싱 (예: "7.5%" → 7.5)
      let itemWinnerRate: number | null = null;
      const rateRaw = getValue('itemWinnerRate');
      if (rateRaw) {
        const parsed = parseFloat(rateRaw.replace('%', ''));
        if (!isNaN(parsed)) itemWinnerRate = parsed;
      }

      const salesAmount = getNumber('salesAmount') ?? 0;
      const salesQuantity = getNumber('salesQuantity') ?? 0;

      const productKey = generateProductKey(optionName, '');

      sales.push({
        optionId,
        exposureProductId: exposureProductId || null,
        optionName,
        productType: getValue('productType'),
        categoryName: getValue('categoryName'),
        itemWinnerRate,
        salesAmount,
        salesQuantity: Math.round(salesQuantity),
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

  return { sales, errors };
}
