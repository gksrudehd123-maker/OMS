'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Package } from 'lucide-react';
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
  };
  newProducts: NewProduct[];
  isRocketGrowth?: boolean;
};

type PriceInput = {
  sellingPrice: string;
  costPrice: string;
  shippingCost: string;
  freeShippingMin: string;
};

type RGPriceInput = {
  costPrice: string;
  feeRate: string;
  fulfillmentFee: string;
  couponDiscount: string;
};

export function UploadZone({
  channelId,
  channelCode,
  salesDate,
  onUploadComplete,
}: {
  channelId: string;
  channelCode?: string;
  salesDate?: string;
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

  const isRocketGrowth =
    channelCode?.toLowerCase() === 'coupang_rocket_growth';

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
                costPrice: '',
                feeRate: '',
                fulfillmentFee: '',
                couponDiscount: '0',
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
    [channelId, salesDate, onUploadComplete],
  );

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

          if (input.costPrice || input.feeRate || input.fulfillmentFee) {
            const res = await fetch(`/api/products/${product.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                costPrice: input.costPrice
                  ? parseFloat(input.costPrice)
                  : null,
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
        }
      }

      if (savedCount > 0) {
        toast.success(`${savedCount}개 상품 가격이 설정되었습니다`);
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
          </div>
        </div>
      )}

      {/* 신규 상품 가격 설정 팝업 */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>신규 상품 가격 설정</DialogTitle>
            <p className="text-sm text-muted-foreground">
              새로 등록된 상품 {newProducts.length}개의{' '}
              {isRGUpload ? '원가/수수료' : '판매가/원가'}를 설정해주세요.
              나중에 상품 관리에서도 수정할 수 있습니다.
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

                {isRGUpload ? (
                  /* RG 전용 필드 */
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  </div>
                )}
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
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
