'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';

type Product = {
  id: string;
  name: string;
  optionInfo: string;
  costPrice: string | null;
  sellingPrice: string | null;
  feeRate: string | null;
  shippingCost: string;
  freeShippingMin: string | null;
  couponDiscount: string | null;
  fulfillmentFee: string | null;
  memo: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { orders: number; dailySales: number };
};

type Channel = {
  id: string;
  name: string;
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [channelId, setChannelId] = useState('');
  const limit = 20;

  // 편집 다이얼로그
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editFeeRate, setEditFeeRate] = useState('');
  const [editShippingCost, setEditShippingCost] = useState('');
  const [editFreeShippingMin, setEditFreeShippingMin] = useState('');
  const [editCouponDiscount, setEditCouponDiscount] = useState('');
  const [editFulfillmentFee, setEditFulfillmentFee] = useState('');
  const [editMemo, setEditMemo] = useState('');

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await fetch('/api/channels');
      return res.json();
    },
  });

  const { data: productsData, isLoading: loading } = useQuery<{ products: Product[]; total: number }>({
    queryKey: ['products', page, search, channelId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(channelId && { channelId }),
      });
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    },
  });

  const products = productsData?.products ?? [];
  const total = productsData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const productMutation = useMutation({
    mutationFn: async ({ id, method, body }: { id: string; method: string; body?: Record<string, unknown> }) => {
      const res = await fetch(`/api/products/${id}`, {
        method,
        ...(body && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      });
      if (!res.ok) throw new Error('요청 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => {
      toast.error('처리 중 오류가 발생했습니다');
    },
  });

  const saving = productMutation.isPending;

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setEditSellingPrice(product.sellingPrice ? String(product.sellingPrice) : '');
    setEditCostPrice(product.costPrice ? String(product.costPrice) : '');
    setEditFeeRate(product.feeRate ? String(product.feeRate) : '');
    setEditShippingCost(String(product.shippingCost));
    setEditFreeShippingMin(product.freeShippingMin ? String(product.freeShippingMin) : '');
    setEditCouponDiscount(product.couponDiscount ? String(product.couponDiscount) : '');
    setEditFulfillmentFee(product.fulfillmentFee ? String(product.fulfillmentFee) : '');
    setEditMemo(product.memo || '');
  };

  // RG 상품 여부 (DailySales 데이터가 있는 상품)
  const isRGProduct = editProduct && editProduct._count.dailySales > 0;

  const handleSave = () => {
    if (!editProduct) return;
    productMutation.mutate(
      {
        id: editProduct.id,
        method: 'PATCH',
        body: {
          sellingPrice: editSellingPrice ? parseFloat(editSellingPrice) : null,
          costPrice: editCostPrice ? parseFloat(editCostPrice) : null,
          feeRate: editFeeRate ? parseFloat(editFeeRate) : null,
          shippingCost: parseFloat(editShippingCost) || 0,
          freeShippingMin: editFreeShippingMin ? parseFloat(editFreeShippingMin) : null,
          couponDiscount: editCouponDiscount ? parseFloat(editCouponDiscount) : null,
          fulfillmentFee: editFulfillmentFee ? parseFloat(editFulfillmentFee) : null,
          memo: editMemo || null,
        },
      },
      {
        onSuccess: () => {
          toast.success('상품 정보가 저장되었습니다');
          setEditProduct(null);
        },
      },
    );
  };

  const handleDeactivate = () => {
    if (!editProduct) return;
    if (!confirm(`"${editProduct.name}" 상품을 비활성화하시겠습니까?`)) return;
    productMutation.mutate(
      { id: editProduct.id, method: 'DELETE' },
      {
        onSuccess: () => {
          toast.success('상품이 비활성화되었습니다');
          setEditProduct(null);
        },
      },
    );
  };

  const handleActivate = () => {
    if (!editProduct) return;
    productMutation.mutate(
      { id: editProduct.id, method: 'PATCH', body: { isActive: true } },
      {
        onSuccess: () => {
          toast.success('상품이 활성화되었습니다');
          setEditProduct(null);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <ProgressBar loading={loading} />
      <div>
        <h1 className="text-2xl font-semibold">상품 관리</h1>
        <p className="text-sm text-muted-foreground">
          엑셀 업로드 시 자동 등록된 상품 목록입니다. 행을 클릭하여
          판매가/원가를 설정하세요.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              총 {total}개 상품
            </span>
            <select
              value={channelId}
              onChange={(e) => {
                setChannelId(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">전체 채널</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="상품명, 옵션 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품명</TableHead>
                <TableHead>옵션정보</TableHead>
                <TableHead className="text-right">판매가</TableHead>
                <TableHead className="text-right">원가</TableHead>
                <TableHead className="text-center">주문수</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    등록된 상품이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEdit(product)}
                  >
                    <TableCell className="max-w-[250px] truncate font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {product.optionInfo || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.sellingPrice
                        ? `₩${Number(product.sellingPrice).toLocaleString()}`
                        : <span className="text-orange-500">미설정</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.costPrice
                        ? `₩${Number(product.costPrice).toLocaleString()}`
                        : <span className="text-orange-500">미설정</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {product._count.orders + product._count.dailySales}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {product.isActive ? '활성' : '비활성'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 상품 편집 다이얼로그 */}
      <Dialog
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>상품 정보 수정</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-4">
              {/* 상품 기본 정보 (읽기 전용) */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium">{editProduct.name}</p>
                {editProduct.optionInfo && (
                  <p className="text-xs text-muted-foreground">
                    옵션: {editProduct.optionInfo}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  주문수: {editProduct._count.orders + editProduct._count.dailySales}건
                </p>
              </div>

              {/* 판매가 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">판매가 (원)</label>
                <input
                  type="number"
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(e.target.value)}
                  placeholder="판매가를 입력하세요"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* 원가 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">원가 (원)</label>
                <input
                  type="number"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(e.target.value)}
                  placeholder="원가를 입력하세요"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* 개별 수수료 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  개별 수수료율 (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editFeeRate}
                  onChange={(e) => setEditFeeRate(e.target.value)}
                  placeholder="비워두면 채널 기본 수수료 적용"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  쿠팡 카테고리별 수수료 등 채널 기본 수수료와 다를 때 입력
                </p>
              </div>

              {/* 배송비 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">기본 배송비 (원)</label>
                  <input
                    type="number"
                    value={editShippingCost}
                    onChange={(e) => setEditShippingCost(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">무료배송 기준 (원)</label>
                  <input
                    type="number"
                    value={editFreeShippingMin}
                    onChange={(e) => setEditFreeShippingMin(e.target.value)}
                    placeholder="비워두면 조건 없음"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* 로켓그로스 전용 필드 */}
              {isRGProduct && (
                <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                    로켓그로스 전용
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">입출고배송비 (원/개)</label>
                      <input
                        type="number"
                        value={editFulfillmentFee}
                        onChange={(e) => setEditFulfillmentFee(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">판매자할인쿠폰 (원/개)</label>
                      <input
                        type="number"
                        value={editCouponDiscount}
                        onChange={(e) => setEditCouponDiscount(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 마진 미리보기 */}
              {editSellingPrice && editCostPrice && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    예상 마진
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">
                      ₩
                      {(
                        parseFloat(editSellingPrice) -
                        parseFloat(editCostPrice)
                      ).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {(
                        ((parseFloat(editSellingPrice) -
                          parseFloat(editCostPrice)) /
                          parseFloat(editSellingPrice)) *
                        100
                      ).toFixed(1)}
                      %)
                    </span>
                  </div>
                </div>
              )}

              {/* 메모 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">메모</label>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  placeholder="메모를 입력하세요 (선택)"
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* 버튼 */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {editProduct.isActive ? (
                    <button
                      onClick={handleDeactivate}
                      disabled={saving}
                      className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50"
                    >
                      비활성화
                    </button>
                  ) : (
                    <button
                      onClick={handleActivate}
                      disabled={saving}
                      className="rounded-lg px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950 disabled:opacity-50"
                    >
                      활성화
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditProduct(null)}
                    className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
