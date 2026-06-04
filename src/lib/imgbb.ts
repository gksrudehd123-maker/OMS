// imgbb 이미지 호스팅 (인수인계 문서 스크린샷용)
// 무료 API, 이미지당 32MB 제한, 직링크 URL 반환
// docs: https://api.imgbb.com/
//
// ⚠️ 추후 Supabase Storage로 교체 예정.
//    교체 시 uploadToImgbb() 내부만 바꾸면 되고, 본문에는 URL만 저장되므로
//    기존 문서는 그대로 유지된다.

export type ImageUploadResult = {
  url: string; // 직링크 (i.ibb.co/...)
  displayUrl: string;
  deleteUrl: string;
};

export async function uploadToImgbb(
  buffer: Buffer,
  filename?: string,
): Promise<ImageUploadResult> {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('IMGBB_API_KEY 환경 변수가 필요합니다');
  }

  const form = new FormData();
  form.set('image', buffer.toString('base64'));
  if (filename) form.set('name', filename);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`imgbb 업로드 실패: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    success: boolean;
    data?: {
      url: string;
      display_url: string;
      delete_url: string;
    };
    error?: { message: string };
  };

  if (!json.success || !json.data) {
    throw new Error(`imgbb 업로드 실패: ${json.error?.message || 'unknown'}`);
  }

  return {
    url: json.data.url,
    displayUrl: json.data.display_url,
    deleteUrl: json.data.delete_url,
  };
}
