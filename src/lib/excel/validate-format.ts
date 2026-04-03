import XlsxPopulate from 'xlsx-populate';
import {
  REQUIRED_COLUMNS,
  COUPANG_REQUIRED_COLUMNS,
  ROCKETGROWTH_REQUIRED_COLUMNS,
  COUPANG_WING_REQUIRED_COLUMNS,
} from './column-map';

// 스마트스토어 엑셀 고유 헤더 (쿠팡에는 없는 것)
const SMARTSTORE_SIGNATURE = ['상품주문번호', '주문일시', '주문상태'];
// 쿠팡 엑셀 고유 헤더 (스마트스토어에는 없는 것)
const COUPANG_SIGNATURE = ['묶음배송번호', '등록상품명', '노출상품ID'];

export type DetectedFormat =
  | 'smartstore'
  | 'coupang'
  | 'coupang_wing'
  | 'rocketgrowth'
  | 'unknown';
export type ExpectedFormat =
  | 'smartstore'
  | 'coupang'
  | 'coupang_wing'
  | 'rocketgrowth';

export type FormatValidation = {
  valid: boolean;
  detectedFormat: DetectedFormat;
  expectedFormat: ExpectedFormat;
  error?: string;
};

const FORMAT_NAMES: Record<string, string> = {
  smartstore: '스마트스토어',
  coupang: '쿠팡 (배송목록)',
  coupang_wing: '쿠팡 윙 (판매통계)',
  rocketgrowth: '로켓그로스',
};

/**
 * 엑셀 헤더를 읽어서 채널과 양식이 일치하는지 검증
 */
export async function validateExcelFormat(
  buffer: Buffer,
  channelCode: string,
): Promise<FormatValidation> {
  let expectedFormat: ExpectedFormat;
  if (channelCode === 'coupang_rocket_growth') {
    expectedFormat = 'rocketgrowth';
  } else if (channelCode === 'coupang_wing') {
    expectedFormat = 'coupang_wing';
  } else if (channelCode.startsWith('coupang_')) {
    expectedFormat = 'coupang';
  } else {
    expectedFormat = 'smartstore';
  }

  let workbook;
  try {
    workbook = await XlsxPopulate.fromDataAsync(buffer, { password: '1234' });
  } catch {
    try {
      workbook = await XlsxPopulate.fromDataAsync(buffer);
    } catch {
      return {
        valid: false,
        detectedFormat: 'unknown',
        expectedFormat,
        error: '엑셀 파일을 읽을 수 없습니다',
      };
    }
  }

  const sheet = workbook.sheet(0);
  const usedRange = sheet.usedRange();
  if (!usedRange) {
    return {
      valid: false,
      detectedFormat: 'unknown',
      expectedFormat,
      error: '빈 시트입니다',
    };
  }

  const rows = usedRange.value() as (string | number | null)[][];
  if (rows.length < 1) {
    return {
      valid: false,
      detectedFormat: 'unknown',
      expectedFormat,
      error: '헤더가 없습니다',
    };
  }

  const headers = rows[0].map((h) => (h ? String(h).trim() : ''));

  // 양식 감지
  const hasSmartstoreHeaders = SMARTSTORE_SIGNATURE.every((col) =>
    headers.includes(col),
  );
  const hasCoupangHeaders = COUPANG_SIGNATURE.every((col) =>
    headers.includes(col),
  );
  const hasRGHeaders =
    headers.includes('옵션ID') &&
    headers.includes('옵션명') &&
    headers.some((h) => h.startsWith('아이템위너'));
  // 쿠팡 윙 SELLER_INSIGHTS: '옵션 ID'(공백) + '판매방식'
  const hasCWHeaders =
    headers.includes('옵션 ID') &&
    headers.includes('상품명') &&
    headers.includes('판매방식');

  let detectedFormat: DetectedFormat = 'unknown';
  if (
    hasCWHeaders &&
    !hasSmartstoreHeaders &&
    !hasCoupangHeaders &&
    !hasRGHeaders
  ) {
    detectedFormat = 'coupang_wing';
  } else if (hasRGHeaders && !hasSmartstoreHeaders && !hasCoupangHeaders) {
    detectedFormat = 'rocketgrowth';
  } else if (hasSmartstoreHeaders && !hasCoupangHeaders) {
    detectedFormat = 'smartstore';
  } else if (hasCoupangHeaders && !hasSmartstoreHeaders) {
    detectedFormat = 'coupang';
  }

  // 불일치 검증
  if (detectedFormat !== 'unknown' && detectedFormat !== expectedFormat) {
    const detectedName = FORMAT_NAMES[detectedFormat] || detectedFormat;
    const expectedName = FORMAT_NAMES[expectedFormat] || expectedFormat;
    return {
      valid: false,
      detectedFormat,
      expectedFormat,
      error: `${expectedName} 채널에 ${detectedName} 엑셀 파일이 업로드되었습니다. 채널을 확인해주세요.`,
    };
  }

  // 필수 컬럼 체크
  let requiredCols: string[];
  if (expectedFormat === 'rocketgrowth') {
    requiredCols = ROCKETGROWTH_REQUIRED_COLUMNS;
  } else if (expectedFormat === 'coupang_wing') {
    requiredCols = COUPANG_WING_REQUIRED_COLUMNS;
  } else if (expectedFormat === 'coupang') {
    requiredCols = COUPANG_REQUIRED_COLUMNS;
  } else {
    requiredCols = REQUIRED_COLUMNS;
  }

  const missing = requiredCols.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    return {
      valid: false,
      detectedFormat,
      expectedFormat,
      error: `필수 컬럼 누락: ${missing.join(', ')}`,
    };
  }

  return { valid: true, detectedFormat, expectedFormat };
}
