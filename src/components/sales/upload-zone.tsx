'use client';

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Package,
  CalendarCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type NewProduct = {
  id: string;
  name: string;
  optionInfo: string;
  sellingPrice?: string | null;
  costPrice?: string | null;
  shippingCost?: string;
  freeShippingMin?: string | null;
  feeRate?: string | null;
  fulfillmentFee?: string | null;
  couponDiscount?: string | null;
};

type UploadResult = {
  summary: {
    total: number;
    success: number;
    errors: number;
    duplicates: number;
    skippedToday?: number;
  };
  newProducts: NewProduct[];
  isRocketGrowth?: boolean;
};

type PriceInput = {
  sellingPrice: string;
  costPrice: string;
  shippingCost: string;
  freeShippingMin: string;
  brand: string;
  brandCategory: string;
};

type RGPriceInput = {
  sellingPrice: string;
  costPrice: string;
  feeRate: string;
  fulfillmentFee: string;
  couponDiscount: string;
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

// 파일명에서 날짜 추출: Statistics-YYYYMMDD~YYYYMMDD_(n).xlsx
function extractDateFromFilename(filename: string): { from: string; to: string } | null {
  const match = filename.match(/(\d{4})(\d{2})(\d{2})~(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const from = `${match[1]}-${match[2]}-${match[3]}`;
  const to = `${match[4]}-${match[5]}-${match[6]}`;
  return { from, to };
}

export function UploadZone({
  channelId,
  channelCode,
  onUploadComplete,
}: {
  channelId: string;
  channelCode?: string;
  onUploadComplete: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  // 신규 상품 가격 설정 팝업
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [newProducts, setNewProducts] = useState<NewProduct[]>([]);
  const [priceInputs, setPriceInputs] = useState<Record<string, PriceInput>>(
    {},
  );
  const [rgPriceInputs, setRGPriceInputs] = useState<
    Record<string, RGPriceInput>
  >({});
  const [isRGUpload, setIsRGUpload] = useState(false);
  const [saving, setSaving] = useState(false);

  // 로켓그로스 날짜 확인 팝업
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [extractedDate, setExtractedDate] = useState<{ from: string; to: string } | null>(null);
  const pendingFileRef = useRef<File | null>(null);

  const isRocketGrowth = channelCode?.toLowerCase() === 'coupang_rocket_growth';

  const doUpload = useCallback(
    async (file: File, salesDate?: string) => {
      setUploading(true);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('channelId', channelId);
        if (salesDate) {
          formData.append('salesDate', salesDate);
        }

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '업로드 실패');
        }

        const data: UploadResult = await res.json();
        setResult(data);
        toast.success(`${data.summary.success}건 업로드 완료`);
        onUploadComplete();

        // 신규 상품이 있으면 가격 설정 팝업 표시
        if (data.newProducts && data.newProducts.length > 0) {
          setNewProducts(data.newProducts);
          const isRG = !!data.isRocketGrowth;
          setIsRGUpload(isRG);

          if (isRG) {
            const inputs: Record<string, RGPriceInput> = {};
            for (const p of data.newProducts) {
              inputs[p.id] = {
                sellingPrice: p.sellingPrice ? String(p.sellingPrice) : '',
                costPrice: '',
                feeRate: '',
                fulfillmentFee: '',
                couponDiscount: '0',
                brand: '',
                brandCategory: '',
              };
            }
            setRGPriceInputs(inputs);
          } else {
            const inputs: Record<string, PriceInput> = {};
            for (const p of data.newProducts) {
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
          }
          setShowPriceDialog(true);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '업로드 중 오류 발생');
      } finally {
        setUploading(false);
      }
    },
    [channelId, onUploadComplete],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.name.endsWith('.xlsx')) {
        toast.error('xlsx 파일만 업로드 가능합니다');
        return;
      }

      if (isRocketGrowth) {
        const dates = extractDateFromFilename(file.name);
        if (!dates) {
          toast.error('파일명에서 날짜를 추출할 수 없습니다. (예: Statistics-20260301~20260301.xlsx)');
          return;
        }
        pendingFileRef.current = file;
        setExtractedDate(dates);
        setShowDateConfirm(true);
        return;
      }

      doUpload(file);
    },
    [isRocketGrowth, doUpload],
  );

  const handleDateConfirm = () => {
    if (!pendingFileRef.current || !extractedDate) return;
    setShowDateConfirm(false);
    doUpload(pendingFileRef.current, extractedDate.from);
    pendingFileRef.current = null;
  };

  const handleDateCancel = () => {
    setShowDateConfirm(false);
    pendingFileRef.current = null;
    setExtractedDate(null);
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

  const updateRGPrice = (
    productId: string,
    field: keyof RGPriceInput,
    value: string,
  ) => {
    setRGPriceInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  const handleSavePrices = async () => {
    setSaving(true);
    let savedCount = 0;

    try {
      for (const product of newProducts) {
        if (isRGUpload) {
          const input = rgPriceInputs[product.id];
          if (!input) continue;

          if (input.sellingPrice || input.costPrice || input.feeRate || input.fulfillmentFee) {
            const res = await fetch(`/api/products/${product.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sellingPrice: input.sellingPrice ? parseFloat(input.sellingPrice) : null,
                costPrice: input.costPrice ? parseFloat(input.costPrice) : null,
                feeRate: input.feeRate ? parseFloat(input.feeRate) : null,
                fulfillmentFee: input.fulfillmentFee
                  ? parseFloat(input.fulfillmentFee)
                  : null,
                couponDiscount: input.couponDiscount
                  ? parseFloat(input.couponDiscount)
                  : null,
              }),
            });
            if (res.ok) savedCount++;
          }

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
        } else {
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
      }

      if (savedCount > 0) {
        toast.success(`${savedCount}개 상품 가격이 설정되었습니다`);
        onUploadComplete();
      }
      setShowPriceDialog(false);
    } catch {
      toast.error('가격 저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 sm:p-8 transition-colors ${
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
              {isRocketGrowth
                ? '쿠팡 로켓그로스 판매통계 .xlsx 파일'
                : '스마트스토어 주문조회 .xlsx 파일'}
            </p>
          </>
        )}
      </div>

      {result && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-medium">업로드 결과</h4>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
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
                중복 {result.summary.duplicates}건
                {result.summary.errors - result.summary.duplicates > 0 &&
                  ` / 실패 ${result.summary.errors - result.summary.duplicates}건`}
              </span>
            </div>
            {result.newProducts && result.newProducts.length > 0 && (
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400">
                  신규상품 {result.newProducts.length}건
                </span>
              </div>
            )}
            {result.summary.skippedToday && result.summary.skippedToday > 0 ? (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">
                  당일 주문 {result.summary.skippedToday}건 제외
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 로켓그로스 날짜 확인 팝업 */}
      <Dialog open={showDateConfirm} onOpenChange={(open) => { if (!open) handleDateCancel(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              판매 날짜 확인
            </DialogTitle>
          </DialogHeader>
          {extractedDate && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                파일명에서 추출한 판매 날짜가 맞는지 확인해주세요.
              </p>
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                <p className="text-lg font-bold font-mono">
                  {extractedDate.from === extractedDate.to
                    ? extractedDate.from
                    : `${extractedDate.from} ~ ${extractedDate.to}`}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleDateCancel}
                  className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
                >
                  취소
                </button>
                <button
                  onClick={handleDateConfirm}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                >
                  확인, 업로드
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 신규 상품 가격 설정 팝업 */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent
          className="sm:max-w-[720px] flex flex-col max-h-[80vh]"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>신규 상품 가격 설정</DialogTitle>
            <p className="text-sm text-muted-foreground">
              새로 등록된 상품 {newProducts.length}개의{' '}
              {isRGUpload ? '원가/수수료' : '판매가/원가'}를 설정해주세요.
              나중에 상품 관리에서도 수정할 수 있습니다.
            </p>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
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

                {isRGUpload ? (
                  /* RG 전용 필드 */
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        판매가 (원)
                        {rgPriceInputs[product.id]?.sellingPrice && (
                          <span className="ml-1 text-emerald-500">자동</span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={rgPriceInputs[product.id]?.sellingPrice || ''}
                        onChange={(e) =>
                          updateRGPrice(product.id, 'sellingPrice', e.target.value)
                        }
                        placeholder="판매수량 0이면 직접 입력"
                        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        원가 (원)
                      </label>
                      <input
                        type="number"
                        value={rgPriceInputs[product.id]?.costPrice || ''}
                        onChange={(e) =>
                          updateRGPrice(product.id, 'costPrice', e.target.value)
                        }
                        placeholder="0"
                        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        판매수수료율 (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={rgPriceInputs[product.id]?.feeRate || ''}
                        onChange={(e) =>
                          updateRGPrice(product.id, 'feeRate', e.target.value)
                        }
                        placeholder="10.8"
                        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        입출고배송비 (원/개)
                      </label>
                      <input
                        type="number"
                        value={rgPriceInputs[product.id]?.fulfillmentFee || ''}
                        onChange={(e) =>
                          updateRGPrice(
                            product.id,
                            'fulfillmentFee',
                            e.target.value,
                          )
                        }
                        placeholder="0"
                        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        판매자할인쿠폰 (원/개)
                      </label>
                      <input
                        type="number"
                        value={rgPriceInputs[product.id]?.couponDiscount || ''}
                        onChange={(e) =>
                          updateRGPrice(
                            product.id,
                            'couponDiscount',
                            e.target.value,
                          )
                        }
                        placeholder="0"
                        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        브랜드
                      </label>
                      <select
                        value={rgPriceInputs[product.id]?.brand || ''}
                        onChange={(e) => {
                          updateRGPrice(product.id, 'brand', e.target.value);
                          updateRGPrice(product.id, 'brandCategory', '');
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
                    {rgPriceInputs[product.id]?.brand && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          분류
                        </label>
                        <select
                          value={rgPriceInputs[product.id]?.brandCategory || ''}
                          onChange={(e) =>
                            updateRGPrice(
                              product.id,
                              'brandCategory',
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">분류 선택</option>
                          {BRANDS.find(
                            (b) => b.name === rgPriceInputs[product.id]?.brand,
                          )?.categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 기존 필드 (스마트스토어/쿠팡 윙) */
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        판매가 (원)
                      </label>
                      <input
                        type="number"
                        value={priceInputs[product.id]?.sellingPrice || ''}
                        onChange={(e) =>
                          updatePrice(
                            product.id,
                            'sellingPrice',
                            e.target.value,
                          )
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
                          updatePrice(
                            product.id,
                            'shippingCost',
                            e.target.value,
                          )
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
                )}
              </div>
            ))}

          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4 shrink-0">
            <button
              onClick={() => setShowPriceDialog(false)}
              className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
            >
              나중에 설정
            </button>
            <button
              onClick={handleSavePrices}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
