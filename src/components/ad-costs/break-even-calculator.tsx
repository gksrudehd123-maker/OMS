'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calculator, TrendingUp, Package, AlertCircle, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Channel = {
  id: string;
  name: string;
  code: string;
  feeRate: string | null;
};

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
  isActive: boolean;
};

type BreakEvenResult = {
  unitMargin: number;
  breakEvenQty: number;
  breakEvenSales: number;
  sellingPrice: number;
  costPrice: number;
  fee: number;
  shipping: number;
  isCalculable: boolean;
  reason?: string;
};

/**
 * 채널별 개당 순이익 계산
 * - 스마트스토어/쿠팡 윙: 판매가 - 원가 - 수수료 - 배송비
 * - 로켓그로스: VAT 포함 계산 (추후 확장)
 */
function calculateBreakEven(
  product: Product,
  channel: Channel,
  adCost: number,
): BreakEvenResult {
  const sellingPrice = Number(product.sellingPrice) || 0;
  const costPrice = Number(product.costPrice) || 0;
  const feeRate = Number(product.feeRate) || Number(channel.feeRate) || 0;
  const shippingCost = Number(product.shippingCost) || 0;

  if (!sellingPrice || !costPrice) {
    return {
      unitMargin: 0,
      breakEvenQty: 0,
      breakEvenSales: 0,
      sellingPrice,
      costPrice,
      fee: 0,
      shipping: shippingCost,
      isCalculable: false,
      reason: '판매가 또는 원가가 설정되지 않았습니다',
    };
  }

  const channelCode = channel.code?.toUpperCase() || '';

  // 로켓그로스는 별도 계산 로직 (추후 구현)
  if (channelCode.includes('ROCKETGROWTH') || channelCode.includes('RG')) {
    const couponDiscount = Number(product.couponDiscount) || 0;
    const fulfillmentFee = Number(product.fulfillmentFee) || 0;

    if (!feeRate || !fulfillmentFee) {
      return {
        unitMargin: 0,
        breakEvenQty: 0,
        breakEvenSales: 0,
        sellingPrice,
        costPrice,
        fee: 0,
        shipping: 0,
        isCalculable: false,
        reason: '수수료율 또는 입출고배송비가 설정되지 않았습니다',
      };
    }

    // 로켓그로스: VAT 포함 개당 마진 계산 (1개 기준)
    const discountCoupon = couponDiscount * 1;
    const fee = Math.round((sellingPrice - discountCoupon) * (feeRate / 100));
    const feeVat = Math.round(fee * 0.1);
    const settlementAmount = sellingPrice - fee - feeVat - discountCoupon;
    const shippingFee = 1 * fulfillmentFee;
    const shippingVat = Math.round(shippingFee * 0.1);
    const payoutAmount = settlementAmount - shippingFee - shippingVat;
    const costAmount = costPrice * 1;
    const netSales = sellingPrice - discountCoupon;
    const vat =
      netSales -
      netSales / 1.1 -
      (costAmount - costAmount / 1.1) -
      feeVat -
      shippingVat;
    const unitMargin = Math.round(payoutAmount - costAmount - vat);

    if (unitMargin <= 0) {
      return {
        unitMargin,
        breakEvenQty: 0,
        breakEvenSales: 0,
        sellingPrice,
        costPrice,
        fee,
        shipping: shippingFee,
        isCalculable: false,
        reason: `개당 순이익이 ${unitMargin.toLocaleString()}원으로 광고비 회수가 불가능합니다`,
      };
    }

    const breakEvenQty = Math.ceil(adCost / unitMargin);
    const breakEvenSales = breakEvenQty * sellingPrice;

    return {
      unitMargin,
      breakEvenQty,
      breakEvenSales,
      sellingPrice,
      costPrice,
      fee,
      shipping: shippingFee,
      isCalculable: true,
    };
  }

  // 스마트스토어 / 쿠팡 윙: 기본 마진 계산 (배송비 제외)
  const fee = Math.round(sellingPrice * (feeRate / 100));
  const unitMargin = sellingPrice - costPrice - fee;

  if (unitMargin <= 0) {
    return {
      unitMargin,
      breakEvenQty: 0,
      breakEvenSales: 0,
      sellingPrice,
      costPrice,
      fee,
      shipping: 0,
      isCalculable: false,
      reason: `개당 순이익이 ${unitMargin.toLocaleString()}원으로 광고비 회수가 불가능합니다`,
    };
  }

  const breakEvenQty = Math.ceil(adCost / unitMargin);
  const breakEvenSales = breakEvenQty * sellingPrice;

  return {
    unitMargin,
    breakEvenQty,
    breakEvenSales,
    sellingPrice,
    costPrice,
    fee,
    shipping: 0,
    isCalculable: true,
  };
}

export default function BreakEvenCalculator() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adCost, setAdCost] = useState('');

  // 채널 목록
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await fetch('/api/channels');
      return res.json();
    },
  });

  // 첫 채널(스마트스토어) 자동 선택
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const channel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId),
    [channels, selectedChannelId],
  );

  // 활성 상품 목록 (선택된 채널 기준)
  const { data: productsData, isLoading: productsLoading } = useQuery<{
    success: boolean;
    data: Product[];
    meta: { total: number };
  }>({
    queryKey: ['products-breakeven', selectedChannelId],
    queryFn: async () => {
      const params = new URLSearchParams({
        active: 'true',
        limit: '500',
        channelId: selectedChannelId,
      });
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    },
    enabled: !!selectedChannelId,
  });

  // 상품명 기준 중복 제거 (대표 상품만 표시)
  const products = useMemo(() => {
    const all = productsData?.data ?? [];
    const seen = new Map<string, Product>();
    for (const p of all) {
      if (!seen.has(p.name)) {
        seen.set(p.name, p);
      }
    }
    return Array.from(seen.values());
  }, [productsData]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );

  // 손익분기 계산
  const result = useMemo(() => {
    if (!selectedProduct || !channel || !adCost || Number(adCost) <= 0) return null;
    return calculateBreakEven(selectedProduct, channel, Number(adCost));
  }, [selectedProduct, channel, adCost]);

  // 광고 예산 추가
  const queryClient = useQueryClient();
  const addBudgetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ad-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          channelId: selectedChannelId,
          productId: selectedProductId,
          adCost,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '저장 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('광고 예산이 등록되었습니다');
      queryClient.invalidateQueries({ queryKey: ['ad-budgets'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">광고 손익분기 계산기</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        월 광고비 대비 최소 판매 수량을 계산합니다
      </p>

      {/* 입력 영역 */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        {/* 월 선택 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">월</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* 채널 선택 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">채널</label>
          <select
            value={selectedChannelId}
            onChange={(e) => {
              setSelectedChannelId(e.target.value);
              setSelectedProductId('');
            }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
        </div>

        {/* 상품 선택 */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">상품</label>
          {productsLoading ? (
            <Skeleton className="h-[38px] w-full rounded-lg" />
          ) : (
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">상품을 선택하세요</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 월 광고비 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            월 광고비 (원)
          </label>
          <input
            type="number"
            value={adCost}
            onChange={(e) => setAdCost(e.target.value)}
            placeholder="1,000,000"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-40"
          />
        </div>
      </div>

      {/* 결과 영역 */}
      {result && (
        <div className="mt-5">
          {result.isCalculable ? (
            <>
              {/* 결과 카드 */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">개당 순이익</p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    ₩{result.unitMargin.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
                  <p className="text-xs font-medium text-muted-foreground">손익분기 수량</p>
                  <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {result.breakEvenQty.toLocaleString()}개
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
                  <p className="text-xs font-medium text-muted-foreground">손익분기 매출</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₩{result.breakEvenSales.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 추가 버튼 */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => addBudgetMutation.mutate()}
                  disabled={addBudgetMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {addBudgetMutation.isPending ? '등록 중...' : '광고 손익분기에 추가'}
                </button>
              </div>

              {/* 계산 상세 */}
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  계산 상세
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">판매가</span>
                    <span>₩{result.sellingPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">원가</span>
                    <span>-₩{result.costPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">수수료</span>
                    <span>-₩{result.fee.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  계산 불가
                </p>
                <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
                  {result.reason}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 상품 미선택 안내 */}
      {!result && selectedProductId && adCost && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          상품 정보를 불러오는 중...
        </div>
      )}
    </div>
  );
}
