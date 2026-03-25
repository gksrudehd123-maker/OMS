/**
 * 네이버 쇼핑 검색 API 클라이언트
 * https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
 */

interface NaverShoppingItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

interface NaverShoppingResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverShoppingItem[];
}

export interface RankResult {
  rank: number | null;  // null이면 100위 밖
  page: number | null;
  matchedItem?: {
    title: string;
    link: string;
    mallName: string;
    productId: string;
  };
}

/**
 * 네이버 쇼핑 검색 API 호출
 */
async function searchShopping(
  query: string,
  start: number = 1,
  display: number = 100,
): Promise<NaverShoppingResponse> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET 환경 변수가 필요합니다');
  }

  const params = new URLSearchParams({
    query,
    display: String(Math.min(display, 100)),
    start: String(start),
    sort: 'sim', // 정확도순 (네이버 기본 노출 순서)
  });

  const res = await fetch(
    `https://openapi.naver.com/v1/search/shop.json?${params}`,
    {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`네이버 검색 API 오류: ${res.status} ${err}`);
  }

  return res.json();
}

/**
 * 키워드로 검색하여 내 상품의 순위를 찾기
 * @param keyword 검색 키워드
 * @param storeName 내 스토어명 (mallName 매칭)
 * @param storeProductId 특정 상품 ID (선택, 더 정확한 매칭)
 */
export async function checkKeywordRank(
  keyword: string,
  storeName: string,
  storeProductId?: string,
): Promise<RankResult> {
  // 최대 100개까지 검색 (네이버 API 제한)
  const data = await searchShopping(keyword, 1, 100);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];

    // storeProductId로 정확 매칭
    if (storeProductId && item.productId === storeProductId) {
      return {
        rank: i + 1,
        page: Math.ceil((i + 1) / 40), // 네이버 쇼핑 1페이지 = 40개
        matchedItem: {
          title: item.title.replace(/<[^>]*>/g, ''),
          link: item.link,
          mallName: item.mallName,
          productId: item.productId,
        },
      };
    }

    // mallName으로 매칭
    if (item.mallName === storeName) {
      return {
        rank: i + 1,
        page: Math.ceil((i + 1) / 40),
        matchedItem: {
          title: item.title.replace(/<[^>]*>/g, ''),
          link: item.link,
          mallName: item.mallName,
          productId: item.productId,
        },
      };
    }
  }

  // 100위 안에 없음
  return { rank: null, page: null };
}
