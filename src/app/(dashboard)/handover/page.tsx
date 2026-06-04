'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Toaster, toast } from 'sonner';
import {
  BookOpen,
  Plus,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  Users,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type OwnerDoc = {
  id: string;
  title: string;
  category: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdByName: string;
  updatedAt: string;
  _count: { viewers: number; reads: number };
};

type ViewerDoc = {
  id: string;
  title: string;
  category: string | null;
  sortOrder: number;
  updatedAt: string;
  isRead: boolean;
};

type HandoverDoc = OwnerDoc | ViewerDoc;

const UNCATEGORIZED = '미분류';

function isOwnerDoc(doc: HandoverDoc): doc is OwnerDoc {
  return '_count' in doc;
}

export default function HandoverPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOwner = session?.user?.role === 'OWNER';

  const { data: docs, isLoading } = useQuery<HandoverDoc[]>({
    queryKey: ['handover'],
    queryFn: async () => {
      const res = await fetch('/api/handover');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '제목 없는 문서' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handover'] });
      router.push(`/handover/${data.id}?edit=1`);
    },
    onError: (e: Error) => toast.error(e.message || '문서 생성에 실패했습니다'),
  });

  // 카테고리별 그룹화
  const groups = useMemo(() => {
    const map = new Map<string, HandoverDoc[]>();
    (docs ?? []).forEach((doc) => {
      const key = doc.category?.trim() || UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    });
    return Array.from(map.entries()).sort((a, b) => {
      // 미분류는 항상 마지막
      if (a[0] === UNCATEGORIZED) return 1;
      if (b[0] === UNCATEGORIZED) return -1;
      return a[0].localeCompare(b[0], 'ko');
    });
  }, [docs]);

  return (
    <div className="mx-auto max-w-4xl">
      <Toaster position="top-center" richColors />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">인수인계</h1>
        </div>
        {isOwner && (
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4" />새 문서
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !docs || docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            {isOwner
              ? '아직 작성한 인수인계 문서가 없습니다. "새 문서"로 시작하세요.'
              : '열람 가능한 인수인계 문서가 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
                {category}
              </h2>
              <div className="overflow-hidden rounded-lg border border-border">
                {items.map((doc, idx) => (
                  <Link
                    key={doc.id}
                    href={`/handover/${doc.id}`}
                    className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted ${
                      idx > 0 ? 'border-t border-border' : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="truncate font-medium">{doc.title}</span>
                      {isOwner &&
                        isOwnerDoc(doc) &&
                        (doc.isPublished ? (
                          <Badge variant="secondary" className="gap-1">
                            <Eye className="h-3 w-3" />
                            공개
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <EyeOff className="h-3 w-3" />
                            임시저장
                          </Badge>
                        ))}
                    </div>

                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      {isOwner && isOwnerDoc(doc) ? (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {doc._count.reads}/{doc._count.viewers} 읽음
                        </span>
                      ) : (
                        !isOwner &&
                        !isOwnerDoc(doc) &&
                        (doc.isRead ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            읽음
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Circle className="h-3.5 w-3.5" />안 읽음
                          </span>
                        ))
                      )}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
