'use client';

import { useTheme } from 'next-themes';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block, PartialBlock } from '@blocknote/core';
import { toast } from 'sonner';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

type Props = {
  initialContent?: PartialBlock[];
  editable: boolean;
  // 편집 중 최신 문서를 부모로 전달 (저장 시 사용)
  onChange?: (blocks: Block[]) => void;
};

// imgbb 업로드 (추후 Supabase Storage 교체 시 이 함수만 변경)
async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.set('file', file);
  const res = await fetch('/api/handover/upload-image', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    toast.error(json.error || '이미지 업로드에 실패했습니다');
    throw new Error(json.error || 'upload failed');
  }
  return json.data.url as string;
}

export default function HandoverEditor({
  initialContent,
  editable,
  onChange,
}: Props) {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length > 0 ? initialContent : undefined,
    uploadFile,
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      onChange={() => onChange?.(editor.document)}
    />
  );
}
