import { NextResponse } from 'next/server';

/**
 * 표준 API 응답 포맷
 *
 * 성공: { success: true, data: T, meta?: {...} }
 * 에러: { success: false, error: string }
 */

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** 성공 응답 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/** 페이지네이션 성공 응답 */
export function apiPaginated<T>(
  data: T,
  meta: Omit<PaginationMeta, 'totalPages'>,
) {
  const totalPages = Math.ceil(meta.total / meta.limit);
  return NextResponse.json({
    success: true,
    data,
    meta: { ...meta, totalPages },
  });
}

/** 에러 응답 */
export function apiError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}
