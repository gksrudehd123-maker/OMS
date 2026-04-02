'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const UploadZone = dynamic(
  () => import('@/components/sales/upload-zone').then((m) => m.UploadZone),
  { loading: () => <Skeleton className="h-40 w-full rounded-xl" /> },
);

const OrderTable = dynamic(
  () => import('@/components/sales/order-table').then((m) => m.OrderTable),
  { loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

const DailySalesTable = dynamic(
  () =>
    import('@/components/sales/daily-sales-table').then(
      (m) => m.DailySalesTable,
    ),
  { loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

const SyncHistory = dynamic(
  () => import('@/components/sales/sync-history').then((m) => m.SyncHistory),
  { loading: () => <Skeleton className="h-32 w-full rounded-xl" /> },
);

type Channel = {
  id: string;
  name: string;
  code: string;
};

type NewProduct = {
  id: string;
  name: string;
  optionInfo: string;
};

type PriceInput = {
  sellingPrice: string;
  costPrice: string;
  shippingCost: string;
  freeShippingMin: string;
  brand: string;
  brandCategory: string;
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

export default function SalesPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'excel' | 'api'>('api');

  // API 동기화 state
  const [syncing, setSyncing] = useState(false);
  const [syncFrom, setSyncFrom] = useState('');
  const [syncTo, setSyncTo] = useState('');
  const [syncChannelId, setSyncChannelId] = useState('');
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });


  // 신규 상품 가격 설정 팝업 (API 동기화용)
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [newProducts, setNewProducts] = useState<NewProduct[]>([]);
  const [priceInputs, setPriceInputs] = useState<Record<string, PriceInput>>(
    {},
  );
  const [savingPrices, setSavingPrices] = useState(false);

  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data) => {
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0].id);
        // API 동기화용 기본 채널 (첫 번째 스마트스토어)
        const firstSmartstore = data.find((ch: Channel) =>
          ch.code.startsWith('SMARTSTORE'),
        );
        if (firstSmartstore) setSyncChannelId(firstSmartstore.id);
      });

    // 기본 동기화 날짜: 어제 ~ 어제
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    setSyncTo(formatDate(yesterday));
    setSyncFrom(formatDate(yesterday));
  }, []);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const selectedChannelCode =
    channels.find((ch) => ch.id === selectedChannel)?.code || '';
  const isRocketGrowth =
    selectedChannelCode.toLowerCase() === 'coupang_rocket_growth';

  // 조회 기간 일수 계산
  const syncDays =
    syncFrom && syncTo
      ? Math.ceil(
          (new Date(syncTo).getTime() - new Date(syncFrom).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0;
  const isSyncRangeOver = syncDays > 7;

  const handleSync = async () => {
    if (!syncFrom || !syncTo) {
      toast.error('동기화 기간을 선택해주세요');
      return;
    }

    if (syncFrom > syncTo) {
      toast.error('시작일이 종료일보다 클 수 없습니다');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (syncTo >= today) {
      toast.error(
        '당일 데이터는 조회할 수 없습니다. 종료일을 어제 이전으로 설정해주세요.',
      );
      return;
    }

    if (isSyncRangeOver) {
      toast.error('조회 기간은 최대 7일까지 가능합니다');
      return;
    }

    setSyncing(true);
    setSyncProgress({ current: 0, total: syncDays });

    try {
      let totalSuccess = 0;
      let totalDuplicates = 0;
      let totalTotal = 0;
      let allNewProducts: NewProduct[] = [];

      // 하루씩 분할하여 순차 호출 + 진행률 표시
      const startDate = new Date(syncFrom);
      for (let i = 0; i < syncDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];

        setSyncProgress({ current: i + 1, total: syncDays });

        const from = `${dateStr}T00:00:00.000+09:00`;
        const to = `${dateStr}T23:59:59.999+09:00`;

        const res = await fetch('/api/sync/smartstore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to,
            channelId: syncChannelId || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(`${dateStr} 동기화 실패: ${data.error || '오류 발생'}`);
          continue;
        }

        totalTotal += data.summary?.total || 0;
        totalSuccess += data.summary?.success || 0;
        totalDuplicates += data.summary?.duplicates || 0;

        if (data.newProducts && data.newProducts.length > 0) {
          allNewProducts = [...allNewProducts, ...data.newProducts];
        }
      }

      if (totalTotal === 0) {
        toast.info('해당 기간에 주문이 없습니다');
      } else {
        toast.success(
          `${totalSuccess}건 동기화 완료 (중복: ${totalDuplicates}건, 신규상품: ${allNewProducts.length}건)`,
        );
        setRefreshKey((k) => k + 1);

        // 신규 상품이 있으면 가격 설정 팝업
        if (allNewProducts.length > 0) {
          setNewProducts(allNewProducts);
          const inputs: Record<string, PriceInput> = {};
          for (const p of allNewProducts) {
            inputs[p.id] = {
              sellingPrice: '',
              costPrice: '',
              shippingCost: '3000',
              freeShippingMin: '30000',
              brand: '',
              brandCategory: '',
            };
          }
          setPriceInputs(inputs);
          setShowPriceDialog(true);
        }
      }
    } catch {
      toast.error('동기화 중 오류가 발생했습니다');
    } finally {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };

  const updatePrice = (
    productId: string,
    field: keyof PriceInput,
    value: string,
  ) => {
    setPriceInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  const handleSavePrices = async () => {
    setSavingPrices(true);
    let savedCount = 0;

    try {
      for (const product of newProducts) {
        const input = priceInputs[product.id];
        if (!input) continue;

        if (input.sellingPrice || input.costPrice) {
          const res = await fetch(`/api/products/${product.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sellingPrice: input.sellingPrice
                ? parseFloat(input.sellingPrice)
                : null,
              costPrice: input.costPrice ? parseFloat(input.costPrice) : null,
              shippingCost: parseFloat(input.shippingCost) || 0,
              freeShippingMin: input.freeShippingMin
                ? parseFloat(input.freeShippingMin)
                : null,
            }),
          });
          if (res.ok) savedCount++;
        }

        // 브랜드 분류 저장
        if (input.brand && input.brandCategory) {
          await fetch('/api/products/brand', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              brand: input.brand,
              brandCategory: input.brandCategory,
            }),
          });
        }
      }

      if (savedCount > 0) {
        toast.success(`${savedCount}개 상품 가격이 설정되었습니다`);
        setRefreshKey((k) => k + 1);
      }
      setShowPriceDialog(false);
    } catch {
      toast.error('가격 저장 중 오류가 발생했습니다');
    } finally {
      setSavingPrices(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />
      <div>
        <h1 className="text-2xl font-semibold">매출 관리</h1>
        <p className="text-sm text-muted-foreground">
          엑셀 파일 업로드 또는 API 자동 동기화로 주문 데이터를 관리합니다
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        {!process.env.NEXT_PUBLIC_HIDE_API_SYNC && (
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'api'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            API 동기화
          </button>
        )}
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'excel'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          엑셀 업로드
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'api' && !process.env.NEXT_PUBLIC_HIDE_API_SYNC ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">스마트스토어 API 동기화</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            네이버 커머스 API로 주문 데이터를 자동으로 가져옵니다
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {channels.filter((ch) => ch.code.startsWith('SMARTSTORE')).length >
              1 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  스토어
                </label>
                <select
                  value={syncChannelId}
                  onChange={(e) => setSyncChannelId(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {channels
                    .filter((ch) => ch.code.startsWith('SMARTSTORE'))
                    .map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                시작일
              </label>
              <input
                type="date"
                value={syncFrom}
                onChange={(e) => setSyncFrom(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                종료일
              </label>
              <input
                type="date"
                value={syncTo}
                onChange={(e) => setSyncTo(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={syncing || isSyncRangeOver}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {syncing
                ? `동기화 중... (${syncProgress.current}/${syncProgress.total}일)`
                : 'API 동기화'}
            </button>
          </div>
          {isSyncRangeOver && (
            <p className="mt-2 text-sm text-red-500">
              조회 기간은 최대 7일까지 가능합니다. (현재 {syncDays}일 선택됨)
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-semibold">엑셀 업로드</h2>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {channels.length === 0 && (
                <option value="">채널을 먼저 등록해주세요</option>
              )}
              {channels
                .filter((ch) => ch.code.toLowerCase() !== 'coupang_rocket_delivery')
                .map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
          <UploadZone
            channelId={selectedChannel}
            channelCode={selectedChannelCode}
            onUploadComplete={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      )}

      {/* 최근 데이터 수집 이력 */}
      <SyncHistory refreshKey={refreshKey} />

      {/* 주문/판매 목록 */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {isRocketGrowth ? (
          <DailySalesTable
            channelId={selectedChannel}
            refreshKey={refreshKey}
          />
        ) : (
          <OrderTable channelId={selectedChannel} refreshKey={refreshKey} />
        )}
      </div>

      {/* 신규 상품 가격 설정 팝업 (API 동기화용) */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>신규 상품 가격 설정</DialogTitle>
            <p className="text-sm text-muted-foreground">
              새로 등록된 상품 {newProducts.length}개의 판매가/원가를
              설정해주세요. 나중에 상품 관리에서도 수정할 수 있습니다.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {newProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-lg border border-border p-4 space-y-3"
              >
                <div>
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  {product.optionInfo && (
                    <p className="text-xs text-muted-foreground truncate">
                      옵션: {product.optionInfo}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      판매가 (원)
                    </label>
                    <input
                      type="number"
                      value={priceInputs[product.id]?.sellingPrice || ''}
                      onChange={(e) =>
                        updatePrice(product.id, 'sellingPrice', e.target.value)
                      }
                      placeholder="0"
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      원가 (원)
                    </label>
                    <input
                      type="number"
                      value={priceInputs[product.id]?.costPrice || ''}
                      onChange={(e) =>
                        updatePrice(product.id, 'costPrice', e.target.value)
                      }
                      placeholder="0"
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      기본 배송비 (원)
                    </label>
                    <input
                      type="number"
                      value={priceInputs[product.id]?.shippingCost || ''}
                      onChange={(e) =>
                        updatePrice(product.id, 'shippingCost', e.target.value)
                      }
                      placeholder="3000"
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      무료배송 기준 (원)
                    </label>
                    <input
                      type="number"
                      value={priceInputs[product.id]?.freeShippingMin || ''}
                      onChange={(e) =>
                        updatePrice(
                          product.id,
                          'freeShippingMin',
                          e.target.value,
                        )
                      }
                      placeholder="비워두면 조건 없음"
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      브랜드
                    </label>
                    <select
                      value={priceInputs[product.id]?.brand || ''}
                      onChange={(e) => {
                        updatePrice(product.id, 'brand', e.target.value);
                        updatePrice(product.id, 'brandCategory', '');
                      }}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">선택 안함</option>
                      {BRANDS.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {priceInputs[product.id]?.brand && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        분류
                      </label>
                      <select
                        value={priceInputs[product.id]?.brandCategory || ''}
                        onChange={(e) =>
                          updatePrice(
                            product.id,
                            'brandCategory',
                            e.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">분류 선택</option>
                        {BRANDS.find(
                          (b) => b.name === priceInputs[product.id]?.brand,
                        )?.categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPriceDialog(false)}
                className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
              >
                나중에 설정
              </button>
              <button
                onClick={handleSavePrices}
                disabled={savingPrices}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {savingPrices ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
