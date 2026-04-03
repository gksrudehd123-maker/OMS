import bcrypt from 'bcryptjs';
import { generateProductKey } from '@/lib/helpers/product-key';
import { toKSTDate } from '@/lib/helpers/date-utils';
import { ParsedOrder } from '@/lib/excel/smartstore-parser';

const TOKEN_URL = 'https://api.commerce.naver.com/external/v1/oauth2/token';
const API_BASE = 'https://api.commerce.naver.com/external';

/**
 * 스토어 코드별 네이버 API 키 반환
 */
function getNaverApiKeys(channelCode?: string): {
  clientId: string;
  clientSecret: string;
} {
  switch (channelCode) {
    case 'SMARTSTORE_WELSPA':
      return {
        clientId: process.env.NAVER_CLIENT_ID_WELSPA || '',
        clientSecret: process.env.NAVER_CLIENT_SECRET_WELSPA || '',
      };
    default:
      return {
        clientId: process.env.NAVER_CLIENT_ID || '',
        clientSecret: process.env.NAVER_CLIENT_SECRET || '',
      };
  }
}

/**
 * 네이버 커머스 API 인증 토큰 발급
 * client_secret_sign = Base64(bcrypt(clientId + "_" + timestamp, clientSecret))
 * @param channelCode 채널 코드 (기본: SMARTSTORE)
 */
export async function getNaverToken(channelCode?: string): Promise<string> {
  const { clientId, clientSecret } = getNaverApiKeys(channelCode);

  if (!clientId || !clientSecret) {
    throw new Error(
      `네이버 API 키가 설정되지 않았습니다 (${channelCode || 'SMARTSTORE'})`,
    );
  }

  const timestamp = Date.now();
  const password = `${clientId}_${timestamp}`;
  const hashedSign = bcrypt.hashSync(password, clientSecret);
  const clientSecretSign = Buffer.from(hashedSign).toString('base64');

  const body = new URLSearchParams({
    client_id: clientId,
    timestamp: String(timestamp),
    client_secret_sign: clientSecretSign,
    grant_type: 'client_credentials',
    type: 'SELF',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`토큰 발급 실패: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * 조건형 상품 주문 상세 내역 조회
 * GET /v1/pay-order/seller/product-orders
 * 주문 날짜 기준으로 전체 주문을 페이지 단위로 조회
 */
export async function fetchProductOrders(
  token: string,
  from: string,
  to: string,
): Promise<NaverProductOrder[]> {
  const allOrders: NaverProductOrder[] = [];
  let hasMore = true;
  let pageToken: string | null = null;

  while (hasMore) {
    const params = new URLSearchParams({
      from,
      to,
      rangeType: 'PAYED_DATETIME',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const url = `${API_BASE}/v1/pay-order/seller/product-orders?${params}`;
    console.log('[Naver API] 주문 조회:', url);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`주문 조회 실패: ${res.status} ${err}`);
    }

    const data = await res.json();
    const contents = data?.data?.contents || [];

    console.log(`[Naver API] ${contents.length}건 조회됨`);

    // 첫 페이지 첫 주문 raw 데이터 로그 (디버깅용)
    if (contents.length > 0 && allOrders.length === 0) {
      console.log(
        '[Naver API] 첫 주문 raw 데이터:',
        JSON.stringify(contents[0], null, 2),
      );
    }

    for (const item of contents) {
      const po = item.content?.productOrder || item.productOrder;
      const order = item.content?.order || item.order;
      if (po && order) {
        allOrders.push({
          productOrderId: item.productOrderId || po.productOrderId,
          orderId: order.orderId,
          productOrderStatus: po.productOrderStatus,
          claimStatus: po.claimStatus || null,
          orderDate: order.orderDate,
          productId: po.productId || '',
          productName: po.productName,
          productOption: po.optionManageCode || po.productOption || '',
          optionCode: po.optionCode || null,
          optionManageCode: po.optionManageCode || null,
          quantity: po.quantity,
          deliveryAttributeType: po.deliveryAttributeType || null,
          deliveryCompany: po.shippingMemo || null,
          buyerName: order.ordererName || null,
          buyerId: order.ordererId || null,
          recipientName: po.shippingAddress?.name || null,
        });
      }
    }

    // 다음 페이지 확인
    pageToken = data?.data?.nextToken || null;
    hasMore = !!pageToken;
  }

  return allOrders;
}

// 네이버 API 응답의 상품주문 타입
export type NaverProductOrder = {
  productOrderId: string;
  orderId: string;
  productOrderStatus: string;
  claimStatus: string | null;
  orderDate: string;
  productId: string;
  productName: string;
  optionCode: string | null;
  optionManageCode: string | null;
  productOption: string;
  quantity: number;
  deliveryAttributeType: string | null;
  deliveryCompany: string | null;
  buyerName: string | null;
  buyerId: string | null;
  recipientName: string | null;
};

/**
 * 네이버 API 응답을 ParsedOrder 형태로 변환
 */
export function convertToParseOrders(
  naverOrders: NaverProductOrder[],
): ParsedOrder[] {
  return naverOrders.map((order) => {
    const optionInfo = order.productOption || '';
    return {
      productOrderNumber: order.productOrderId,
      orderNumber: order.orderId,
      orderDate: toKSTDate(new Date(order.orderDate)),
      orderStatus: order.productOrderStatus,
      deliveryAttribute: order.deliveryAttributeType,
      fulfillmentCompany: order.deliveryCompany,
      claimStatus: order.claimStatus,
      quantityClaim: null,
      channelProductId: order.productId,
      productName: order.productName,
      optionInfo,
      quantity: order.quantity,
      buyerName: order.buyerName,
      buyerId: order.buyerId,
      recipientName: order.recipientName,
      subscriptionRound: null,
      subscriptionSeq: null,
      productKey: generateProductKey(order.productName, optionInfo),
    };
  });
}
