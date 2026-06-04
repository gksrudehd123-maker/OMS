import { NextRequest } from 'next/server';
import { requireRole, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { uploadToImgbb } from '@/lib/imgbb';

// 인수인계 문서 이미지 업로드 (OWNER 전용)
// BlockNote 에디터의 uploadFile에서 FormData(file)로 호출 → { url } 반환
export async function POST(request: NextRequest) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return apiError('이미지 파일이 필요합니다');
    }

    if (!file.type.startsWith('image/')) {
      return apiError('이미지 파일만 업로드할 수 있습니다');
    }

    // imgbb 무료 한도 32MB
    if (file.size > 32 * 1024 * 1024) {
      return apiError('이미지는 32MB 이하만 업로드할 수 있습니다');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToImgbb(buffer, file.name);

    return apiSuccess({ url: result.url });
  } catch (err) {
    console.error('handover image upload error:', err);
    return apiError('이미지 업로드 중 오류가 발생했습니다', 500);
  }
}
