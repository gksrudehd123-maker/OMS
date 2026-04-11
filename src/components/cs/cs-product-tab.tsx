'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  X,
  Package,
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import CSProductDetailDialog from './cs-product-detail-dialog';

type CSProductPart = {
  id: string;
  name: string;
  price: number | null;
  storeUrl: string | null;
  imageUrl: string | null;
  description: string | null;
};

type CSProductFAQ = {
  id: string;
  question: string;
  answer: string;
};

export type CSProductOption = {
  id: string;
  name: string;
  price: number | null;
  contents: string[];
};

export type CSProduct = {
  id: string;
  name: string;
  brand: string;
  price: number | null;
  imageUrl: string | null;
  storeUrl: string | null;
  description: string | null;
  parts: CSProductPart[];
  faqs: CSProductFAQ[];
  options: CSProductOption[];
};

const BRANDS = ['방짜', '웰스파', '카모도'] as const;

const BRAND_COLORS: Record<string, string> = {
  방짜: 'bg-orange-500 text-white',
  웰스파: 'bg-sky-500 text-white',
  카모도: 'bg-emerald-500 text-white',
};

const BRAND_INACTIVE =
  'text-muted-foreground hover:text-foreground hover:bg-background/50';

export default function CSProductTab() {
  const queryClient = useQueryClient();
  const [activeBrand, setActiveBrand] = useState<string>('방짜');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CSProduct | null>(null);
  const [detailProduct, setDetailProduct] = useState<CSProduct | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [fetchingImage, setFetchingImage] = useState(false);

  // 폼 상태
  const [form, setForm] = useState({
    name: '',
    brand: '방짜',
    price: '',
    imageUrl: '',
    storeUrl: '',
    description: '',
  });

  const { data: products = [], isLoading } = useQuery<CSProduct[]>({
    queryKey: ['cs-products', activeBrand, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeBrand) params.set('brand', activeBrand);
      if (search) params.set('search', search);
      const res = await fetch(`/api/cs-products?${params}`);
      const json = await res.json();
      return json.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingProduct
        ? `/api/cs-products/${editingProduct.id}`
        : '/api/cs-products';
      const res = await fetch(url, {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('저장 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-products'] });
      toast.success(
        editingProduct ? '상품이 수정되었습니다' : '상품이 추가되었습니다',
      );
      closeForm();
    },
    onError: () => toast.error('저장 중 오류가 발생했습니다'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cs-products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-products'] });
      toast.success('상품이 삭제되었습니다');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('삭제 중 오류가 발생했습니다'),
  });

  function openCreate() {
    setEditingProduct(null);
    setForm({
      name: '',
      brand: activeBrand,
      price: '',
      imageUrl: '',
      storeUrl: '',
      description: '',
    });
    setFormOpen(true);
  }

  function openEdit(product: CSProduct, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingProduct(product);
    setForm({
      name: product.name,
      brand: product.brand,
      price: product.price ? String(product.price) : '',
      imageUrl: product.imageUrl || '',
      storeUrl: product.storeUrl || '',
      description: product.description || '',
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingProduct(null);
  }

  async function fetchOgImage(url: string) {
    if (!url.trim()) return;
    setFetchingImage(true);
    try {
      const res = await fetch(`/api/og-image?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.data?.imageUrl) {
        setForm((prev) => ({ ...prev, imageUrl: json.data.imageUrl }));
      }
    } catch {
      // 실패해도 무시
    } finally {
      setFetchingImage(false);
    }
  }

  function handleSearch() {
    setSearch(searchInput);
  }

  const formatPrice = (price: number) => '₩' + price.toLocaleString('ko-KR');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-20 animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-lg border border-border bg-muted/50"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 브랜드 탭 + 검색 + 추가 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {BRANDS.map((brand) => (
            <button
              key={brand}
              onClick={() => {
                setActiveBrand(brand);
                setSearch('');
                setSearchInput('');
              }}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                activeBrand === brand ? BRAND_COLORS[brand] : BRAND_INACTIVE
              }`}
            >
              {brand}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value === '') setSearch('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="상품 검색..."
              className="w-44 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg border border-input bg-background p-2 hover:bg-muted"
            >
              <Search className="h-4 w-4" />
            </button>
            {search && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                }}
                className="rounded-lg border border-input bg-background p-2 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            상품 추가
          </button>
        </div>
      </div>

      {/* 상품 카드 목록 */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-muted-foreground">
          <Package className="mb-3 h-10 w-10" />
          <p className="text-sm">
            {search
              ? `"${search}" 검색 결과가 없습니다`
              : `${activeBrand} 브랜드에 등록된 상품이 없습니다`}
          </p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            첫 상품 추가하기
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => setDetailProduct(product)}
              className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30"
            >
              {/* 이미지 */}
              <div className="aspect-square overflow-hidden bg-muted">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="p-2">
                <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                  {product.name}
                </h3>
                {product.storeUrl && (
                  <a
                    href={product.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    스토어 바로가기
                  </a>
                )}
                {(() => {
                  const optionPrices = product.options
                    .map((o) => o.price)
                    .filter((p): p is number => p != null);
                  if (optionPrices.length > 0) {
                    const min = Math.min(...optionPrices);
                    return (
                      <p className="mt-1 text-base font-bold text-primary">
                        {formatPrice(min)}
                        <span className="text-xs font-medium">~</span>
                      </p>
                    );
                  }
                  if (product.price) {
                    return (
                      <p className="mt-1 text-base font-bold text-primary">
                        {formatPrice(product.price)}
                      </p>
                    );
                  }
                  return null;
                })()}

                {/* 수정/삭제 버튼 */}
                <div className="mt-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => openEdit(product, e)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="수정"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(product.id);
                    }}
                    className="rounded-md p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    title="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상품 추가/수정 다이얼로그 */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingProduct ? '상품 수정' : '새 상품 추가'}
              </h2>
              <button
                onClick={closeForm}
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  상품명 *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="예: 방짜배터리 KF-11 전동릴배터리"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  브랜드 *
                </label>
                <div className="flex gap-2">
                  {BRANDS.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, brand }))}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        form.brand === brand
                          ? BRAND_COLORS[brand]
                          : 'border border-input bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">판매가</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="예: 168000"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  스토어 링크
                </label>
                <input
                  type="text"
                  value={form.storeUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, storeUrl: e.target.value }))
                  }
                  placeholder="https://smartstore.naver.com/..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  상품 이미지
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-background px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-muted/50">
                  <Package className="h-5 w-5" />
                  {form.imageUrl ? '이미지 변경하기' : '클릭하여 이미지 선택'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setForm((prev) => ({
                          ...prev,
                          imageUrl: reader.result as string,
                        }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {form.imageUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={form.imageUrl}
                      alt="미리보기"
                      className="h-20 w-20 rounded-md border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, imageUrl: '' }))
                      }
                      className="text-xs text-red-500 hover:underline"
                    >
                      이미지 제거
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  제품 설명
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="스펙, 사용법, 주의사항 등"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeForm}
                  className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  취소
                </button>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.name.trim() || saveMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saveMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">상품 삭제</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              이 상품을 삭제하시겠습니까? 구성품과 FAQ도 함께 삭제됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                취소
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 팝업 */}
      {detailProduct && (
        <CSProductDetailDialog
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </div>
  );
}
