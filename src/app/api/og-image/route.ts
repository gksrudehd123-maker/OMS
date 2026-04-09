import { NextRequest } from 'next/server';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 스토어 URL에서 OG 이미지 추출
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const url = request.nextUrl.searchParams.get('url');
  if (!url) return apiError('URL이 필요합니다');

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const html = await res.text();

    // og:image 메타 태그 추출
    const match =
      html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      );

    if (match?.[1]) {
      return apiSuccess({ imageUrl: match[1] });
    }

    return apiSuccess({ imageUrl: null });
  } catch (err) {
    console.error('OG image fetch error:', err);
    return apiError('이미지를 가져올 수 없습니다', 500);
  }
}
