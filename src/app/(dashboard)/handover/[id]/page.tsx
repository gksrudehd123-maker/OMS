'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Block, PartialBlock } from '@blocknote/core';
import { Toaster, toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  Save,
  Trash2,
  X,
  CheckCircle2,
  Circle,
  ListTree,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// BlockNote는 SSR 불가 → 클라이언트 전용 동적 임포트
const HandoverEditor = dynamic(
  () => import('@/components/handover/handover-editor'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  },
);

type Viewer = { userId: string; userName: string };

type DocData = {
  id: string;
  title: string;
  category: string | null;
  content: PartialBlock[];
  createdByName: string;
  updatedAt: string;
  canEdit: boolean;
  isPublished?: boolean;
  viewers?: Viewer[];
  isRead?: boolean;
  readAt?: string | null;
};

type UserRow = { id: string; name: string; email: string; role: string };

type ReadStatus = {
  userId: string;
  userName: string;
  isRead: boolean;
  readAt: string | null;
};

type Heading = { id: string; text: string; level: number };

// 블록 트리에서 제목 블록만 추출해 목차(TOC) 생성
function extractHeadings(blocks: PartialBlock[] | Block[]): Heading[] {
  const out: Heading[] = [];
  const walk = (list: (PartialBlock | Block)[]) => {
    for (const block of list) {
      if (block.type === 'heading' && block.id) {
        const text = Array.isArray(block.content)
          ? block.content
              .map((c) =>
                c && typeof c === 'object' && 'text' in c
                  ? (c as { text: string }).text
                  : '',
              )
              .join('')
          : '';
        const level = (block.props as { level?: number })?.level ?? 1;
        if (text.trim()) out.push({ id: block.id, text, level });
      }
      if (Array.isArray(block.children)) walk(block.children);
    }
  };
  walk(blocks as (PartialBlock | Block)[]);
  return out;
}

export default function HandoverDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const docId = params.id;

  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // 편집 폼 상태
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [viewerIds, setViewerIds] = useState<Set<string>>(new Set());
  const contentRef = useRef<Block[] | null>(null);
  const [blocks, setBlocks] = useState<PartialBlock[] | Block[]>([]);

  const {
    data: doc,
    isLoading,
    error,
  } = useQuery<DocData>({
    queryKey: ['handover', docId],
    queryFn: async () => {
      const res = await fetch(`/api/handover/${docId}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || '문서를 불러올 수 없습니다');
      return json.data;
    },
    retry: false,
  });

  // 문서 로드 시 폼/목차 초기화
  useEffect(() => {
    if (!doc) return;
    setTitle(doc.title);
    setCategory(doc.category ?? '');
    setIsPublished(doc.isPublished ?? false);
    setViewerIds(new Set((doc.viewers ?? []).map((v) => v.userId)));
    setBlocks(doc.content ?? []);
    contentRef.current = (doc.content as Block[]) ?? [];
    // OWNER가 ?edit=1로 진입하면 편집 모드
    if (doc.canEdit && searchParams.get('edit') === '1') {
      setMode('edit');
    }
  }, [doc, searchParams]);

  // OWNER 전용 사용자 목록 (열람자 선택)
  const { data: users } = useQuery<UserRow[]>({
    queryKey: ['handover-users'],
    enabled: !!doc?.canEdit && mode === 'edit',
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('사용자 목록을 불러올 수 없습니다');
      return res.json();
    },
  });

  // OWNER 전용 읽음 현황
  const { data: readStatus } = useQuery<ReadStatus[]>({
    queryKey: ['handover-reads', docId],
    enabled: !!doc?.canEdit && mode === 'view',
    queryFn: async () => {
      const res = await fetch(`/api/handover/${docId}/reads`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('제목을 입력해주세요');
      const res = await fetch(`/api/handover/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || null,
          isPublished,
          viewerIds: Array.from(viewerIds),
          content: contentRef.current ?? [],
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover', docId] });
      queryClient.invalidateQueries({ queryKey: ['handover'] });
      toast.success('저장되었습니다');
      setMode('view');
    },
    onError: (e: Error) => toast.error(e.message || '저장에 실패했습니다'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/handover/${docId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover'] });
      toast.success('삭제되었습니다');
      router.push('/handover');
    },
    onError: (e: Error) => toast.error(e.message || '삭제에 실패했습니다'),
  });

  const readMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/handover/${docId}/read`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover', docId] });
      queryClient.invalidateQueries({ queryKey: ['handover'] });
      toast.success('확인 처리되었습니다');
    },
    onError: (e: Error) => toast.error(e.message || '처리에 실패했습니다'),
  });

  const headings = useMemo(() => extractHeadings(blocks), [blocks]);

  const scrollToHeading = (id: string) => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleViewer = (userId: string) => {
    setViewerIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto max-w-4xl">
        <Toaster position="top-center" richColors />
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          {(error as Error)?.message || '문서를 찾을 수 없습니다'}
        </div>
        <div className="mt-4 text-center">
          <Button variant="outline" render={<Link href="/handover" />}>
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8">
      <Toaster position="top-center" richColors />

      {/* 본문 */}
      <div className="min-w-0 flex-1">
        {/* 상단 바 */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/handover" />}>
            <ArrowLeft className="h-4 w-4" />
            목록
          </Button>

          {doc.canEdit && (
            <div className="flex items-center gap-2">
              {mode === 'view' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMode('edit')}
                  >
                    <Pencil className="h-4 w-4" />
                    편집
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('이 문서를 삭제할까요? 되돌릴 수 없습니다.'))
                        deleteMutation.mutate();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMode('view');
                      // 편집 취소 — 원본으로 복구
                      setTitle(doc.title);
                      setCategory(doc.category ?? '');
                      setIsPublished(doc.isPublished ?? false);
                      setViewerIds(
                        new Set((doc.viewers ?? []).map((v) => v.userId)),
                      );
                    }}
                  >
                    <X className="h-4 w-4" />
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    저장
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 편집 모드 메타 입력 */}
        {mode === 'edit' ? (
          <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  제목
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="문서 제목"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  카테고리 (선택)
                </label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: CS / 발주 / 정산"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span>공개 (체크 해제 시 임시저장 — 직원에게 보이지 않음)</span>
            </label>

            <div>
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                열람 권한 (직원 선택)
              </div>
              <div className="flex flex-wrap gap-2">
                {(users ?? [])
                  .filter((u) => u.role !== 'OWNER')
                  .map((u) => {
                    const checked = viewerIds.has(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleViewer(u.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:bg-muted'
                        }`}
                      >
                        {u.name}
                        <span className="ml-1 opacity-60">{u.role}</span>
                      </button>
                    );
                  })}
                {users &&
                  users.filter((u) => u.role !== 'OWNER').length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      부여할 직원 계정이 없습니다
                    </span>
                  )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <h1 className="text-3xl font-bold">{doc.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {doc.category && (
                <Badge variant="secondary">{doc.category}</Badge>
              )}
              {doc.canEdit &&
                (doc.isPublished ? (
                  <Badge variant="secondary">공개</Badge>
                ) : (
                  <Badge variant="outline">임시저장</Badge>
                ))}
              <span>
                {doc.createdByName} · 수정{' '}
                {new Date(doc.updatedAt).toLocaleString('ko-KR')}
              </span>
            </div>
          </div>
        )}

        {/* 에디터 / 뷰어 */}
        <div className="rounded-lg border border-border bg-background py-2">
          <HandoverEditor
            key={`${mode}-${doc.updatedAt}`}
            initialContent={doc.content}
            editable={mode === 'edit'}
            onChange={(b) => {
              contentRef.current = b;
              setBlocks(b);
            }}
          />
        </div>

        {/* 읽음 확인 (비OWNER) */}
        {!doc.canEdit && mode === 'view' && (
          <div className="mt-6 flex items-center justify-center">
            {doc.isRead ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                확인 완료
                {doc.readAt &&
                  ` · ${new Date(doc.readAt).toLocaleString('ko-KR')}`}
              </div>
            ) : (
              <Button
                onClick={() => readMutation.mutate()}
                disabled={readMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                확인했습니다
              </Button>
            )}
          </div>
        )}

        {/* 읽음 현황 (OWNER, 보기 모드) */}
        {doc.canEdit &&
          mode === 'view' &&
          readStatus &&
          readStatus.length > 0 && (
            <div className="mt-6 rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <Users className="h-4 w-4" />
                읽음 현황 ({readStatus.filter((r) => r.isRead).length}/
                {readStatus.length})
              </div>
              <div className="space-y-1">
                {readStatus.map((r) => (
                  <div
                    key={r.userId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {r.isRead ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      {r.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.isRead && r.readAt
                        ? new Date(r.readAt).toLocaleString('ko-KR')
                        : '미확인'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* 우측 목차(TOC) */}
      {headings.length > 0 && (
        <aside className="sticky top-6 hidden h-fit w-52 shrink-0 lg:block">
          <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <ListTree className="h-3.5 w-3.5" />
            목차
          </div>
          <nav className="space-y-1 border-l border-border">
            {headings.map((h) => (
              <button
                key={h.id}
                onClick={() => scrollToHeading(h.id)}
                className="block w-full truncate border-l-2 border-transparent py-0.5 pl-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                style={{ paddingLeft: `${(h.level - 1) * 12 + 12}px` }}
                title={h.text}
              >
                {h.text}
              </button>
            ))}
          </nav>
        </aside>
      )}
    </div>
  );
}
