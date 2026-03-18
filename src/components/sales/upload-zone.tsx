'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type UploadResult = {
  summary: {
    total: number;
    success: number;
    errors: number;
    duplicates: number;
  };
};

export function UploadZone({
  channelId,
  onUploadComplete,
}: {
  channelId: string;
  onUploadComplete: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.name.endsWith('.xlsx')) {
        toast.error('xlsx 파일만 업로드 가능합니다');
        return;
      }

      setUploading(true);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('channelId', channelId);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '업로드 실패');
        }

        const data = await res.json();
        setResult(data);
        toast.success(`${data.summary.success}건 업로드 완료`);
        onUploadComplete();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '업로드 중 오류 발생');
      } finally {
        setUploading(false);
      }
    },
    [channelId, onUploadComplete],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
    },
    maxFiles: 1,
    disabled: uploading || !channelId,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        } ${uploading ? 'pointer-events-none opacity-50' : ''} ${!channelId ? 'pointer-events-none opacity-30' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">
              파일 처리 중...
            </p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">
              엑셀 파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              스마트스토어 주문조회 .xlsx 파일
            </p>
          </>
        )}
      </div>

      {result && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-medium">업로드 결과</h4>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span>전체 {result.summary.total}건</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>성공 {result.summary.success}건</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-danger" />
              <span>
                실패 {result.summary.errors}건
                {result.summary.duplicates > 0 &&
                  ` (중복 ${result.summary.duplicates}건)`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
