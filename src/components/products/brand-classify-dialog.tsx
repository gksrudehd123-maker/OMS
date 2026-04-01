'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tag, X, ChevronRight, Ban } from 'lucide-react';

type UnclassifiedProduct = {
  id: string;
  name: string;
  optionInfo: string;
  thumbnailUrl: string | null;
};

const BRANDS = [
  {
    name: '방짜',
    categories: [
      '배터리 KF-9',
      '배터리 KF-11',
      '배터리 KF-3.5',
      '배터리 AN-10500B',
      '배터리 AN-9000B',
      '기포기 KF',
    ],
  },
  {
    name: '웰스파',
    categories: ['대용량복대', '무릎찜질기', '차량용 전기정판'],
  },
  {
    name: '카모도',
    categories: ['마스크'],
  },
];

export function BrandClassifyDialog({
  onClose: onCloseProp,
}: {
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [classified, setClassified] = useState<Set<string>>(new Set());

  const { data: products, isLoading } = useQuery<UnclassifiedProduct[]>({
    queryKey: ['unclassified-products'],
    queryFn: async () => {
      const res = await fetch('/api/products/brand');
      const json = await res.json();
      return json.data;
    },
    staleTime: Infinity,
  });

  const onClose = () => {
    if (classified.size > 0) {
      queryClient.invalidateQueries({ queryKey: ['unclassified-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-monthly'] });
    }
    onCloseProp();
  };

  const mutation = useMutation({
    mutationFn: async (body: {
      productId: string;
      brand?: string;
      brandCategory?: string;
      brandNone?: boolean;
    }) => {
      const res = await fetch('/api/products/brand', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `저장 실패 (${res.status})`);
      }
      return res.json();
    },
  });

  const markDone = (productId: string) => {
    setClassified((prev) => new Set(prev).add(productId));
    setSelectedBrand(null);
  };

  const handleBrandNone = async () => {
    if (!current) return;
    await mutation.mutateAsync({ productId: current.id, brandNone: true });
    toast.success('해당사항 없음 처리 완료');
    markDone(current.id);
  };

  const handleSelectCategory = async (brand: string, category: string) => {
    if (!current) return;
    await mutation.mutateAsync({
      productId: current.id,
      brand,
      brandCategory: category,
    });
    toast.success(`${brand} > ${category} 분류 완료`);
    markDone(current.id);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
      </div>
    );
  }

  const list = (products || []).filter((p) => !classified.has(p.id));
  const current = list[0];

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
          <div className="text-center">
            <Tag className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-lg font-semibold">분류 완료!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {list.length === 0
                ? '미분류 상품이 없습니다.'
                : '모든 상품 분류가 완료되었습니다.'}
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const remaining = list.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">브랜드 분류</h2>
            <p className="text-xs text-muted-foreground">
              남은 상품: {remaining}개
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 상품 정보 */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            {current.thumbnailUrl ? (
              <img
                src={current.thumbnailUrl}
                alt={current.name}
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{current.name}</p>
              {current.optionInfo && (
                <p className="text-sm text-muted-foreground truncate">
                  {current.optionInfo}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 분류 선택 */}
        <div className="px-6 py-4">
          {!selectedBrand ? (
            // 브랜드 선택
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                브랜드를 선택하세요
              </p>
              {BRANDS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => setSelectedBrand(b.name)}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{b.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            // 카테고리 선택
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setSelectedBrand(null)}
                  className="text-sm text-primary hover:underline"
                >
                  ← 브랜드 다시 선택
                </button>
                <span className="text-sm font-medium text-muted-foreground">
                  / {selectedBrand}
                </span>
              </div>
              {BRANDS.find((b) => b.name === selectedBrand)?.categories.map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSelectCategory(selectedBrand, cat)}
                    disabled={mutation.isPending}
                    className="flex w-full items-center rounded-lg border border-border px-4 py-3 text-left hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <span>{cat}</span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        {/* 해당사항 없음 */}
        <div className="border-t border-border px-6 py-4">
          <button
            onClick={handleBrandNone}
            disabled={mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Ban className="h-4 w-4" />
            해당사항 없음
          </button>
        </div>
      </div>
    </div>
  );
}
