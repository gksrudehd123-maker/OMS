import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import XlsxPopulate from 'xlsx-populate';
import { SMARTSTORE_COLUMNS, REQUIRED_COLUMNS } from './column-map';
import { generateProductKey } from '../helpers/product-key';
import { normalizeOrderStatus, normalizeDeliveryAttribute } from '../helpers/status-map';

export type ParsedOrder = {
  productOrderNumber: string;
  orderNumber: string;
  orderDate: Date;
  orderStatus: string;
  deliveryAttribute: string | null;
  fulfillmentCompany: string | null;
  claimStatus: string | null;
  quantityClaim: string | null;
  channelProductId: string | null;
  productName: string;
  optionInfo: string;
  quantity: number;
  buyerName: string | null;
  buyerId: string | null;
  recipientName: string | null;
  subscriptionRound: string | null;
  subscriptionSeq: string | null;
  productKey: string;
};

export type ParseResult = {
  orders: ParsedOrder[];
  errors: { row: number; message: string }[];
};

async function decryptExcel(buffer: Buffer, password: string): Promise<Buffer> {
  const ts = Date.now();
  const inputPath = join(tmpdir(), `oms_enc_${ts}.xlsx`);
  const outputPath = join(tmpdir(), `oms_dec_${ts}.xlsx`);
  const scriptPath = join(tmpdir(), `oms_decrypt_${ts}.py`);

  try {
    writeFileSync(inputPath, buffer);
    writeFileSync(
      scriptPath,
      `import msoffcrypto, io, sys, shutil
with open(sys.argv[1], "rb") as f:
    ms = msoffcrypto.OfficeFile(f)
    if ms.is_encrypted():
        ms.load_key(password=sys.argv[3])
        dec = io.BytesIO()
        ms.decrypt(dec)
        with open(sys.argv[2], "wb") as out:
            out.write(dec.getvalue())
    else:
        shutil.copy2(sys.argv[1], sys.argv[2])
`,
    );
    execSync(`python "${scriptPath}" "${inputPath}" "${outputPath}" "${password}"`);
    return readFileSync(outputPath);
  } finally {
    for (const p of [inputPath, outputPath, scriptPath]) {
      try {
        unlinkSync(p);
      } catch {}
    }
  }
}

export async function parseSmartstoreExcel(
  buffer: Buffer,
  password: string = '1234',
): Promise<ParseResult> {
  const decryptedBuffer = await decryptExcel(buffer, password);
  const workbook = await XlsxPopulate.fromDataAsync(decryptedBuffer);
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
    if (SMARTSTORE_COLUMNS[header]) {
      columnIndexMap[SMARTSTORE_COLUMNS[header]] = idx;
    }
  });

  // 필수 컬럼 체크
  const missingColumns = REQUIRED_COLUMNS.filter(
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

      const productOrderNumber = getValue('productOrderNumber');
      const orderNumber = getValue('orderNumber');
      const orderDateRaw = getValue('orderDate');
      const orderStatus = getValue('orderStatus');
      const productName = getValue('productName');
      const quantityRaw = getValue('quantity');

      if (
        !productOrderNumber ||
        !orderNumber ||
        !orderDateRaw ||
        !orderStatus ||
        !productName ||
        !quantityRaw
      ) {
        errors.push({ row: i + 1, message: '필수 값 누락' });
        continue;
      }

      let orderDate: Date;
      const num = Number(orderDateRaw);
      if (!isNaN(num) && num > 10000) {
        // 엑셀 시리얼 넘버 → Date 변환
        const utcDays = Math.floor(num - 25569);
        const utcMs = utcDays * 86400000;
        const timeFraction = num - Math.floor(num);
        const timeMs = Math.round(timeFraction * 86400000);
        orderDate = new Date(utcMs + timeMs);
      } else {
        orderDate = new Date(orderDateRaw);
      }
      if (isNaN(orderDate.getTime())) {
        errors.push({ row: i + 1, message: `날짜 파싱 오류: ${orderDateRaw}` });
        continue;
      }

      const quantity = parseInt(quantityRaw, 10);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({
          row: i + 1,
          message: `수량 오류: ${quantityRaw}`,
        });
        continue;
      }

      const optionInfo = getValue('optionInfo') || '';
      const productKey = generateProductKey(productName, optionInfo);

      orders.push({
        productOrderNumber,
        orderNumber,
        orderDate,
        orderStatus: normalizeOrderStatus(orderStatus),
        deliveryAttribute: normalizeDeliveryAttribute(getValue('deliveryAttribute')),
        fulfillmentCompany: getValue('fulfillmentCompany'),
        claimStatus: getValue('claimStatus'),
        quantityClaim: getValue('quantityClaim'),
        channelProductId: getValue('channelProductId'),
        productName,
        optionInfo,
        quantity,
        buyerName: getValue('buyerName'),
        buyerId: getValue('buyerId'),
        recipientName: getValue('recipientName'),
        subscriptionRound: getValue('subscriptionRound'),
        subscriptionSeq: getValue('subscriptionSeq'),
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
